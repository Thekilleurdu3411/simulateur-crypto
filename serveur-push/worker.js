// Serveur de notifications de Proof of Life (Cloudflare Worker, offre gratuite).
// L'appli lui confie, quand elle passe en arrière-plan en mode Réalité, la liste des prix à surveiller
// (ordres en attente, liquidations). Chaque minute, il regarde les vraies bougies et envoie une
// notification par Firebase (FCM) quand un seuil est franchi. Rien n'est exécuté ici : le jeu rejoue
// tout à la réouverture, la notification sert juste à prévenir.
//
// Stockage : une seule clé KV « abonnes » (peu d'écritures, pour rester dans l'offre gratuite).
// Secret : FIREBASE_SA (clé privée du compte de service Firebase, au format JSON).

import { CLE, MAX_APPAREILS, lire, nettoyer, envoyer, verifier } from './logique.js';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    if (req.method === 'GET') return json({ ok: true, service: 'Proof of Life — notifications' });
    let corps;
    try { corps = await req.json(); } catch (e) { return json({ erreur: 'JSON invalide' }, 400); }
    if (!corps || typeof corps.token !== 'string' || corps.token.length < 20 || corps.token.length > 400) return json({ erreur: 'Jeton invalide' }, 400);
    if (url.pathname === '/alertes') {
      const abonnes = await lire(env);
      const alertes = nettoyer(corps.alertes);
      if (!alertes.length) delete abonnes[corps.token];
      else {
        abonnes[corps.token] = { alertes, decalage: Math.max(0, Number(corps.decalage) || 0), maj: Date.now() };
        // Au-delà de la limite, on oublie les plus anciens
        const cles = Object.keys(abonnes).sort((a, b) => abonnes[b].maj - abonnes[a].maj);
        for (const k of cles.slice(MAX_APPAREILS)) delete abonnes[k];
      }
      await env.ABONNES.put(CLE, JSON.stringify(abonnes));
      return json({ ok: true, alertes: alertes.length });
    }
    if (url.pathname === '/test') {
      const r = await envoyer(env, corps.token, 'Les notifications de Proof of Life fonctionnent ✅');
      return json(r.ok ? { ok: true } : { erreur: r.erreur }, r.ok ? 200 : 502);
    }
    return json({ erreur: 'Inconnu' }, 404);
  },

  async scheduled(evt, env, ctx) { ctx.waitUntil(verifier(env)); }
};

