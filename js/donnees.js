// Données réelles hors marché : réseau Bitcoin, taux euro-dollar, calendrier Tempo.
import { API_REST } from './config.js';
import { subvention } from './minage.js';

const MEMPOOL = 'https://mempool.space/api';
const TEMPO = 'https://www.api-couleur-tempo.fr/api/jourTempo/';
const COULEURS = { 1: 'bleu', 2: 'blanc', 3: 'rouge' };

export const etat = { reseau: null, eurUsd: null, couleurs: {}, tempoDispo: null };
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

export async function demarrer() {
  await Promise.allSettled([chargerReseau(), chargerEurUsd()]);
  notifier();
  setInterval(() => { Promise.allSettled([chargerReseau(), chargerEurUsd()]).then(notifier); }, 10 * 60000);
}
