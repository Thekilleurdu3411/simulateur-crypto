// Connexion au marché réel : flux en direct (WebSocket) et requêtes ponctuelles (REST).
import { API_REST, API_WS, CRYPTOS } from './config.js';
import { maintenant as tJeu, enRejeu } from './horloge.js';

const tickers = {};          // { BTCEUR: { c, o, h, l, q, t } }
const indisponibles = new Set();
const ecouteurs = new Set();
const infosCache = {};
let ws = null, essais = 0, minuterie = null;
export const etat = { statut: 'connexion', dernierTick: 0 };

function notifier(type, symbole, donnees) { for (const f of ecouteurs) f(type, symbole, donnees); }
export function ecouter(f) { ecouteurs.add(f); return () => ecouteurs.delete(f); }

export function ticker(symbole) { return tickers[symbole] || null; }
export function prixDeBase(base) {
  const c = CRYPTOS.find(x => x.base === base);
  return c && tickers[c.s] ? tickers[c.s].c : null;
}
export function cryptosDisponibles() { return CRYPTOS.filter(c => !indisponibles.has(c.s)); }

async function json(chemin) {
  const r = await fetch(API_REST + chemin, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Premier chargement des prix et variations sur 24 h, paire par paire.
async function chargerTickers() {
  const res = await Promise.allSettled(CRYPTOS.map(c => json('/api/v3/ticker/24hr?symbol=' + c.s)));
  res.forEach((r, i) => {
    const s = CRYPTOS[i].s;
    if (r.status === 'fulfilled') {
      const d = r.value;
      tickers[s] = { c: +d.lastPrice, o: +d.openPrice, h: +d.highPrice, l: +d.lowPrice, q: +d.quoteVolume, t: Date.now() };
    } else if (String(r.reason).includes('400')) {
      indisponibles.add(s); // paire inexistante sur le marché réel
    }
  });
  notifier('liste');
}

function connecter() {
  clearTimeout(minuterie);
  if (enRejeu()) return;
  // Mini-tickers pour les prix, bougies d'une minute pour suivre les ordres en attente.
  const flux = CRYPTOS.filter(c => !indisponibles.has(c.s))
    .flatMap(c => [c.s.toLowerCase() + '@miniTicker', c.s.toLowerCase() + '@kline_1m']).join('/');
  try { ws = new WebSocket(API_WS + '/stream?streams=' + flux); }
  catch (e) { return planifier(); }
  ws.onopen = () => { essais = 0; etat.statut = 'direct'; notifier('statut'); };
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    const d = m.data;
    if (!d || !d.s) return;
    if (d.e === 'kline') {
      const k = d.k;
      notifier('bougie', d.s, { t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c });
      return;
    }
    tickers[d.s] = { c: +d.c, o: +d.o, h: +d.h, l: +d.l, q: +d.q, t: d.E || Date.now() };
    etat.dernierTick = Date.now();
    notifier('tick', d.s);
  };
  ws.onclose = () => { ws = null; etat.statut = navigator.onLine === false ? 'hors-ligne' : 'reconnexion'; notifier('statut'); planifier(); };
  ws.onerror = () => { try { ws && ws.close(); } catch (e) {} };
}

function planifier() {
  clearTimeout(minuterie);
  const delai = Math.min(30000, 1000 * 2 ** essais++);
  minuterie = setTimeout(connecter, delai);
}

let demarre = false;
export async function demarrer() {
  if (!demarre) {
    demarre = true;
    document.addEventListener('visibilitychange', () => {
      if (enRejeu()) { if (document.visibilityState === 'visible') pasRejeu(); return; }
      if (document.visibilityState === 'visible' && !ws) { essais = 0; connecter(); chargerTickers().catch(() => {}); }
    });
    window.addEventListener('online', () => { if (!enRejeu() && !ws) { essais = 0; connecter(); } });
  }
  if (enRejeu()) return demarrerRejeu();
  try { await chargerTickers(); }
  catch (e) { etat.statut = 'hors-ligne'; notifier('statut'); }
  connecter();
}

/** À appeler quand l'horloge change (nouvelle partie, partie à une date passée, abandon). */
export function changerMode() {
  for (const k of Object.keys(tickers)) delete tickers[k];
  indisponibles.clear();
  for (const k of Object.keys(tampons)) delete tampons[k];
  for (const k of Object.keys(stats24)) delete stats24[k];
  for (const k of Object.keys(minuteVue)) delete minuteVue[k];
  for (const k of Object.keys(essaiRejeu)) delete essaiRejeu[k];
  clearInterval(boucleRejeu); boucleRejeu = null;
  clearTimeout(minuterie);
  if (ws) { const w = ws; ws = null; w.onclose = null; try { w.close(); } catch (e) {} }
  etat.statut = 'connexion'; notifier('statut'); notifier('liste');
  return demarrer();
}

// ---------- Rejeu d'une date passée ----------
// Les prix viennent des vraies bougies d'une minute de la date du jeu. Pas de carnet historique public :
// meilleurs prix et carnet sont reconstitués autour du prix (voir DECISIONS.md).
const tampons = {};   // { BTCEUR: [bougies 1 min] }
const stats24 = {};   // { BTCEUR: { o, h, l, q, maj } }
const minuteVue = {}; // dernière minute dont la bougie complète a été envoyée
const chargements = {};
const essaiRejeu = {};
let boucleRejeu = null;
export const DEMI_ECART_REJEU = 0.0001; // demi-écart acheteur-vendeur reconstitué (0,01 %)

function bougieA(s, t) {
  const b = tampons[s];
  if (!b || !b.length) return null;
  const i = Math.floor((t - b[0].t) / 60000);
  if (b[i] && t >= b[i].t && t < b[i].t + 60000) return b[i];
  return b.find(k => t >= k.t && t < k.t + 60000) || null;
}

async function remplir(s, t) {
  if (chargements[s]) return chargements[s];
  chargements[s] = (async () => {
    const d = await json(`/api/v3/klines?symbol=${s}&interval=1m&startTime=${Math.floor(t - 120000)}&limit=1000`);
    tampons[s] = d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], q: +k[7] }));
    return tampons[s];
  })().finally(() => { chargements[s] = null; });
  return chargements[s];
}

async function statsJour(s, t) {
  const st = stats24[s];
  if (st && t - st.maj < 600000) return st;
  const d = await json(`/api/v3/klines?symbol=${s}&interval=1h&startTime=${Math.floor(t - 864e5)}&endTime=${Math.floor(t)}&limit=25`);
  if (!d.length) return null;
  return (stats24[s] = { o: +d[0][1], h: Math.max(...d.map(k => +k[2])), l: Math.min(...d.map(k => +k[3])), q: d.reduce((x, k) => x + +k[7], 0), maj: t });
}

async function pasRejeu() {
  if (!enRejeu()) return;
  const t = tJeu();
  let ok = 0, erreurs = 0;
  await Promise.all(CRYPTOS.filter(c => !indisponibles.has(c.s)).map(async c => {
    const s = c.s;
    try {
      let k = bougieA(s, t);
      const b = tampons[s];
      if ((!k || !b || t > b[b.length - 1].t - 120000) && !(essaiRejeu[s] > Date.now() - 30000)) {
        essaiRejeu[s] = Date.now();
        const neuf = await remplir(s, t);
        k = bougieA(s, t);
        // Paire pas encore cotée à cette date : aucune bougie, ou la plateforme renvoie les premières bougies après la cotation
        if (!tickers[s] && (!neuf.length || neuf[0].t > t + 120000)) { indisponibles.add(s); notifier('liste'); return; }
      }
      // Trou dans les données (maintenance de la plateforme) : dernier prix connu
      if (!k) k = (tampons[s] || []).filter(x => x.t <= t).pop();
      if (!k) return;
      const st = await statsJour(s, t);
      const frac = Math.min(1, Math.max(0, (t - k.t) / 60000));
      const p = k.o + (k.c - k.o) * frac;
      tickers[s] = { c: p, o: st ? st.o : k.o, h: Math.max(st ? st.h : p, p), l: Math.min(st ? st.l : p, p), q: st ? st.q : k.q, t };
      if (minuteVue[s] !== undefined && minuteVue[s] !== k.t) {
        const prec = bougieA(s, k.t - 60000);
        if (prec) notifier('bougie', s, { t: prec.t, o: prec.o, h: prec.h, l: prec.l, c: prec.c });
      }
      minuteVue[s] = k.t;
      ok++;
      notifier('tick', s);
    } catch (e) { erreurs++; }
  }));
  const statut = ok ? 'rejeu' : erreurs ? 'hors-ligne' : etat.statut;
  if (statut !== etat.statut) { etat.statut = statut; notifier('statut'); }
  etat.dernierTick = Date.now();
}

async function demarrerRejeu() {
  etat.statut = 'connexion'; notifier('statut');
  await pasRejeu();
  notifier('liste');
  clearInterval(boucleRejeu);
  boucleRejeu = setInterval(pasRejeu, 2000);
}

/** Carnet reconstitué autour du prix rejoué : 100 niveaux de chaque côté. */
export function carnetSynthetique(p, volumeMinute, tick = 0.01) {
  const pasPrix = Math.max(tick, p * 0.00002);
  const q = Math.max(volumeMinute / 40, 500 / p);
  const bids = [], asks = [];
  for (let i = 0; i < 100; i++) {
    bids.push([p * (1 - DEMI_ECART_REJEU) - i * pasPrix, q]);
    asks.push([p * (1 + DEMI_ECART_REJEU) + i * pasPrix, q]);
  }
  return { bids, asks };
}

// Bougies pour le graphique.
export async function bougies(symbole, intervalle, limite) {
  const fin = enRejeu() ? '&endTime=' + Math.floor(tJeu()) : '';
  const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&limit=${limite}${fin}`);
  return d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
}

// Bougies réelles d'une période passée (rattrapage hors ligne), par pages de 1000.
export async function bougiesPeriode(symbole, intervalle, debut, fin) {
  const tout = [];
  let depuis = debut;
  for (let page = 0; page < 60 && depuis < fin; page++) {
    const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&startTime=${Math.floor(depuis)}&endTime=${Math.floor(fin)}&limit=1000`);
    if (!d.length) break;
    for (const k of d) tout.push({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], fin: k[6] + 1 });
    depuis = d[d.length - 1][6] + 1;
    if (d.length < 1000) break;
  }
  return tout;
}

// Meilleurs prix d'achat et de vente actuels.
export async function meilleursPrix(symbole) {
  if (enRejeu()) {
    const t = tickers[symbole];
    if (!t) throw new Error('Prix indisponible');
    return { bid: t.c * (1 - DEMI_ECART_REJEU), ask: t.c * (1 + DEMI_ECART_REJEU) };
  }
  const d = await json('/api/v3/ticker/bookTicker?symbol=' + symbole);
  return { bid: +d.bidPrice, ask: +d.askPrice };
}

// Carnet d'ordres réel au moment de l'ordre.
export async function carnet(symbole) {
  if (enRejeu()) {
    const t = tickers[symbole];
    if (!t) throw new Error('Prix indisponible');
    const k = bougieA(symbole, tJeu());
    return carnetSynthetique(t.c, k ? k.v : 0);
  }
  const d = await json(`/api/v3/depth?symbol=${symbole}&limit=100`);
  const conv = a => a.map(([p, q]) => [+p, +q]);
  return { bids: conv(d.bids), asks: conv(d.asks) };
}

// Règles réelles de la paire : pas de quantité et montant minimum.
export async function regles(symbole) {
  if (infosCache[symbole]) return infosCache[symbole];
  const d = await json('/api/v3/exchangeInfo?symbol=' + symbole);
  const f = d.symbols[0].filters;
  const lot = f.find(x => x.filterType === 'LOT_SIZE') || {};
  const notional = f.find(x => x.filterType === 'NOTIONAL' || x.filterType === 'MIN_NOTIONAL') || {};
  const prixF = f.find(x => x.filterType === 'PRICE_FILTER') || {};
  const r = { pas: lot.stepSize || '0.00000001', tick: prixF.tickSize || '0.01', minNotional: +(notional.minNotional || 5) };
  infosCache[symbole] = r;
  return r;
}
