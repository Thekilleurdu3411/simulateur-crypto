// Évolution des prix dans le temps : tous les montants de la vie (salaires, SMIC, loyers, courses, aides)
// et les tarifs d'électricité sont exprimés en valeurs de 2026, puis ramenés à la date du jeu.
// - Passé : inflation réelle (Insee) et vraies évolutions du tarif réglementé d'électricité.
// - Futur simulé : inflation et révisions du tarif tirées au hasard, de façon reproductible.

// Inflation moyenne annuelle en France, en % (Insee ; 2026 : estimation).
export const INFLATION = { 2017: 1.0, 2018: 1.8, 2019: 1.1, 2020: 0.5, 2021: 1.6, 2022: 5.2, 2023: 4.9, 2024: 2.0, 2025: 0.9, 2026: 1.0 };
const ANNEE_BASE = 2026;

// Révisions du Tarif Bleu (option Base, TTC), en %. Base des tarifs du jeu : 1er août 2026.
// Valeurs de 2025-2026 estimées (à vérifier) ; voir DECISIONS.md.
export const REVISIONS_ELEC = [
  ['2018-02-01', 0.7], ['2018-08-01', -0.5], ['2019-06-01', 7.7], ['2019-08-01', 1.3],
  ['2020-02-01', 2.4], ['2020-08-01', 1.5], ['2021-02-01', 1.6], ['2021-08-01', 0.5],
  ['2022-02-01', 4.0], ['2023-02-01', 15.0], ['2023-08-01', 10.0], ['2024-02-01', 8.6],
  ['2025-02-01', -15.0], ['2025-08-01', 0], ['2026-02-01', 0], ['2026-08-01', 0]
];
const BASE_ELEC = Date.parse('2026-08-01');

function hasard(seed, n) { // nombre normal reproductible
  let a = (seed ^ Math.imul(n, 0x9E3779B1)) | 0;
  const u = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let x = 0; while (x === 0) x = u();
  return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u());
}

/** Inflation de l'année (en %) : réelle jusqu'à 2026, tirée au hasard ensuite (2 % en moyenne). */
export function inflation(an, seed = 0) {
  if (an in INFLATION) return INFLATION[an];
  if (an < 2017) return 1.0;
  return Math.max(-0.5, Math.min(6, 2 + 1.0 * hasard(seed, an)));
}

/**
 * Indice des prix de la vie à l'instant t (1 = valeurs de 2026). Revalorisé chaque 1er janvier,
 * comme le SMIC et la plupart des loyers et salaires.
 */
export function indiceVie(t, seed = 0) {
  const an = new Date(t).getFullYear();
  let k = 1;
  if (an < ANNEE_BASE) for (let y = an + 1; y <= ANNEE_BASE; y++) k /= 1 + inflation(y, seed) / 100;
  else for (let y = ANNEE_BASE + 1; y <= an; y++) k *= 1 + inflation(y, seed) / 100;
  return k;
}

/** Révisions du tarif d'électricité : réelles dans le passé, simulées tous les 1er février et 1er août ensuite. */
function revisionsFutures(jusqua, seed) {
  const r = [];
  for (let an = 2027; an <= new Date(jusqua).getFullYear(); an++) {
    for (const [mois, n] of [['02', 1], ['08', 2]]) {
      const pct = Math.max(-10, Math.min(15, inflation(an, seed) / 2 + 3 * hasard(seed + 7, an * 10 + n)));
      r.push([`${an}-${mois}-01`, Math.round(pct * 10) / 10]);
    }
  }
  return r;
}

/** Indice du prix de l'électricité à l'instant t (1 = tarifs du 1er août 2026). */
export function indiceElec(t, seed = 0) {
  let k = 1;
  if (t < BASE_ELEC) {
    for (const [d, pct] of REVISIONS_ELEC) if (Date.parse(d) > t && Date.parse(d) <= BASE_ELEC) k /= 1 + pct / 100;
  } else {
    for (const [d, pct] of revisionsFutures(t, seed)) if (Date.parse(d) <= t) k *= 1 + pct / 100;
  }
  return k;
}
