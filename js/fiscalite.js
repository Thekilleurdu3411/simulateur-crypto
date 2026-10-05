// Fiscalité française des actifs numériques (particulier), calculs purs et testés.
import { tmi as tmiProfil } from './vie.js';
// Plus-values : article 150 VH bis du CGI, méthode du portefeuille global (formulaire 2086).
// Minage : bénéfices non commerciaux, régime micro-BNC.

export const PFU = 0.314;                 // 12,8 % d'impôt + 18,6 % de prélèvements sociaux (revenus 2025 et suivants)
export const PFU_AVANT_2025 = 0.30;       // 12,8 % + 17,2 % de prélèvements sociaux (revenus 2018 à 2024)
export const PS_AVANT_2025 = 0.172;
export const pfu = an => (an >= 2025 ? PFU : PFU_AVANT_2025);
export const ps = an => (an >= 2025 ? PRELEVEMENTS_SOCIAUX : PS_AVANT_2025);
export const SEUIL_CESSIONS = 305;        // total annuel des cessions en dessous duquel rien n'est imposé
export const MICRO_BNC = { plafond: 77700, abattement: 0.34 };
export const PRELEVEMENTS_SOCIAUX = 0.186;
export const MAJORATION_RETARD = 0.10;
export const INTERET_RETARD_MOIS = 0.002;

// Tranche marginale par défaut (tests) ; en jeu, elle est calculée à partir du salaire (voir vie.js).
export const TMI_PAR_SITUATION = { sans: 0, etudiant: 0, alternant: 0, salarie: 0.11 };

export function fiscDe(partie) {
  return partie.fisc || (partie.fisc = { pta: 0, cessions: [], minage: [], declarations: {}, preleve: {} });
}

// Achat de cryptos contre des euros (frais compris) ou réception de cryptos minées (valeur du jour).
export function acquisition(fisc, eur, t, nature = 'achat') {
  fisc.pta += eur;
  if (nature === 'minage') fisc.minage.push({ t, eur });
}

/**
 * Cession imposable (crypto contre euros). prix : euros reçus, frais déduits.
 * valeurGlobale : valeur de TOUS les actifs numériques détenus juste avant la cession.
 */
export function cession(fisc, prix, valeurGlobale, t) {
  const vg = Math.max(valeurGlobale, prix);
  const fraction = vg > 0 ? fisc.pta * prix / vg : 0;
  const pv = prix - fraction;
  fisc.cessions.push({ t, prix, valeurGlobale: vg, ptaAvant: fisc.pta, fraction, pv });
  fisc.pta = Math.max(0, fisc.pta - fraction);
  return pv;
}

const annee = t => new Date(t).getFullYear();

/** Bilan d'une année civile. */
export function bilan(fisc, an, situation) {
  const cessions = fisc.cessions.filter(c => annee(c.t) === an);
  const totalCessions = cessions.reduce((s, c) => s + c.prix, 0);
  const pvNette = cessions.reduce((s, c) => s + c.pv, 0);
  const exonere = totalCessions <= SEUIL_CESSIONS;
  const impotPV = exonere || pvNette <= 0 ? 0 : pvNette * pfu(an);
  const recettes = fisc.minage.filter(m => annee(m.t) === an).reduce((s, m) => s + m.eur, 0);
  const microBNC = recettes <= MICRO_BNC.plafond;
  const base = recettes * (1 - MICRO_BNC.abattement); // au-delà du plafond, il faudrait le régime réel (non simulé)
  const tmi = situation && typeof situation === 'object' ? tmiProfil(situation) : (TMI_PAR_SITUATION[situation] ?? 0.11);
  const ir = base * tmi, psm = base * ps(an);
  return {
    annee: an, nbCessions: cessions.length, totalCessions, pvNette, exonere, impotPV,
    recettesMinage: recettes, microBNC, baseBNC: base, tmi, irMinage: ir, psMinage: psm,
    total: impotPV + ir + psm
  };
}

// Calendrier : déclaration au printemps de l'année suivante, paiement du solde en septembre.
export function calendrier(an) {
  return {
    ouverture: new Date(an + 1, 3, 10).getTime(),   // 10 avril
    limite: new Date(an + 1, 5, 4, 23, 59).getTime(), // 4 juin (zone 2, départements 20 à 54)
    paiement: new Date(an + 1, 8, 15).getTime()      // 15 septembre
  };
}

/**
 * Montant dû après comparaison de la déclaration du joueur avec la réalité.
 * declare : { pv, recettes } saisis par le joueur (ou null s'il n'a rien déclaré à temps).
 */
export function redressement(reel, declare, situation, moisRetard) {
  if (!declare) return { du: reel.total * (1 + MAJORATION_RETARD), motif: 'Déclaration absente à la date limite : majoration de 10 %.' };
  const declarePV = declare.pv > 0 && reel.totalCessions > SEUIL_CESSIONS ? declare.pv * pfu(reel.annee) : 0;
  const base = Math.max(0, declare.recettes) * (1 - MICRO_BNC.abattement);
  const declareMinage = base * ((reel.tmi ?? (typeof situation === 'string' ? TMI_PAR_SITUATION[situation] : null) ?? 0.11) + ps(reel.annee));
  const declareTotal = declarePV + declareMinage;
  const manque = Math.max(0, reel.total - declareTotal);
  if (manque < 1) return { du: reel.total, motif: null };
  const interets = manque * INTERET_RETARD_MOIS * Math.max(1, moisRetard);
  return { du: reel.total + interets, motif: `Erreur dans ta déclaration : ${Math.round(manque)} € d'impôt manquant redressé, avec intérêts de retard.` };
}
