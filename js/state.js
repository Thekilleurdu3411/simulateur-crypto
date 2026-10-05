// Sauvegarde locale de la partie (sur le téléphone).
import { KYC_MINUTES_REEL, VERSION, reglesDe, nettoyerReglages } from './config.js';

const CLE = 'simcrypto.partie';

export function charger() {
  try {
    const t = localStorage.getItem(CLE);
    return t ? JSON.parse(t) : null;
  } catch (e) { return null; }
}

export function sauver(partie) {
  try { localStorage.setItem(CLE, JSON.stringify(partie)); return true; }
  catch (e) { return false; }
}

export function effacer() {
  try { localStorage.removeItem(CLE); } catch (e) {}
}

export function nouvellePartie({ profil, difficulte, capital, reglages }) {
  const r = nettoyerReglages(difficulte, reglages);
  const d = reglesDe({ difficulte, reglages: r });
  const maintenant = Date.now();
  return {
    version: VERSION,
    creeLe: maintenant,
    difficulte,
    reglages: r,
    depart: { type: 'direct', date: maintenant },
    capitalDepart: capital,
    profil,
    banque: { solde: capital },
    plateforme: { statut: 'aucun', kycFin: null, soldeEUR: 0, actifs: {} },
    vie: { prochaineEcheance: maintenant + 30.44 * 864e5 / d.temps },
    historique: [{ t: maintenant, type: 'debut', texte: 'Début de la partie ' + (d.personnalisee ? '(Personnalisée, base ' + d.base + ')' : 'en ' + d.nom) + ' avec ' + capital.toLocaleString('fr-FR') + ' € en banque' }]
  };
}

export function demarrerKyc(partie) {
  const d = reglesDe(partie);
  const ms = d.temps >= 10 ? 0 : KYC_MINUTES_REEL * 60000 / d.temps;
  partie.plateforme.statut = ms === 0 ? 'ouvert' : 'verification';
  partie.plateforme.kycFin = Date.now() + ms;
  journal(partie, 'compte', ms === 0 ? 'Compte plateforme ouvert' : "Vérification d'identité envoyée");
}

// Passe le compte en "ouvert" si la vérification est terminée. Renvoie true si l'état a changé.
export function verifierKyc(partie) {
  const p = partie.plateforme;
  if (p.statut === 'verification' && Date.now() >= p.kycFin) {
    p.statut = 'ouvert';
    journal(partie, 'compte', 'Identité vérifiée : compte plateforme ouvert');
    return true;
  }
  return false;
}

export function journal(partie, type, texte) {
  partie.historique.unshift({ t: Date.now(), type, texte });
  if (partie.historique.length > 300) partie.historique.length = 300;
}
