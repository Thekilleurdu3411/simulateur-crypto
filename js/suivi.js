// Suivi des ordres en attente : en direct (bougies d'une minute) et rattrapage
// de la période où l'appli était fermée, avec les vraies bougies du marché.
import { evaluer, descriptionOrdre } from './orders.js';
import { executerOrdre, ordresDe } from './portefeuille.js';
import { journal } from './state.js';
import { prix as fp, qte as fq } from './format.js';
import { maintenant as tJeu } from './horloge.js';

const JOUR = 864e5;

/**
 * Applique une période de prix (bougie) aux ordres d'une paire.
 * periode : { debut, fin, haut, bas, cloture }. Renvoie les textes des événements.
 */
export function traiterPeriode(partie, s, periode, tauxFrais) {
  const evts = [];
  for (const o of ordresDe(partie).filter(x => x.s === s)) {
    if (o.creeLe >= periode.fin) continue;
    const partielle = o.creeLe > periode.debut || (o.declencheLe && o.declencheLe > periode.debut);
    const avant = o.declenche;
    const r = evaluer(o, { haut: periode.haut, bas: periode.bas, cloture: periode.cloture, partielle });
    if (o.declenche && !avant) {
      o.declencheLe = Math.max(periode.debut + 1, Math.min(tJeu(), periode.fin - 1));
      const t = 'Stop déclenché : ' + descriptionOrdre(o, fp, fq);
      journal(partie, 'ordre', t);
      evts.push(t);
    }
    if (r && r.execute) {
      const t = Math.min(tJeu(), periode.fin - 1);
      evts.push(executerOrdre(partie, o, r.prix, tauxFrais, t));
    }
  }
  return evts;
}

/** Rejoue les bougies réelles depuis le dernier suivi. Renvoie { evenements } ou { erreur }. */
export async function rattraper(partie, marche, tauxFrais) {
  const ordres = ordresDe(partie);
  const pl = partie.plateforme;
  const maintenant = tJeu();
  if (!ordres.length) { pl.suiviJusqua = maintenant; return { evenements: [] }; }
  const depuis = Math.max(pl.suiviJusqua || 0, Math.min(...ordres.map(o => o.creeLe)));
  if (maintenant - depuis < 60000) return { evenements: [] };
  // Jusqu'à 3 jours : bougies d'une minute. Au-delà : bougies d'une heure (moins fines, mais même règle).
  const intervalle = maintenant - depuis <= 3 * JOUR ? '1m' : '1h';
  const duree = intervalle === '1m' ? 6e4 : 36e5;
  const symboles = [...new Set(ordres.map(o => o.s))];
  const evenements = [];
  try {
    const series = await Promise.all(symboles.map(s => marche.bougiesPeriode(s, intervalle, depuis - duree, maintenant)));
    symboles.forEach((s, i) => {
      for (const b of series[i]) {
        evenements.push(...traiterPeriode(partie, s, { debut: b.t, fin: b.t + duree, haut: b.h, bas: b.l, cloture: b.c }, tauxFrais));
      }
    });
  } catch (e) {
    return { erreur: 'Rattrapage impossible pour le moment (connexion au marché).' };
  }
  pl.suiviJusqua = maintenant;
  return { evenements };
}
