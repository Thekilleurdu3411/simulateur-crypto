// Données réelles des contrats perpétuels (Binance Futures, accès public sans compte).
import { CONTRATS } from './futures.js';

const FAPI = 'https://fapi.binance.com';
const WS = 'wss://fstream.binance.com/market/stream?streams=';
export const etat = { marques: {}, statut: 'arret', regles: {} };
const ecouteurs = new Set();
let ws = null, essais = 0, actif = false;
export function ecouter(f) { ecouteurs.add(f); }
function notifier(type, s) { for (const f of ecouteurs) f(type, s); }

async function json(chemin) {
  const r = await fetch(FAPI + chemin, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Prix de marque, taux de financement en cours et prochaine échéance.
export async function chargerMarques() {
  const res = await Promise.allSettled(CONTRATS.map(c => json('/fapi/v1/premiumIndex?symbol=' + c.s)));
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      const d = r.value;
      etat.marques[CONTRATS[i].s] = { p: +d.markPrice, r: +d.lastFundingRate, T: +d.nextFundingTime, t: Date.now() };
    }
  });
  notifier('marque');
}

function connecter() {
  if (!actif) return;
  const flux = CONTRATS.map(c => c.s.toLowerCase() + '@markPrice@1s').join('/');
  try { ws = new WebSocket(WS + flux); } catch (e) { return planifier(); }
  ws.onopen = () => { essais = 0; etat.statut = 'direct'; notifier('statut'); };
  ws.onmessage = ev => {
    const d = JSON.parse(ev.data).data;
    if (!d || d.e !== 'markPriceUpdate') return;
    etat.marques[d.s] = { p: +d.p, r: +d.r, T: +d.T, t: d.E };
    notifier('marque', d.s);
  };
  ws.onclose = () => { ws = null; etat.statut = 'reconnexion'; notifier('statut'); planifier(); };
  ws.onerror = () => { try { ws && ws.close(); } catch (e) {} };
}
function planifier() { if (actif) setTimeout(connecter, Math.min(30000, 1000 * 2 ** essais++)); }

// Ne se connecte qu'à la première visite des perpétuels (pas de flux inutile).
export function demarrer() {
  if (actif) return;
  actif = true;
  chargerMarques().catch(() => {});
  connecter();
}

export async function meilleursPrix(s) {
  const d = await json('/fapi/v1/ticker/bookTicker?symbol=' + s);
  return { bid: +d.bidPrice, ask: +d.askPrice };
}

export async function regles(s) {
  if (etat.regles[s]) return etat.regles[s];
  const d = await json('/fapi/v1/exchangeInfo');
  for (const sym of d.symbols) {
    if (!CONTRATS.some(c => c.s === sym.symbol)) continue;
    const lot = sym.filters.find(f => f.filterType === 'MARKET_LOT_SIZE') || sym.filters.find(f => f.filterType === 'LOT_SIZE') || {};
    const n = sym.filters.find(f => f.filterType === 'MIN_NOTIONAL') || {};
    etat.regles[sym.symbol] = { pas: lot.stepSize || '0.001', minNotional: +(n.notional || 5) };
  }
  return etat.regles[s];
}

// Historique pour le rattrapage hors ligne.
export async function bougiesMarque(s, debut, fin) {
  const tout = [];
  const intervalle = fin - debut <= 3 * 864e5 ? '1m' : '1h';
  let depuis = debut;
  for (let page = 0; page < 40 && depuis < fin; page++) {
    const d = await json(`/fapi/v1/markPriceKlines?symbol=${s}&interval=${intervalle}&startTime=${Math.floor(depuis)}&endTime=${Math.floor(fin)}&limit=1500`);
    if (!d.length) break;
    for (const k of d) tout.push({ t: k[0], h: +k[2], l: +k[3], c: +k[4] });
    depuis = d[d.length - 1][6] + 1;
    if (d.length < 1500) break;
  }
  return tout;
}
export async function historiqueFinancement(s, debut, fin) {
  const d = await json(`/fapi/v1/fundingRate?symbol=${s}&startTime=${Math.floor(debut)}&endTime=${Math.floor(fin)}&limit=1000`);
  return d.map(x => ({ t: +x.fundingTime, taux: +x.fundingRate, marque: +x.markPrice }));
}
