// Notifications push quand l'appli est complètement fermée (mode Réalité seulement : dans les autres modes,
// le temps du jeu s'arrête quand l'appli est fermée). L'appli Android s'inscrit auprès de Firebase, puis confie
// au serveur Cloudflare les prix à surveiller (ordres en attente, liquidations) quand elle passe en arrière-plan.
// Le serveur ne fait que prévenir : tout est rejoué et exécuté par le jeu à la réouverture.
import { natif } from './notifs.js';
import { descriptionOrdre } from './orders.js';
import { contrat } from './futures.js';

const CLE = 'simcrypto.push.jeton';
let config = null;
const P = () => natif('PushNotifications');

export async function adresse() {
  if (config) return config.url || null;
  try { const r = await fetch('./data/push.json', { cache: 'no-store' }); config = r.ok ? await r.json() : {}; } catch (e) { config = {}; }
  return config.url || null;
}
export function pushDisponible() { return !!P(); }
export function jeton() { try { return localStorage.getItem(CLE); } catch (e) { return null; } }

/** Inscription auprès de Firebase (à chaque démarrage : le jeton peut changer). Renvoie le jeton ou null. */
export async function inscrire() {
  const p = P();
  if (!p || !(await adresse())) return null;
  try {
    const perm = await p.requestPermissions();
    if (perm.receive !== 'granted') return null;
    return await new Promise(res => {
      const fini = v => { res(v); };
      p.addListener('registration', t => { try { localStorage.setItem(CLE, t.value); } catch (e) {} fini(t.value); });
      p.addListener('registrationError', () => fini(null));
      p.register();
      setTimeout(() => fini(jeton()), 20000);
    });
  } catch (e) { return null; }
}

const nb = x => x.toLocaleString('fr-FR', { maximumFractionDigits: x < 10 ? 4 : 2 });

/** Prix à surveiller pour une partie : ordres en attente et positions à effet de levier. Fonction pure (testée). */
export function alertesDe(partie) {
  const out = [];
  for (const o of (partie.plateforme && partie.plateforme.ordres) || []) {
    const achat = o.sens === 'achat', d = descriptionOrdre(o, nb, nb), groupe = 'o' + (o.id ?? o.creeLe);
    const texte = `Ton ordre « ${d} » a pu s'exécuter. Ouvre le jeu pour voir.`;
    if (o.type === 'limite' || (o.type === 'oco' && !o.declenche)) out.push({ id: groupe + 'l', groupe, s: o.s, sens: achat ? 'bas' : 'haut', prix: o.prix, texte });
    if ((o.type === 'stop' || o.type === 'oco') && !o.declenche) out.push({ id: groupe + 's', groupe, s: o.s, sens: achat ? 'haut' : 'bas', prix: o.stop, texte: `Le stop de ton ordre « ${d} » est atteint.` });
    if ((o.type === 'stop' || o.type === 'oco') && o.declenche) out.push({ id: groupe + 'd', groupe, s: o.s, sens: achat ? 'bas' : 'haut', prix: o.limiteStop, texte });
  }
  for (const pos of (partie.futures && partie.futures.positions) || []) {
    const c = contrat(pos.s), base = c ? c.base : pos.s, long = pos.sens === 'long';
    const g = 'p' + pos.id;
    out.push({ id: g + 'l', groupe: g, s: pos.s, sens: long ? 'bas' : 'haut', prix: pos.liquidation, texte: `Ta position ${pos.sens} ×${pos.levier} sur ${base} a sans doute été liquidée (${nb(pos.liquidation)} USDT).` });
    const alerte = pos.entree + 0.8 * (pos.liquidation - pos.entree);
    out.push({ id: g + 'a', groupe: g + 'a', s: pos.s, sens: long ? 'bas' : 'haut', prix: alerte, texte: `Danger : ta position ${pos.sens} ×${pos.levier} sur ${base} a perdu 80 % de sa marge. Liquidation à ${nb(pos.liquidation)} USDT.` });
  }
  return out.filter(a => a.s && a.prix > 0).slice(0, 60);
}

async function poster(chemin, corps) {
  const url = await adresse();
  if (!url) return { erreur: 'Serveur de notifications pas encore installé.' };
  try {
    const r = await fetch(url.replace(/\/$/, '') + chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps), keepalive: true });
    const d = await r.json().catch(() => ({}));
    return r.ok ? d : { erreur: d.erreur || 'Erreur ' + r.status };
  } catch (e) { return { erreur: 'Serveur injoignable.' }; }
}

/** Confie les alertes au serveur (appli en arrière-plan) ou les retire (alertes vides). */
export async function synchroniser(alertes, decalage) {
  const t = jeton();
  if (!t || !P()) return null;
  return poster('/alertes', { token: t, decalage: Math.max(0, Math.round(decalage)), alertes });
}
export async function tester() {
  const t = jeton() || await inscrire();
  if (!t) return { erreur: "Inscription aux notifications impossible (autorisation refusée, ou appli à réinstaller)." };
  return poster('/test', { token: t });
}
