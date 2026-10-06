// Marché : flux en direct (WebSocket), rejeu de l'historique réel à toute vitesse, puis marché simulé
// au-delà d'aujourd'hui pour les parties en temps accéléré.
import { API_REST, API_WS, CRYPTOS } from './config.js';
import { maintenant as tJeu, enRejeu, accelere, vitesseActuelle } from './horloge.js';
import * as S from './simu.js';

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

/** À appeler quand l'horloge change (nouvelle partie, date passée, temps accéléré, abandon). */
export function changerMode() {
  for (const k of Object.keys(tickers)) delete tickers[k];
  indisponibles.clear();
  for (const o of [tampons, stats24, vu, chargements, essaiRejeu]) for (const k of Object.keys(o)) delete o[k];
  clearInterval(boucleRejeu); boucleRejeu = null;
  clearTimeout(minuterie);
  if (ws) { const w = ws; ws = null; w.onclose = null; try { w.close(); } catch (e) {} }
  etat.statut = 'connexion'; notifier('statut'); notifier('liste');
  return demarrer();
}

// ---------- Simulation au-delà d'aujourd'hui ----------
// La partie fournit la simulation (enregistrée dans la sauvegarde) et sait la créer.
let simulation = { obtenir: () => null, creer: null };
export function brancherSimulation(obtenir, creer) { simulation = { obtenir, creer }; }
function sim() { return simulation.obtenir(); }
function simule(s, t) { const m = sim(); return m && S.couvre(m, s, t) ? m : null; }
export function enSimulation(t = tJeu()) { const m = sim(); return !!m && t >= m.debut; }
export function actualites(debut, fin) { const m = sim(); return m ? S.actualitesSimu(m, Math.max(debut, m.debut), fin) : []; }
export function phase(t = tJeu()) { const m = sim(); return m && t >= m.debut ? S.phaseSimu(m, t) : null; }

let creation = false;
// Le temps accéléré rattrape aujourd'hui : on fige les vrais prix actuels et la simulation prend le relais.
async function lancerSimulation() {
  if (creation || !simulation.creer) return;
  creation = true;
  try {
    const liste = CRYPTOS.filter(c => !indisponibles.has(c.s));
    const res = await Promise.allSettled(liste.map(c => json('/api/v3/ticker/24hr?symbol=' + c.s)));
    const prix = {}, volumes = {}, stats0 = {};
    res.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const d = r.value, s = liste[i].s;
      prix[s] = +d.lastPrice; volumes[s] = +d.quoteVolume; stats0[s] = { o: +d.openPrice, h: +d.highPrice, l: +d.lowPrice };
    });
    if (Object.keys(prix).length) await simulation.creer({ debut: tJeu(), prix, volumes, stats0 });
  } catch (e) { /* hors ligne : on réessaiera */ }
  finally { creation = false; }
}

// ---------- Rejeu de l'historique réel (à toute vitesse) ----------
// Les prix viennent des vraies bougies de la date du jeu, plus ou moins fines selon la vitesse.
// Pas de carnet historique public : meilleurs prix et carnet sont reconstitués autour du prix.
const IV = { '1m': 60000, '15m': 900000, '1h': 3600000, '4h': 14400000, '1d': 864e5, '1w': 7 * 864e5 };
const tampons = {};   // { 'BTCEUR:15m': [bougies] }
const stats24 = {};   // { BTCEUR: { o, h, l, q, maj } } (bougies d'une minute)
const vu = {};        // dernière bougie terminée envoyée : { BTCEUR: { I, t } }
const chargements = {};
const essaiRejeu = {};
let boucleRejeu = null;
export const DEMI_ECART_REJEU = 0.0001; // demi-écart acheteur-vendeur reconstitué (0,01 %)

function intervalleRejeu() { const v = vitesseActuelle(); return v <= 60 ? '1m' : v <= 1440 ? '15m' : '1h'; }

function bougieA(cle, t, I) {
  const b = tampons[cle];
  if (!b || !b.length) return null;
  const i = Math.floor((t - b[0].t) / I);
  if (b[i] && t >= b[i].t && t < b[i].t + I) return b[i];
  return b.find(k => t >= k.t && t < k.t + I) || null;
}

async function remplir(s, iv, t) {
  const cle = s + ':' + iv;
  if (chargements[cle]) return chargements[cle];
  const I = IV[iv];
  const depuis = iv === '1m' ? t - 2 * I : t - 864e5 - 2 * I; // au-delà de la minute : 24 h d'avance pour les stats
  chargements[cle] = (async () => {
    const d = await json(`/api/v3/klines?symbol=${s}&interval=${iv}&startTime=${Math.floor(depuis)}&limit=1000`);
    tampons[cle] = d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5], q: +k[7] }));
    return tampons[cle];
  })().finally(() => { chargements[cle] = null; });
  return chargements[cle];
}

async function statsJour(s, t) {
  const st = stats24[s];
  if (st && (t - st.maj < 600000 || Date.now() - st.reel < 30000)) return st;
  const d = await json(`/api/v3/klines?symbol=${s}&interval=1h&startTime=${Math.floor(t - 864e5)}&endTime=${Math.floor(t)}&limit=25`);
  if (!d.length) return null;
  return (stats24[s] = { o: +d[0][1], h: Math.max(...d.map(k => +k[2])), l: Math.min(...d.map(k => +k[3])), q: d.reduce((x, k) => x + +k[7], 0), maj: t, reel: Date.now() });
}

function statsTampon(cle, t, I, p) {
  const b = (tampons[cle] || []).filter(k => k.t >= t - 864e5 && k.t + I <= t);
  if (!b.length) return null;
  return { o: b[0].o, h: Math.max(p, ...b.map(k => k.h)), l: Math.min(p, ...b.map(k => k.l)), q: b.reduce((x, k) => x + k.q, 0) };
}

// Envoie les bougies terminées depuis la dernière envoyée (pour les ordres en attente).
function envoyerTerminees(s, I, debutCourante, lire) {
  const v = vu[s];
  if (!v || v.I !== I) { vu[s] = { I, t: debutCourante }; return; }
  let n = 0;
  for (let d = v.t; d < debutCourante && n < 500; d += I, n++) {
    const b = lire(d);
    if (b) notifier('bougie', s, { t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, fin: b.t + I });
  }
  vu[s] = { I, t: debutCourante };
}

async function pasRejeu() {
  if (!enRejeu()) return;
  const t = tJeu();
  const iv = intervalleRejeu(), I = IV[iv];
  let ok = 0, erreurs = 0, simuOk = 0;
  await Promise.all(CRYPTOS.filter(c => !indisponibles.has(c.s)).map(async c => {
    const s = c.s;
    try {
      const m = simule(s, t);
      if (m) {
        // Marché simulé
        const p = S.prixSimu(m, s, t);
        const st = S.stats24Simu(m, s, t, m.stats0 && m.stats0[s]);
        tickers[s] = { c: p, o: st ? st.o : p, h: st ? Math.max(st.h, p) : p, l: st ? Math.min(st.l, p) : p, q: st ? st.q : 0, t };
        const Is = Math.max(I, S.PAS);
        envoyerTerminees(s, Is, Math.floor(t / Is) * Is, d => S.bougieSimu(m, s, Math.max(d, m.debut), Is));
        ok++; simuOk++;
        notifier('tick', s);
        return;
      }
      // Historique réel
      const cle = s + ':' + iv;
      let k = bougieA(cle, t, I);
      const b = tampons[cle];
      if ((!k || !b || t > b[b.length - 1].t - 2 * I) && !(essaiRejeu[cle] > Date.now() - (accelere() ? 3000 : 30000))) {
        essaiRejeu[cle] = Date.now();
        const neuf = await remplir(s, iv, t);
        k = bougieA(cle, t, I);
        // Paire pas encore cotée à cette date : aucune bougie, ou les premières bougies sont après la date
        if (!tickers[s] && (!neuf.length || neuf[0].t > t + 2 * I)) { indisponibles.add(s); notifier('liste'); return; }
      }
      if (!k) k = (tampons[cle] || []).filter(x => x.t <= t).pop(); // trou dans les données : dernier prix connu
      if (!k) return;
      const frac = Math.min(1, Math.max(0, (t - k.t) / I));
      const p = k.o + (k.c - k.o) * frac;
      const st = iv === '1m' ? await statsJour(s, t) : statsTampon(cle, t, I, p);
      tickers[s] = { c: p, o: st ? st.o : k.o, h: Math.max(st ? st.h : p, p), l: Math.min(st ? st.l : p, p), q: st ? st.q : k.q, t };
      envoyerTerminees(s, I, k.t, d => bougieA(cle, d, I));
      ok++;
      notifier('tick', s);
    } catch (e) { erreurs++; }
  }));
  // Temps accéléré qui rattrape aujourd'hui : la simulation prend le relais
  if (accelere() && !sim() && t >= Date.now() - 5 * 60000) lancerSimulation();
  const statut = simuOk ? 'simulation' : ok ? 'rejeu' : erreurs ? 'hors-ligne' : etat.statut;
  if (statut !== etat.statut) { etat.statut = statut; notifier('statut'); }
  etat.dernierTick = Date.now();
}

async function demarrerRejeu() {
  etat.statut = 'connexion'; notifier('statut');
  await pasRejeu();
  notifier('liste');
  clearInterval(boucleRejeu);
  boucleRejeu = setInterval(pasRejeu, accelere() ? 1000 : 2000);
}

/** Carnet reconstitué autour du prix : 100 niveaux de chaque côté. */
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

// Bougies pour le graphique (réelles, puis simulées au-delà du début de la simulation).
export async function bougies(symbole, intervalle, limite) {
  if (!enRejeu()) {
    const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&limit=${limite}`);
    return d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
  }
  const fin = tJeu(), I = IV[intervalle] || 3600000;
  const m = sim();
  if (m && fin > m.debut && symbole in m.prix) {
    const coupure = Math.floor(m.debut / I) * I;
    const simu = S.bougiesSimu(m, symbole, I, Math.max(fin - limite * I, coupure), fin);
    const manque = limite - simu.length;
    let reelles = [];
    if (manque > 0) {
      try {
        const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&limit=${Math.min(1000, manque)}&endTime=${Math.floor(coupure - 1)}`);
        reelles = d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] })).filter(k => k.t < coupure);
      } catch (e) { /* seulement la partie simulée */ }
    }
    return [...reelles, ...simu.map(b => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c }))];
  }
  const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&limit=${limite}&endTime=${Math.floor(fin)}`);
  return d.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
}

// Bougies d'une période passée (rattrapage des ordres), réelles par pages de 1000 puis simulées.
export async function bougiesPeriode(symbole, intervalle, debut, fin) {
  const tout = [];
  const m = sim();
  const finReel = m && symbole in m.prix ? Math.min(fin, m.debut) : fin;
  let depuis = debut;
  for (let page = 0; page < 60 && depuis < finReel; page++) {
    const d = await json(`/api/v3/klines?symbol=${symbole}&interval=${intervalle}&startTime=${Math.floor(depuis)}&endTime=${Math.floor(finReel)}&limit=1000`);
    if (!d.length) break;
    for (const k of d) tout.push({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], fin: k[6] + 1 });
    depuis = d[d.length - 1][6] + 1;
    if (d.length < 1000) break;
  }
  if (m && symbole in m.prix && fin > m.debut) {
    const I = Math.max(IV[intervalle] || S.PAS, S.PAS);
    for (const b of S.bougiesSimu(m, symbole, I, Math.max(debut, m.debut), fin)) if (b.t + I <= fin) tout.push({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, fin: b.t + I });
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

// Carnet d'ordres : réel en direct, reconstitué sinon.
export async function carnet(symbole) {
  if (enRejeu()) {
    const tk = tickers[symbole];
    if (!tk) throw new Error('Prix indisponible');
    const t = tJeu(), m = simule(symbole, t);
    let volMinute = 0;
    if (m) { const b = S.bougieSimu(m, symbole, t, S.PAS); volMinute = b ? b.q / tk.c / 15 : 0; }
    else { const iv = intervalleRejeu(), k = bougieA(symbole + ':' + iv, t, IV[iv]); volMinute = k ? k.v / (IV[iv] / 60000) : 0; }
    return carnetSynthetique(tk.c, volMinute);
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
