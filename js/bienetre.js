// Jauges de vie (santé, énergie, moral, stress) et activités. Calculs purs et testés.
// Chaque jour de jeu, le travail, le trading, l'argent et le mode de vie font bouger les jauges ;
// les activités les remontent. Des jauges trop basses ont des conséquences (arrêt, burn-out, erreurs).

export const JAUGES = [['sante', 'Santé'], ['energie', 'Énergie'], ['moral', 'Moral'], ['stress', 'Stress']];
export const JOUR = 864e5;

// Pénibilité physique et pression mentale par secteur (0 à 2).
export const PENIBILITE = {
  Industrie: [1.5, 0.8], BTP: [2, 0.8], 'Tech et numérique': [0.3, 1.2], 'Santé et social': [1.3, 1.5], Éducation: [0.6, 1.3],
  'Commerce et artisanat': [1.2, 0.9], 'Fonction publique': [0.8, 0.9], Services: [0.6, 1], 'Transport et logistique': [1.3, 0.9],
  'Hôtellerie-restauration': [1.6, 1.1], Agriculture: [1.8, 0.7], 'Banque-finance-assurance': [0.3, 1.7], 'Communication et arts': [0.4, 1.1],
  Droit: [0.3, 1.7], 'Sport et animation': [1.8, 0.9], "Direction d'entreprise": [0.4, 2]
};

// Activités : coût (€), effets, délai conseillé entre deux fois (jours), durée (jours), congés utilisés.
export const ACTIVITES = [
  { id: 'footing', nom: 'Footing', cout: 0, effets: { energie: -3, sante: 1.5, stress: -6, moral: 3 }, delai: 1 },
  { id: 'salle', nom: 'Séance de sport', cout: 0, effets: { energie: -2, sante: 2, stress: -8, moral: 3 }, delai: 1, abonnement: true },
  { id: 'meditation', nom: 'Méditation', cout: 0, effets: { stress: -8, energie: 2 }, delai: 1 },
  { id: 'dodo', nom: 'Grasse matinée', cout: 0, effets: { energie: 12, stress: -3 }, delai: 3 },
  { id: 'jeux', nom: 'Soirée jeux vidéo', cout: 0, effets: { moral: 3, energie: -3, stress: -2 }, delai: 1 },
  { id: 'lecture', nom: 'Lire, se cultiver', cout: 15, effets: { stress: -4, moral: 2 }, delai: 1 },
  { id: 'cinema', nom: 'Cinéma', cout: 12, effets: { moral: 4, stress: -3 }, delai: 1 },
  { id: 'amis', nom: 'Sortie entre amis', cout: 40, effets: { moral: 8, stress: -6, energie: -4 }, delai: 2 },
  { id: 'resto', nom: 'Restaurant', cout: 60, effets: { moral: 6, stress: -4 }, delai: 2 },
  { id: 'benevolat', nom: 'Bénévolat', cout: 0, effets: { moral: 10, energie: -5, stress: -3 }, delai: 7 },
  { id: 'concert', nom: 'Concert ou festival', cout: 70, effets: { moral: 12, energie: -6, stress: -6 }, delai: 14 },
  { id: 'spa', nom: 'Spa et massage', cout: 90, effets: { stress: -15, energie: 8, moral: 6 }, delai: 14 },
  { id: 'medecin', nom: 'Consultation chez le médecin', cout: 9, effets: { sante: 8 }, delai: 14, note: '30 €, remboursés en partie' },
  { id: 'psy', nom: 'Séance chez un psychologue', cout: 60, effets: { stress: -15, moral: 8 }, delai: 7 },
  { id: 'weekend', nom: 'Week-end à la mer ou à la montagne', cout: 350, effets: { moral: 15, stress: -20, energie: 10 }, delai: 14, duree: 2 },
  { id: 'vacances', nom: 'Une semaine de vacances en France', cout: 900, effets: { moral: 25, stress: -40, energie: 30, sante: 5 }, delai: 60, duree: 7, conges: 5 },
  { id: 'voyage', nom: "Deux semaines de voyage à l'étranger", cout: 2500, effets: { moral: 35, stress: -55, energie: 40, sante: 8 }, delai: 120, duree: 14, conges: 10 }
];
export const ABONNEMENT_SPORT = 35; // € par mois
export const CONGES_PAR_MOIS = 25 / 12;

const borne = x => Math.max(0, Math.min(100, x));

export function nouvellesJauges(t) { return { sante: 80, energie: 75, moral: 65, stress: 30, maj: t, stressHaut: 0, moralBas: 0, faites: {} }; }

/**
 * Applique une activité. Renvoie { erreur } ou { effets, cout, duree }.
 * Refaire la même activité avant son délai ne donne que la moitié des effets.
 */
export function faireActivite(j, a, t, { solde = Infinity, abonnementSport = false, conges = Infinity, enArret = false } = {}) {
  if (a.abonnement && !abonnementSport) return { erreur: "Il faut un abonnement à la salle de sport." };
  if (a.cout > solde) return { erreur: 'Pas assez d\'argent sur ton compte.' };
  if (a.conges && conges < a.conges) return { erreur: `Il te faut ${a.conges} jours de congés.` };
  if (j.vacancesJusqua && t < j.vacancesJusqua) return { erreur: 'Tu es déjà en vacances.' };
  const derniere = j.faites[a.id];
  const k = derniere != null && t - derniere < a.delai * JOUR ? 0.5 : 1;
  const effets = {};
  for (const [cle, v] of Object.entries(a.effets)) {
    if (cle === 'sante' && a.id === 'medecin' && j.sante >= 70) { effets.sante = 1; continue; }
    effets[cle] = v * k;
    j[cle] = borne(j[cle] + v * k);
  }
  j.faites[a.id] = t;
  if (a.duree) j.vacancesJusqua = t + a.duree * JOUR;
  return { effets, cout: a.cout, duree: a.duree || 0, moitie: k < 1 };
}

/**
 * Une journée de vie. ctx : { travaille, secteur, heuresSup, etudiant, chomage, decouvert, modeVie, trades,
 * variation (évolution du patrimoine sur la journée, en fraction), sport, weekend, enArret, rnd }.
 * Renvoie { evts: [textes], arret: jours (0 si aucun), burnout: bool }.
 */
export function unJour(j, ctx, rnd = Math.random) {
  const evts = [];
  const vacances = j.vacancesJusqua && ctx.t < j.vacancesJusqua;
  const [phys, ment] = PENIBILITE[ctx.secteur] || [0.8, 1];
  // Récupération de base (sommeil, retour vers l'équilibre)
  j.energie += 6;
  j.stress -= 2 + (j.stress - 20) * 0.02;
  j.moral += (60 - j.moral) * 0.03;
  j.sante += j.energie > 40 && j.stress < 60 ? 0.3 : -0.4;
  if (vacances) { j.energie += 4; j.stress -= 4; j.moral += 1.5; }
  else if (ctx.travaille && !ctx.weekend && !ctx.enArret) {
    j.energie -= 6.5 + phys * 3 + (ctx.heuresSup || 0) * 0.6;
    j.stress += 1 + ment * 2 + (ctx.heuresSup || 0) * 0.3;
  } else if (ctx.etudiant && !ctx.weekend) { j.energie -= 5; j.stress += 1.5; }
  if (ctx.weekend && !vacances) { j.energie += 4; j.stress -= 2; }
  if (ctx.modeVie === 'econome') j.moral -= 0.3; else if (ctx.modeVie === 'confort') j.moral += 0.3;
  if (ctx.decouvert) { j.stress += 1.5; j.moral -= 0.5; }
  if (ctx.chomage) { j.moral -= 0.4; j.stress += 0.5; }
  if (ctx.sport) { j.sante += 0.15; j.energie += 0.5; j.stress -= 0.5; }
  // Trading : chaque opération stresse et fatigue un peu, les grosses variations de patrimoine aussi
  if (ctx.trades) { j.stress += Math.min(6, ctx.trades * 0.8); j.energie -= Math.min(4, ctx.trades * 0.3); }
  if (ctx.variation) {
    j.moral += Math.max(-8, Math.min(6, ctx.variation * 80));
    if (ctx.variation < -0.05) { j.stress += 4; evts.push('Grosse perte sur ton patrimoine aujourd\'hui : le moral en prend un coup.'); }
  }
  for (const [k] of JAUGES) j[k] = borne(j[k]);
  // Conséquences
  let arret = 0, burnout = false;
  if (j.stress >= 85) j.stressHaut++; else j.stressHaut = Math.max(0, j.stressHaut - 1);
  if (j.moral < 15) j.moralBas++; else j.moralBas = 0;
  if (j.stressHaut >= 14 && !ctx.enArret) {
    burnout = true; arret = 30 + Math.round(rnd() * 60); j.stressHaut = 0;
    j.moral = borne(j.moral - 20); j.stress = 60; j.energie = 30;
    evts.push(`Burn-out : ton médecin t'arrête ${arret} jours. Il faut lever le pied.`);
  } else if (j.sante < 25 && !ctx.enArret && rnd() < 0.05) {
    arret = 7 + Math.round(rnd() * 7);
    j.sante = borne(j.sante + 15);
    evts.push(`Tu tombes malade : ${arret} jours d'arrêt. Ta santé était trop basse.`);
  }
  if (j.moralBas === 30) evts.push('Tu déprimes depuis un mois. Une sortie, du sport, des vacances ou un psychologue aideraient.');
  if (j.energie < 15 && rnd() < 0.15) evts.push('Tu es épuisé : tes décisions de trading en pâtissent.');
  return { evts, arret, burnout };
}

/** Épuisé : le trading coûte plus cher (erreurs, mauvais timing). Pénalité ajoutée aux frais. */
export function penaliteFatigue(j) { return j && j.energie < 15 ? 0.005 : 0; }
/** Bonus (ou malus) de réussite d'une demande d'augmentation selon le moral et l'énergie. */
export function bonusAugmentation(j) { return j ? (j.moral - 50) / 200 + (j.energie - 50) / 300 : 0; }
