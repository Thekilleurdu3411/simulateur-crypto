// Données réelles hors marché : réseau Bitcoin, taux euro-dollar, calendrier Tempo.
import { API_REST } from './config.js';
import { subvention } from './minage.js';
import { maintenant as tJeu, enRejeu } from './horloge.js';

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
  if (enRejeu()) return chargerReseauHisto(tJeu());
  return chargerReseauActuel();
}

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
  let hauteur;
  try { hauteur = Number((await json(MEMPOOL + '/v1/mining/blocks/timestamp/' + Math.floor(t / 1000))).height); }
  catch (e) { hauteur = Math.round(adj.height + (t / 1000 - adj.time) / 600); }
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
async function prixMachinesRejeu(t) {
  if (!etat.reseauActuel) await chargerReseauActuel();
  const [maintenantUsd, k] = await Promise.all([
    json(API_REST + '/api/v3/ticker/price?symbol=BTCUSDT'),
    json(API_REST + `/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${Math.floor(t - 36e5)}&limit=1`)
  ]);
  const actuel = { ...etat.reseauActuel, btcUsd: Number(maintenantUsd.price) };
  const passe = { ...etat.reseau, btcUsd: Number(k[0][4]) };
  etat.prixMachines = rapportHashprice(passe, actuel);
}

export async function chargerEurUsd() {
  if (enRejeu()) {
    const t = tJeu();
    const k = await json(API_REST + `/api/v3/klines?symbol=EURUSDT&interval=1h&startTime=${Math.floor(t - 36e5)}&limit=1`);
    etat.eurUsd = Number(k[0][4]);
    return etat.eurUsd;
  }
  const d = await json(API_REST + '/api/v3/ticker/price?symbol=EURUSDT');
  etat.eurUsd = Number(d.price);
  return etat.eurUsd;
}

// Couleur Tempo d'un jour (AAAA-MM-JJ), mise en cache.
export async function couleurTempo(date) {
  if (etat.couleurs[date]) return etat.couleurs[date];
  const d = await json(TEMPO + date);
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
  temperatures.clear();
  return demarrer();
}

// ---------- Météo réelle (Open-Meteo, gratuit et sans clé) ----------
// Sert à calculer la température de la pièce où tournent les machines.
const temperatures = new Map(); // heure (ms, arrondie) -> °C
export async function chargerMeteo(lieu) {
  if (!lieu || lieu.lat == null) return false;
  const t = tJeu();
  const jour = x => new Date(x).toISOString().slice(0, 10);
  // Rejeu : archives météo (ERA5) autour de la date du jeu ; sinon prévisions avec le mois écoulé.
  const url = enRejeu() && Date.now() - t > 60 * 864e5
    ? `https://archive-api.open-meteo.com/v1/archive?latitude=${lieu.lat}&longitude=${lieu.lon}&hourly=temperature_2m&start_date=${jour(t - 31 * 864e5)}&end_date=${jour(t + 2 * 864e5)}&timezone=UTC`
    : `https://api.open-meteo.com/v1/forecast?latitude=${lieu.lat}&longitude=${lieu.lon}&hourly=temperature_2m&past_days=${enRejeu() ? 92 : 31}&forecast_days=2&timezone=UTC`;
  const d = await json(url);
  d.hourly.time.forEach((t, i) => { const v = d.hourly.temperature_2m[i]; if (v != null) temperatures.set(Date.parse(t + 'Z'), v); });
  etat.meteoMaj = Date.now();
  return true;
}
export async function localiser(ville) {
  const d = await json(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr&countryCode=FR`);
  const r = d.results && d.results[0];
  return r ? { nom: r.name, lat: r.latitude, lon: r.longitude } : null;
}
export function temperatureExterieure(t) {
  const h = Math.floor(t / 36e5) * 36e5;
  return temperatures.has(h) ? temperatures.get(h) : null;
}
