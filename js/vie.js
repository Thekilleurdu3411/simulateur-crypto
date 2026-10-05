// Vie quotidienne : revenus et dépenses du joueur, calculs purs et testés.
// Sources : SMIC au 1er juin 2026 (info.gouv.fr), grille des apprentis (filiz.io), salaires nets 2026
// (moicombien.fr, salairebrut-en-net.fr), loyers de juillet 2026 (123loger.com), Périgueux (mysweetimmo,
// février 2026), alimentation (Insee, budget de famille).

export const SMIC = { brut: 1867.02, net: 1477.93 };

// Salaire minimum d'un apprenti en % du SMIC, par âge et année de contrat.
export const APPRENTI = [
  { ageMax: 17, taux: [0.27, 0.39, 0.55] },
  { ageMax: 20, taux: [0.43, 0.51, 0.67] },
  { ageMax: 25, taux: [0.53, 0.61, 0.78] },
  { ageMax: 200, taux: [1, 1, 1] }
];
export const APPRENTI_EXONERATION = 0.5;      // pas de cotisations jusqu'à 50 % du SMIC
export const COTISATIONS_SALARIALES = 0.22;   // part approximative au-delà
export const HEURES_JOB_ETUDIANT = 10;        // job étudiant de 10 h par semaine au SMIC (estimation)

// Salaires nets mensuels : [débutant, confirmé, expérimenté], chacun [min, max].
export const METIERS_SALAIRES = [
  ['Industrie', [
    ['Technicien de maintenance', [1600, 1840], [1685, 1685], [2560, 3360]],
    ['Mécanicien automobile', [1480, 1750], [1700, 2300], [2200, 3500]],
    ['Soudeur', [1500, 1700], [1700, 2250], [2250, 3400]]]],
  ['BTP', [
    ['Électricien', [1480, 1660], [1660, 2050], [2050, 4000]],
    ['Charpentier', [1480, 1700], [1600, 2000], [1800, 2100]]]],
  ['Tech et numérique', [
    ['Développeur', [2000, 2900], [2900, 4300], [3700, 5600]],
    ['Chef de projet', [2400, 3200], [3200, 3900], [3900, 5900]],
    ['Data scientist', [2400, 3200], [3200, 3800], [3800, 6500]]]],
  ['Santé et social', [
    ['Auxiliaire de puériculture', [1650, 1900], [1900, 2250], [2250, 2600]],
    ['Psychologue', [1700, 2000], [2000, 2700], [2700, 4500]],
    ['Aide à domicile', [1480, 1650], [1600, 1850], [1800, 2300]]]],
  ['Éducation', [
    ['Professeur des écoles', [1800, 2200], [2250, 2700], [2800, 4000]]]],
  ['Commerce et artisanat', [
    ['Boulanger', [1490, 1800], [1750, 2000], [2000, 3500]],
    ['Jardinier paysagiste', [1480, 1700], [1600, 2000], [1900, 3500]]]],
  ['Fonction publique', [
    ['Agent administratif', [1490, 1840], [1840, 2120], [2260, 2600]],
    ['Gendarme', [2120, 2250], [2540, 2820], [3190, 4340]],
    ['Pompier professionnel', [1750, 2100], [2100, 2600], [2600, 4500]],
    ['Facteur', [1480, 1560], [1500, 1640], [1550, 1900]]]],
  ['Services', [
    ['Agent de sécurité', [1550, 1750], [1700, 2000], [1950, 2500]],
    ['Expert-comptable', [3000, 3500], [3500, 3800], [3800, 7300]]]]
];
export const EXPERIENCES = [['debutant', 'Débutant'], ['confirme', 'Confirmé'], ['experimente', 'Expérimenté']];

// Loyer moyen d'un T2 (€ par mois). Ville absente : 12 €/m² sur 40 m², valeur de Périgueux.
export const LOYERS_T2 = {
  paris: 1602, lyon: 965, marseille: 835, bordeaux: 869, toulouse: 767, lille: 800, nantes: 715,
  nice: 1119, montpellier: 793, strasbourg: 879, rennes: 722, perigueux: 480
};
export const LOYER_M2_DEFAUT = 12;
export const FACTEUR_MAISON = 1.8;  // maison avec garage par rapport à un T2 (estimation)

export const ALIMENTATION = { econome: 250, normal: 297, confort: 375 };
export const LOISIRS = { econome: 30, normal: 100, confort: 250 };
export const FORFAITS = { internetMobile: 40, assuranceHabitation: 15 };
export const ABONNEMENT_ELEC_MOIS = { 6: 190.32 / 12, 9: 238.56 / 12, 12: 285.12 / 12 };
export const AGIOS_ANNUELS = 0.16;
export const MOIS = 30.44 * 864e5;

const normaliser = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

export function trouverMetier(nom) {
  for (const [, liste] of METIERS_SALAIRES) for (const m of liste) if (m[0] === nom) return m;
  return null;
}

/** Salaire net mensuel du profil. */
export function salaireNet(profil) {
  if (profil.situation === 'salarie') {
    const m = trouverMetier(profil.metier);
    if (!m) return SMIC.net;
    const [a, b] = m[1 + Math.max(0, EXPERIENCES.findIndex(x => x[0] === (profil.experience || 'debutant')))];
    return (a + b) / 2;
  }
  if (profil.situation === 'alternant') {
    const age = Number(profil.age) || 20;
    const ligne = APPRENTI.find(l => age <= l.ageMax);
    const brut = SMIC.brut * ligne.taux[Math.min(2, Math.max(0, (Number(profil.anneeApprentissage) || 1) - 1))];
    const seuil = SMIC.brut * APPRENTI_EXONERATION;
    return brut <= seuil ? brut : brut - (brut - seuil) * COTISATIONS_SALARIALES;
  }
  if (profil.situation === 'etudiant') return SMIC.net * HEURES_JOB_ETUDIANT / 35; // job étudiant payé au SMIC
  return 0; // sans emploi : aucun revenu
}

export function loyer(profil) {
  if (profil.logement === 'parents') return 0;
  const t2 = LOYERS_T2[normaliser(profil.ville)] ?? LOYER_M2_DEFAUT * 40;
  return profil.logement === 'maison' ? t2 * FACTEUR_MAISON : t2;
}

/** Dépenses mensuelles détaillées. */
export function depenses(profil, kva = 6) {
  const mode = profil.modeVie || 'normal';
  const chezParents = profil.logement === 'parents';
  const l = [
    ['Loyer', loyer(profil)],
    ['Alimentation', chezParents ? ALIMENTATION[mode] * 0.5 : ALIMENTATION[mode]],
    ['Loisirs et sorties', LOISIRS[mode]],
    ['Forfait mobile et internet', chezParents ? 15 : FORFAITS.internetMobile],
    ['Assurance habitation', chezParents ? 0 : FORFAITS.assuranceHabitation],
    ['Abonnement électricité', chezParents ? 0 : ABONNEMENT_ELEC_MOIS[kva] || ABONNEMENT_ELEC_MOIS[6]]
  ];
  return l.filter(([, v]) => v > 0).map(([nom, montant]) => ({ nom, montant: Math.round(montant * 100) / 100 }));
}

/**
 * Fait avancer la vie de t0 à t1 : salaire et dépenses à chaque échéance, agios sur le découvert.
 * periode : durée d'un « mois » de vie (raccourcie par la vitesse du temps de la difficulté).
 */
export function avancerVie(vie, banque, profil, t0, t1, periode, kva) {
  const evts = [];
  if (!(t1 > t0)) return evts;
  if (!vie.prochaineEcheance) vie.prochaineEcheance = t0 + periode;
  let t = t0;
  while (vie.prochaineEcheance <= t1) {
    const e = vie.prochaineEcheance;
    // Agios sur la période écoulée si le compte était à découvert
    if (banque.solde < 0) {
      const agios = Math.round(-banque.solde * AGIOS_ANNUELS * (e - t) / (365 * 864e5) * 100) / 100;
      if (agios > 0) { banque.solde -= agios; evts.push({ t: e, texte: `Agios de découvert : ${agios.toFixed(2).replace('.', ',')} €` }); }
    }
    // Changements d'emploi arrivés à échéance
    if (vie.changement && vie.changement.le <= e) {
      Object.assign(profil, vie.changement.profil);
      evts.push({ t: vie.changement.le, texte: vie.changement.texte });
      vie.changement = null;
    }
    const s = Math.round(salaireNet(profil) * 100) / 100;
    if (s > 0) { banque.solde += s; evts.push({ t: e, texte: `Salaire reçu : ${s.toFixed(2).replace('.', ',')} €` }); }
    const dep = depenses(profil, kva);
    const total = Math.round(dep.reduce((x, d) => x + d.montant, 0) * 100) / 100;
    banque.solde -= total;
    evts.push({ t: e, texte: `Dépenses du mois (loyer, courses, forfaits, loisirs) : ${total.toFixed(2).replace('.', ',')} €` + (banque.solde < 0 ? ' · compte à découvert' : '') });
    t = e;
    vie.prochaineEcheance = e + periode;
  }
  if (vie.changement && vie.changement.le <= t1) {
    Object.assign(profil, vie.changement.profil);
    evts.push({ t: vie.changement.le, texte: vie.changement.texte });
    vie.changement = null;
  }
  return evts;
}
