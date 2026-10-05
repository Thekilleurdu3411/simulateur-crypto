// Ordres en attente : limite, stop-limit et OCO.
// Fonctions pures, testées : aucune lecture du réseau ni de la sauvegarde.
//
// Règle de réalisme : un ordre limite ne s'exécute que si de vraies transactions
// TRAVERSENT son prix. Un prix simplement touché ne suffit pas (la file d'attente
// au même prix n'est pas forcément arrivée jusqu'à toi).
// Un stop se déclenche dès que le prix atteint le seuil, comme sur une vraie plateforme.

import { arrondirPas, decimalesPas } from './engine.js';

export const TYPES = { limite: 'Limite', stop: 'Stop-limit', oco: 'OCO' };

export function arrondirPrix(p, tick) {
  const t = Number(tick);
  if (!t) return p;
  return Number((Math.round(p / t) * t).toFixed(decimalesPas(tick)));
}

/**
 * Vérifie et prépare un ordre. Renvoie { erreur } ou { ordre } prêt à être réservé.
 * marche : { bid, ask } meilleurs prix actuels. regles : { pas, tick, minNotional }.
 */
export function preparerOrdre(p, marche, regles) {
  const q = arrondirPas(p.qte, regles.pas);
  if (!(q > 0)) return { erreur: 'Quantité trop faible pour la plus petite quantité autorisée.' };
  const r = v => (v > 0 ? arrondirPrix(v, regles.tick) : 0);
  const prix = r(p.prix), stop = r(p.stop), limiteStop = r(p.limiteStop);
  const achat = p.sens === 'achat';
  const { bid, ask } = marche;

  if (p.type === 'limite') {
    if (!prix) return { erreur: 'Indique un prix limite.' };
    if (achat && prix >= ask) return { erreur: "À ce prix, l'ordre s'exécuterait tout de suite. Utilise un ordre au marché ou baisse le prix." };
    if (!achat && prix <= bid) return { erreur: "À ce prix, l'ordre s'exécuterait tout de suite. Utilise un ordre au marché ou monte le prix." };
  } else if (p.type === 'stop') {
    if (!stop || !limiteStop) return { erreur: 'Indique le prix de déclenchement et le prix limite.' };
    if (achat && stop <= ask) return { erreur: "Pour un stop d'achat, le déclenchement doit être au-dessus du prix actuel." };
    if (!achat && stop >= bid) return { erreur: 'Pour un stop de vente, le déclenchement doit être en dessous du prix actuel.' };
  } else if (p.type === 'oco') {
    if (!prix || !stop || !limiteStop) return { erreur: 'Indique le prix limite, le déclenchement et la limite du stop.' };
    if (achat && !(prix < bid && stop > ask)) return { erreur: "OCO d'achat : le prix limite doit être sous le prix actuel et le déclenchement au-dessus." };
    if (!achat && !(prix > ask && stop < bid)) return { erreur: 'OCO de vente : le prix limite doit être au-dessus du prix actuel et le déclenchement en dessous.' };
  } else return { erreur: "Type d'ordre inconnu." };

  const prixMin = Math.min(...[prix, limiteStop].filter(Boolean));
  if (q * prixMin < regles.minNotional) return { erreur: 'Montant minimum par ordre : ' + regles.minNotional + ' €.' };

  return {
    ordre: {
      s: p.s, base: p.base, sens: p.sens, type: p.type, qte: q,
      prix: prix || null, stop: stop || null, limiteStop: limiteStop || null,
      declenche: false, creeLe: p.maintenant
    }
  };
}

// Montant en euros bloqué pour un ordre d'achat (le pire cas des deux jambes pour un OCO).
export function reserveAchat(o) {
  return o.qte * Math.max(o.prix || 0, o.limiteStop || 0);
}

/**
 * Évalue un ordre sur une période de prix.
 * periode : { haut, bas, cloture, partielle }
 *   partielle = la période contient l'instant où l'ordre a été créé : on ne connaît pas l'ordre
 *   des transactions avant et après, donc seule la clôture compte (prudence).
 * Renvoie null, { declenche: true } ou { execute: true, prix, jambe }.
 * Peut passer o.declenche à true (stop atteint).
 */
export function evaluer(o, periode) {
  const haut = periode.partielle ? periode.cloture : periode.haut;
  const bas = periode.partielle ? periode.cloture : periode.bas;
  const achat = o.sens === 'achat';
  const traverseLimite = (px, h, b) => achat ? b < px : h > px;

  // Jambe stop (stop-limit, ou jambe stop d'un OCO). Vérifiée en premier : en cas de doute, le pire arrive.
  if ((o.type === 'stop' || o.type === 'oco') && !o.declenche) {
    const atteint = achat ? haut >= o.stop : bas <= o.stop;
    if (atteint) {
      o.declenche = true;
      // Après le déclenchement, seule la clôture de la même période peut remplir la limite.
      if (traverseLimite(o.limiteStop, periode.cloture, periode.cloture)) return { execute: true, prix: o.limiteStop, jambe: 'stop' };
      return { declenche: true };
    }
  } else if ((o.type === 'stop' || o.type === 'oco') && o.declenche) {
    if (traverseLimite(o.limiteStop, haut, bas)) return { execute: true, prix: o.limiteStop, jambe: 'stop' };
    return null;
  }

  // Jambe limite (ordre limite, ou jambe limite d'un OCO tant que le stop n'est pas déclenché).
  if (o.type === 'limite' || (o.type === 'oco' && !o.declenche)) {
    if (traverseLimite(o.prix, haut, bas)) return { execute: true, prix: o.prix, jambe: 'limite' };
  }
  return null;
}

export function descriptionOrdre(o, fmtPrix, fmtQte) {
  const s = (o.sens === 'achat' ? 'Achat ' : 'Vente ') + fmtQte(o.qte) + ' ' + o.base;
  if (o.type === 'limite') return s + ' à ' + fmtPrix(o.prix) + ' €';
  if (o.type === 'stop') return s + ' · stop ' + fmtPrix(o.stop) + ' € → limite ' + fmtPrix(o.limiteStop) + ' €';
  return s + ' · OCO ' + fmtPrix(o.prix) + ' € / stop ' + fmtPrix(o.stop) + ' €';
}
