// Sauvegarde locale de la partie (sur le téléphone).
import { DIFFICULTES, KYC_MINUTES_REEL, VERSION, reglesDe, nettoyerReglages } from './config.js';
import { etatHorloge, accelere, maintenant as tJeu } from './horloge.js';

const CLE = 'simcrypto.partie';

export function charger() {
  try {
    const t = localStorage.getItem(CLE);
    return t ? JSON.parse(t) : null;
  } catch (e) { return null; }
}

export function sauver(partie) {
  if (partie && partie.horloge && accelere()) Object.assign(partie.horloge, etatHorloge());
  try { localStorage.setItem(CLE, JSON.stringify(partie)); return true; }
  catch (e) { return false; }
}

export function effacer() {
  try { localStorage.removeItem(CLE); } catch (e) {}
}

// Première date jouable : premières paires en euros sur la plateforme (BTCEUR, janvier 2020).
export const DATE_MIN_REJEU = '2020-01-05';

/** Date de départ d'une partie à une date passée : le jour choisi, à l'heure qu'il est maintenant. */
export function dateDepart(jour, reel = Date.now()) {
  const h = new Date(reel);
  const d = new Date(jour + 'T00:00:00');
  d.setHours(h.getHours(), h.getMinutes(), h.getSeconds(), 0);
  return d.getTime();
}

export function nouvellePartie({ profil, difficulte, capital, reglages, depart }) {
  const r = nettoyerReglages(difficulte, reglages);
  const acceleree = reglesDe({ difficulte, reglages: r }).vitesseMax > 1;
  // Temps accéléré : horloge propre à la partie (vitesse réglable, pause quand l'appli est quittée).
  const horloge = acceleree ? { t: 0, vitesse: 60, pause: false } : null;
  const d = reglesDe({ difficulte, reglages: r, horloge });
  const reel = Date.now();
  const dep = depart && depart.type === 'passe' && depart.jour ? { type: 'passe', date: dateDepart(depart.jour, reel), reelLe: reel } : { type: 'direct', date: reel };
  const maintenant = dep.date;
  if (horloge) horloge.t = maintenant;
  return {
    ...(horloge ? { horloge } : {}),
    version: VERSION,
    creeLe: maintenant,
    difficulte,
    reglages: r,
    depart: dep,
    capitalDepart: capital,
    profil,
    banque: { solde: capital },
    plateforme: { statut: 'aucun', kycFin: null, soldeEUR: 0, actifs: {} },
    vie: { prochaineEcheance: maintenant + 30.44 * 864e5 / d.temps },
    historique: [{ t: maintenant, type: 'debut', texte: 'Début de la partie ' + (d.personnalisee ? '(Personnalisée, base ' + d.base + ')' : 'en ' + d.nom) + ' avec ' + capital.toLocaleString('fr-FR') + ' € en banque' + (dep.type === 'passe' ? ', le ' + new Date(dep.date).toLocaleDateString('fr-FR') + ' (rejeu du marché réel)' : '') + (horloge ? ', temps accéléré' : '') }]
  };
}

/** Vérifie qu'un objet importé ressemble à une sauvegarde de partie. Renvoie un message d'erreur ou null. */
export function validerSauvegarde(o) {
  if (!o || typeof o !== 'object') return "Ce fichier n'est pas une sauvegarde.";
  if (!DIFFICULTES[o.difficulte] || !o.profil || !o.banque || typeof o.banque.solde !== 'number' || !o.plateforme || !Array.isArray(o.historique))
    return "Ce fichier n'est pas une sauvegarde du simulateur.";
  if (!o.horloge && o.depart && o.depart.type === 'passe' && !(o.depart.reelLe > o.depart.date)) return 'Sauvegarde de rejeu incomplète.';
  return null;
}

export function demarrerKyc(partie) {
  const d = reglesDe(partie);
  const ms = d.temps >= 10 ? 0 : KYC_MINUTES_REEL * 60000 / d.temps;
  partie.plateforme.statut = ms === 0 ? 'ouvert' : 'verification';
  partie.plateforme.kycFin = tJeu() + ms;
  journal(partie, 'compte', ms === 0 ? 'Compte plateforme ouvert' : "Vérification d'identité envoyée");
}

// Passe le compte en "ouvert" si la vérification est terminée. Renvoie true si l'état a changé.
export function verifierKyc(partie) {
  const p = partie.plateforme;
  if (p.statut === 'verification' && tJeu() >= p.kycFin) {
    p.statut = 'ouvert';
    journal(partie, 'compte', 'Identité vérifiée : compte plateforme ouvert');
    return true;
  }
  return false;
}

export function journal(partie, type, texte) {
  partie.historique.unshift({ t: tJeu(), type, texte });
  if (partie.historique.length > 300) partie.historique.length = 300;
}
