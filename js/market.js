// Connexion au marché réel : flux en direct (WebSocket) et requêtes ponctuelles (REST).
import { API_REST, API_WS, CRYPTOS } from './config.js';

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

export async function demarrer() {
  try { await chargerTickers(); }
  catch (e) { etat.statut = 'hors-ligne'; notifier('statut'); }
  connecter();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !ws) { essais = 0; connecter(); chargerTickers().catch(() => {}); }
  });
  window.addEventListener('online', () => { if (!ws) { essais = 0; connecter(); } });
}

// Bougies pour le graphique.
export async function bougies(symbole, intervalle, limite) {
  const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&limit=${limite}`);
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
  const d = await json('/api/v3/ticker/bookTicker?symbol=' + symbole);
  return { bid: +d.bidPrice, ask: +d.askPrice };
}

// Carnet d'ordres réel au moment de l'ordre.
export async function carnet(symbole) {
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
