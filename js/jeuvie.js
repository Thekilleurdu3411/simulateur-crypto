// Vie quotidienne dans la partie : échéances mensuelles, changements d'emploi.
import { DIFFICULTES } from './config.js';
import { avancerVie, MOIS, trouverMetier } from './vie.js';
import { COMPTEUR } from './minage.js';
import { journal } from './state.js';

export function periode(partie) { return MOIS / DIFFICULTES[partie.difficulte].temps; }

export function vieDe(partie) {
  if (!partie.vie) partie.vie = { prochaineEcheance: Date.now() + periode(partie) };
  if (!partie.vie.dernierCalcul) partie.vie.dernierCalcul = Date.now();
  return partie.vie;
}

export function avancerViePartie(partie, maintenant = Date.now()) {
  const v = vieDe(partie);
  const kva = partie.minage ? partie.minage.contrat.kva : (COMPTEUR[partie.profil.logement] || 6);
  const evts = avancerVie(v, partie.banque, partie.profil, v.dernierCalcul, maintenant, periode(partie), kva);
  v.dernierCalcul = maintenant;
  for (const e of evts) partie.historique.unshift({ t: e.t, type: 'vie', texte: e.texte });
  if (evts.length) partie.historique.sort((a, b) => b.t - a.t);
  return evts.map(e => e.texte);
}

/** Change de situation : préavis ou recherche d'un mois (raccourci par la vitesse du temps). */
export function changerSituation(partie, situation, metier, experience, anneeApprentissage) {
  const v = vieDe(partie);
  const p = partie.profil;
  if (situation === p.situation && metier === p.metier && experience === p.experience) return { erreur: 'C\'est déjà ta situation.' };
  if ((situation === 'salarie' || situation === 'alternant') && !trouverMetier(metier) && situation === 'salarie') return { erreur: 'Choisis un métier.' };
  const delai = periode(partie);
  const libelle = situation === 'salarie' ? `${metier} (${experience === 'experimente' ? 'expérimenté' : experience === 'confirme' ? 'confirmé' : 'débutant'})`
    : situation === 'alternant' ? `alternance${metier ? ' (' + metier + ')' : ''}` : situation === 'etudiant' ? 'études' : 'sans emploi';
  v.changement = { le: Date.now() + delai, profil: { situation, metier, experience, anneeApprentissage }, texte: situation === 'sans' ? 'Fin de ton préavis : tu es sans emploi.' : `Tu commences : ${libelle}.` };
  journal(partie, 'vie', situation === 'sans' ? 'Démission envoyée : préavis d\'un mois.' : `Nouvelle situation trouvée : ${libelle}, début dans un mois.`);
  return { le: v.changement.le };
}

export function annulerChangement(partie) {
  const v = vieDe(partie);
  if (!v.changement) return;
  v.changement = null;
  journal(partie, 'vie', 'Changement de situation annulé.');
}
