// Logique du serveur de notifications (testée avec node, sans Cloudflare).
export const CLE = 'abonnes';
export const MAX_APPAREILS = 10;
const MAX_ALERTES = 60, FENETRE = 3 * 60000;

export async function lire(env) {
  try { return JSON.parse(await env.ABONNES.get(CLE)) || {}; } catch (e) { return {}; }
}

/** Ne garde que des alertes bien formées. */
export function nettoyer(liste) {
  if (!Array.isArray(liste)) return [];
  return liste.slice(0, MAX_ALERTES).filter(a => a && /^[A-Z0-9]{5,15}$/.test(a.s) && (a.sens === 'bas' || a.sens === 'haut') && Number(a.prix) > 0 && typeof a.texte === 'string')
    .map(a => ({ id: String(a.id || '').slice(0, 40), groupe: String(a.groupe || a.id || '').slice(0, 40), s: a.s, sens: a.sens, prix: Number(a.prix), texte: a.texte.slice(0, 200) }));
}

/** Plus haut et plus bas d'un symbole sur [debut, fin] (temps du jeu), bougies d'une minute. */
export async function extremes(s, debut, fin, f = fetch) {
  const q = `?symbol=${s}&interval=1m&startTime=${debut}&endTime=${fin}&limit=1000`;
  for (const base of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    try {
      const r = await f(base + '/api/v3/klines' + q);
      if (!r.ok) continue;
      const b = await r.json();
      if (!Array.isArray(b) || !b.length) continue;
      return { haut: Math.max(...b.map(x => +x[2])), bas: Math.min(...b.map(x => +x[3])) };
    } catch (e) { /* source suivante */ }
  }
  // Secours (temps réel seulement) : Kraken
  if (Date.now() - fin < 10 * 60000) {
    try {
      const m = s.match(/^(.+?)(EUR|USDT|USDC)$/);
      if (m) {
        const paire = (m[1] === 'BTC' ? 'XBT' : m[1]) + m[2];
        const r = await f(`https://api.kraken.com/0/public/OHLC?pair=${paire}&interval=1&since=${Math.floor(debut / 1000)}`);
        const d = await r.json();
        const k = d.result && Object.keys(d.result).find(x => x !== 'last');
        const b = k ? d.result[k] : [];
        if (b.length) return { haut: Math.max(...b.map(x => +x[2])), bas: Math.min(...b.map(x => +x[3])) };
      }
    } catch (e) { /* rien */ }
  }
  return null;
}

/** Alertes franchies pour un appareil. */
export async function franchies(abonne, maintenant, f = fetch) {
  const fin = maintenant - abonne.decalage;
  const debut = Math.max(abonne.maj - abonne.decalage, fin - FENETRE);
  const parSymbole = {};
  for (const a of abonne.alertes) (parSymbole[a.s] || (parSymbole[a.s] = [])).push(a);
  const out = [];
  for (const [s, liste] of Object.entries(parSymbole)) {
    const x = await extremes(s, debut, fin, f);
    if (!x) continue;
    for (const a of liste) if (a.sens === 'bas' ? x.bas <= a.prix : x.haut >= a.prix) out.push(a);
  }
  return out;
}

export async function verifier(env, f = fetch) {
  const abonnes = await lire(env);
  const tokens = Object.keys(abonnes);
  if (!tokens.length) return;
  let modifie = false;
  for (const token of tokens) {
    const ab = abonnes[token];
    const touchees = await franchies(ab, Date.now(), f);
    if (!touchees.length) continue;
    const groupes = new Set(touchees.map(a => a.groupe));
    const textes = [...new Set(touchees.map(a => a.texte))];
    const r = await envoyer(env, token, textes.join('\n'), f);
    if (r.inconnu) { delete abonnes[token]; modifie = true; continue; }
    ab.alertes = ab.alertes.filter(a => !groupes.has(a.groupe));
    if (!ab.alertes.length) delete abonnes[token];
    modifie = true;
  }
  if (modifie) await env.ABONNES.put(CLE, JSON.stringify(abonnes));
}

// ---------- Firebase Cloud Messaging (API HTTP v1) ----------
let jetonCache = null;

function base64url(octets) {
  let s = '';
  for (const o of new Uint8Array(octets)) s += String.fromCharCode(o);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const texteB64 = t => base64url(new TextEncoder().encode(t));

async function jetonGoogle(sa, f) {
  if (jetonCache && jetonCache.exp > Date.now() + 60000) return jetonCache.valeur;
  const iat = Math.floor(Date.now() / 1000);
  const entete = texteB64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const charge = texteB64(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const cle = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cle, new TextEncoder().encode(entete + '.' + charge));
  const jwt = entete + '.' + charge + '.' + base64url(signature);
  const r = await f('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  const d = await r.json();
  if (!d.access_token) throw new Error('Connexion à Google refusée : ' + (d.error_description || d.error || r.status));
  jetonCache = { valeur: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return jetonCache.valeur;
}

export async function envoyer(env, token, texte, f = fetch) {
  if (!env.FIREBASE_SA) return { erreur: 'Secret FIREBASE_SA absent' };
  try {
    const sa = JSON.parse(env.FIREBASE_SA);
    const acces = await jetonGoogle(sa, f);
    const r = await f(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + acces, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title: 'Proof of Life', body: texte }, android: { priority: 'high' } } })
    });
    if (r.ok) return { ok: true };
    const d = await r.json().catch(() => ({}));
    const code = d.error && d.error.details && d.error.details.map(x => x.errorCode).find(Boolean);
    return { erreur: (d.error && d.error.message) || String(r.status), inconnu: r.status === 404 || code === 'UNREGISTERED' };
  } catch (e) { return { erreur: e.message }; }
}
