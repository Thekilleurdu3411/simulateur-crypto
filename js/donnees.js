// Données réelles hors marché : réseau Bitcoin, taux euro-dollar, calendrier Tempo.
import { API_REST } from './config.js';
import { subvention } from './minage.js';

const MEMPOOL = 'https://mempool.space/api';
const TEMPO = 'https://www.api-couleur-tempo.fr/api/jourTempo/';
const COULEURS = { 1: 'bleu', 2: 'blanc', 3: 'rouge' };

export const etat = { reseau: null, eurUsd: null, couleurs: {}, tempoDispo: null, alt: null };
const ecouteurs = new Set();
export function ecouter(f) { ecouteurs.add(f); }
function notifier() { for (const f of ecouteurs) f(); }

async function json(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Difficulté, hauteur et frais moyens réels du réseau Bitcoin.
export async function chargerReseau() {
  const [hr, hauteur, stats] = await Promise.all([
    json(MEMPOOL + '/v1/mining/hashrate/3d'),
    json(MEMPOOL + '/blocks/tip/height'),
    json(MEMPOOL + '/v1/mining/reward-stats/144')
  ]);
  const fraisMoyens = Number(stats.totalFee) / 144 / 1e8;
  etat.reseau = {
    difficulte: Number(hr.currentDifficulty),
    hashrate: Number(hr.currentHashrate),
    hauteur: Number(hauteur),
    subvention: subvention(Number(hauteur)),
    fraisMoyens,
    recompense: subvention(Number(hauteur)) + fraisMoyens,
    maj: Date.now()
  };
  return etat.reseau;
}

export async function chargerEurUsd() {
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
  const d = await json('./data/altcoins.json');
  if (d && d.coins) etat.alt = d;
  return etat.alt;
}

export async function demarrer() {
  await Promise.allSettled([chargerReseau(), chargerEurUsd(), chargerAltcoins()]);
  notifier();
  setInterval(() => { Promise.allSettled([chargerReseau(), chargerEurUsd(), chargerAltcoins()]).then(notifier); }, 10 * 60000);
}

// ---------- Météo réelle (Open-Meteo, gratuit et sans clé) ----------
// Sert à calculer la température de la pièce où tournent les machines.
const temperatures = new Map(); // heure (ms, arrondie) -> °C
export async function chargerMeteo(lieu) {
  if (!lieu || lieu.lat == null) return false;
  const d = await json(`https://api.open-meteo.com/v1/forecast?latitude=${lieu.lat}&longitude=${lieu.lon}&hourly=temperature_2m&past_days=31&forecast_days=2&timezone=UTC`);
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
