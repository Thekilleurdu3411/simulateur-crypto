// Données réelles hors marché : réseau Bitcoin, taux euro-dollar, calendrier Tempo.
import { API_REST } from './config.js';
import { subvention } from './minage.js';
import { maintenant as tJeu, enRejeu, accelere } from './horloge.js';
import { reseauSimu, eurUsdSimu, prixSimu } from './simu.js';

// Simulation de la partie (au-delà d'aujourd'hui en temps accéléré), fournie par le jeu.
let obtenirSimu = () => null;
export function brancherSimulation(f) { obtenirSimu = f; }
function simuA(t) { const m = obtenirSimu(); return m && t >= m.debut ? m : null; }

const MEMPOOL = 'https://mempool.space/api';
const TEMPO = 'https://www.api-couleur-tempo.fr/api/jourTempo/';
const COULEURS = { 1: 'bleu', 2: 'blanc', 3: 'rouge' };

export const etat = { reseau: null, eurUsd: null, couleurs: {}, tempoDispo: null, alt: null, reseauActuel: null, prixMachines: 1 };
const ecouteurs = new Set();
export function ecouter(f) { ecouteurs.add(f); }
function notifier() { for (const f of ecouteurs) f(); }

async function json(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Difficulté, hauteur et frais moyens réels du réseau Bitcoin (à la date du jeu en rejeu).
export async function chargerReseau() {
  if (enRejeu()) {
    const t = tJeu(), m = simuA(t);
    if (m) { etat.reseau = { ...reseauSimu(m, t), maj: Date.now() }; await prixMachinesSimu(m, t).catch(() => {}); return etat.reseau; }
    return chargerReseauHisto(t);
  }
  return chargerReseauActuel();
}
/** Réseau Bitcoin d'aujourd'hui (pour figer le départ d'une simulation). */
export async function reseauDuJour() { return etat.reseauActuel || chargerReseauActuel(); }

async function chargerReseauActuel() {
  const [hr, hauteur, stats] = await Promise.all([
    json(MEMPOOL + '/v1/mining/hashrate/3d'),
    json(MEMPOOL + '/blocks/tip/height'),
    json(MEMPOOL + '/v1/mining/reward-stats/144')
  ]);
  const fraisMoyens = Number(stats.totalFee) / 144 / 1e8;
  const r = {
    difficulte: Number(hr.currentDifficulty),
    hashrate: Number(hr.currentHashrate),
    hauteur: Number(hauteur),
    subvention: subvention(Number(hauteur)),
    fraisMoyens,
    recompense: subvention(Number(hauteur)) + fraisMoyens,
    maj: Date.now()
  };
  etat.reseauActuel = r;
  if (!enRejeu()) etat.reseau = r; // en rejeu, le réseau du jour ne sert qu'à comparer les prix des machines
  return r;
}

// ---------- Rejeu : réseau Bitcoin à une date passée ----------
export const FRAIS_DEFAUT_REJEU = 0.1; // BTC par bloc, si l'historique des frais ne remonte pas assez loin
let histo = null, histoFrais = null;
const dernierAvant = (liste, t, cle) => { let r = null; for (const x of liste) { if (x[cle] * 1000 <= t) r = x; else break; } return r; };

async function historique(chemin) {
  try { return await json(MEMPOOL + chemin + 'all'); } catch (e) { return json(MEMPOOL + chemin + '3y'); }
}

export async function chargerReseauHisto(t) {
  if (!histo) histo = await historique('/v1/mining/hashrate/');
  if (!histoFrais) histoFrais = await historique('/v1/mining/blocks/fees/').catch(() => []);
  const adj = dernierAvant(histo.difficulty || [], t, 'time');
  const hr = dernierAvant(histo.hashrates || [], t, 'timestamp');
  if (!adj) throw new Error('Historique du réseau indisponible à cette date');
  let hauteur = Math.round(adj.height + (t / 1000 - adj.time) / 600);
  // Hauteur exacte du bloc (une requête), sauf en temps accéléré où l'estimation suffit
  if (!accelere()) { try { hauteur = Number((await json(MEMPOOL + '/v1/mining/blocks/timestamp/' + Math.floor(t / 1000))).height); } catch (e) { /* estimation */ } }
  const f = dernierAvant(histoFrais, t, 'timestamp');
  const fraisMoyens = f ? Number(f.avgFees) / 1e8 : FRAIS_DEFAUT_REJEU;
  etat.reseau = {
    difficulte: Number(adj.difficulty), hashrate: hr ? Number(hr.avgHashrate) : null, hauteur,
    subvention: subvention(hauteur), fraisMoyens, recompense: subvention(hauteur) + fraisMoyens,
    fraisEstimes: !f, maj: Date.now(), date: t
  };
  await prixMachinesRejeu(t).catch(() => {});
  return etat.reseau;
}

/**
 * Prix des machines à une date passée : prix actuel × rapport du « hashprice » (revenu d'un TH/s par jour
 * en dollars) entre cette date et aujourd'hui. Le prix des ASIC suit la rentabilité du minage.
 */
export function rapportHashprice(passe, actuel) {
  const hp = r => r.recompense / r.difficulte * r.btcUsd;
  const x = hp(passe) / hp(actuel);
  return Math.min(10, Math.max(0.5, x));
}
let btcUsdDuJour = null;
async function actuelAvecPrix() {
  if (!etat.reseauActuel) await chargerReseauActuel();
  if (!btcUsdDuJour) btcUsdDuJour = Number((await json(API_REST + '/api/v3/ticker/price?symbol=BTCUSDT')).price);
  return { ...etat.reseauActuel, btcUsd: btcUsdDuJour };
}
async function prixMachinesRejeu(t) {
  const [actuel, k] = await Promise.all([
    actuelAvecPrix(),
    json(API_REST + `/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${Math.floor(t - 36e5)}&limit=1`)
  ]);
  etat.prixMachines = rapportHashprice({ ...etat.reseau, btcUsd: Number(k[0][4]) }, actuel);
}
async function prixMachinesSimu(m, t) {
  const actuel = await actuelAvecPrix();
  const btcUsd = prixSimu(m, 'BTCEUR', t) * eurUsdSimu(m, t);
  etat.prixMachines = rapportHashprice({ ...etat.reseau, btcUsd }, actuel);
}

const fxHeures = new Map(); // heure -> cours EUR/USDT (rejeu)
export async function chargerEurUsd() {
  if (enRejeu()) {
    const t = tJeu(), m = simuA(t);
    if (m) return (etat.eurUsd = eurUsdSimu(m, t));
    const h = Math.floor(t / 36e5) * 36e5;
    if (!fxHeures.has(h)) {
      // 1 000 heures d'un coup (environ 6 semaines de jeu)
      const k = await json(API_REST + `/api/v3/klines?symbol=EURUSDT&interval=1h&startTime=${h - 36e5}&limit=1000`);
      for (const x of k) fxHeures.set(x[0], Number(x[4]));
    }
    etat.eurUsd = fxHeures.get(h) || fxHeures.get(h - 36e5) || etat.eurUsd;
    return etat.eurUsd;
  }
  const d = await json(API_REST + '/api/v3/ticker/price?symbol=EURUSDT');
  etat.eurUsd = Number(d.price);
  return etat.eurUsd;
}

// Couleur Tempo d'un jour (AAAA-MM-JJ), mise en cache.
export async function couleurTempo(date) {
  if (etat.couleurs[date]) return etat.couleurs[date];
  // Date au-delà d'aujourd'hui (simulation) : couleur du même jour une année passée connue
  let source = date;
  const ajd = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  if (date > ajd) { const ecart = Math.ceil((Date.parse(date) - Date.parse(ajd)) / (365.25 * 864e5)); source = (Number(date.slice(0, 4)) - ecart) + date.slice(4); if (source.endsWith('-02-29')) source = source.slice(0, 8) + '28'; }
  const d = await json(TEMPO + source);
  const c = COULEURS[d.codeJour];
  if (c) etat.couleurs[date] = c;
  return c || null;
}

export async function chargerTempo(dates) {
  const res = await Promise.allSettled(dates.map(couleurTempo));
  etat.tempoDispo = res.some(r => r.status === 'fulfilled' && r.value);
  return etat.couleurs;
}

// Réseaux des autres cryptos minables : fichier du site, actualisé chaque heure par GitHub Actions.
export async function chargerAltcoins() {
  if (enRejeu()) { etat.alt = null; return null; } // pas d'historique public des réseaux des autres cryptos
  const d = await json('./data/altcoins.json');
  if (d && d.coins) etat.alt = d;
  return etat.alt;
}

/** Temps accéléré : met à jour réseau et euro-dollar quand la date du jeu a avancé d'un jour. */
let suiviEnCours = false;
export async function suivreTemps(t) {
  if (suiviEnCours || !enRejeu()) return false;
  const r = etat.reseau;
  if (r && r.date && Math.abs(t - r.date) < 864e5) return false;
  suiviEnCours = true;
  try { await Promise.allSettled([chargerReseau(), chargerEurUsd()]); notifier(); return true; }
  finally { suiviEnCours = false; }
}

let boucle = null;
export async function demarrer() {
  await Promise.allSettled([chargerReseau(), chargerEurUsd(), chargerAltcoins()]);
  notifier();
  clearInterval(boucle);
  boucle = setInterval(() => { Promise.allSettled([chargerReseau(), chargerEurUsd(), chargerAltcoins()]).then(notifier); }, 10 * 60000);
}

/** Recharge tout quand l'horloge du jeu change (nouvelle partie, date passée). */
export function changerMode() {
  etat.reseau = null; etat.eurUsd = null; etat.alt = null; etat.prixMachines = 1;
  temperatures.clear(); meteoFenetre = null; fxHeures.clear();
  return demarrer();
}

// ---------- Météo réelle (Open-Meteo, gratuit et sans clé) ----------
// Sert à calculer la température de la pièce où tournent les machines.
const temperatures = new Map(); // heure (ms, arrondie) -> °C
let meteoEnCours = null;
export async function chargerMeteo(lieu) {
  if (!lieu || lieu.lat == null) return false;
  if (meteoEnCours) return meteoEnCours;
  meteoEnCours = chargerMeteoFenetre(lieu).finally(() => { meteoEnCours = null; });
  return meteoEnCours;
}
async function chargerMeteoFenetre(lieu) {
  const t0 = tJeu();
  // Au-delà d'aujourd'hui (simulation) : la météo réelle des mêmes jours une année passée
  const AN = 365.25 * 864e5;
  const ecart = t0 > Date.now() - 3 * 864e5 && enRejeu() ? Math.ceil((t0 - (Date.now() - 3 * 864e5)) / AN) : 0;
  const t = t0 - ecart * AN;
  const jour = x => new Date(x).toISOString().slice(0, 10);
  // Rejeu : archives météo (ERA5) autour de la date du jeu ; sinon prévisions avec le mois écoulé.
  const url = enRejeu() && Date.now() - t > 60 * 864e5
    ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lieu.lat}&longitude=${lieu.lon}&hourly=temperature_2m&start_date=${jour(t - 31 * 864e5)}&end_date=${jour(t + 2 * 864e5)}&timezone=UTC`
    : `https://api.open-meteo.com/v1/forecast?latitude=${lieu.lat}&longitude=${lieu.lon}&hourly=temperature_2m&past_days=${enRejeu() ? 92 : 31}&forecast_days=2&timezone=UTC`;
  const d = await json(url);
  const decal = Math.round(ecart * AN / 36e5) * 36e5;
  d.hourly.time.forEach((x, i) => { const v = d.hourly.temperature_2m[i]; if (v != null) temperatures.set(Date.parse(x + 'Z') + decal, v); });
  meteoFenetre = { debut: t0 - 30 * 864e5, fin: t0 + 2 * 864e5 };
  etat.meteoMaj = Date.now();
  return true;
}
export async function localiser(ville) {
  const d = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&countryCode=FR`);
  const r = d.results && d.results[0];
  return r ? { nom: r.name, lat: r.latitude, lon: r.longitude } : null;
}
let meteoFenetre = null;
/** Temps accéléré : la fenêtre de météo chargée suit la date du jeu. */
export function meteoAJour(t) { return !!meteoFenetre && t >= meteoFenetre.debut && t <= meteoFenetre.fin - 6 * 36e5; }
export function temperatureExterieure(t) {
  const h = Math.floor(t / 36e5) * 36e5;
  return temperatures.has(h) ? temperatures.get(h) : null;
}
