// Mouvements sur le compte plateforme : exécutions au marché, ordres en attente, réservations.
import { reserveAchat } from './orders.js';
import { journal } from './state.js';
import { eur, prix as fp, qte as fq } from './format.js';
import { descriptionOrdre } from './orders.js';

function actif(pl, base) { return pl.actifs[base] || (pl.actifs[base] = { qte: 0, cout: 0 }); }
function nettoyer(pl, base) { const a = pl.actifs[base]; if (a && a.qte <= 1e-12) delete pl.actifs[base]; }

export function ordresDe(partie) { return partie.plateforme.ordres || (partie.plateforme.ordres = []); }

export function appliquerAchat(partie, base, qteNette, cout) {
  const pl = partie.plateforme;
  pl.soldeEUR = Math.max(0, pl.soldeEUR - cout);
  const a = actif(pl, base);
  a.qte += qteNette; a.cout += cout;
}

// Vend une quantité dont le coût de revient est fourni (coutPart). Renvoie la plus-value.
function encaisserVente(partie, base, quantite, recuNet, coutPart, t) {
  partie.plateforme.soldeEUR += recuNet;
  (partie.cessions || (partie.cessions = [])).push({ t, base, quantite, recu: recuNet, cout: coutPart });
  return recuNet - coutPart;
}

export function appliquerVente(partie, base, quantite, recuNet) {
  const a = partie.plateforme.actifs[base];
  const part = Math.min(1, quantite / a.qte);
  const coutPart = a.cout * part;
  a.qte -= quantite; a.cout -= coutPart;
  nettoyer(partie.plateforme, base);
  return encaisserVente(partie, base, quantite, recuNet, coutPart, Date.now());
}

/** Bloque les fonds d'un ordre et l'ajoute à la liste. Renvoie { erreur } ou { ordre }. */
export function placerOrdre(partie, o) {
  const pl = partie.plateforme;
  if (o.sens === 'achat') {
    const r = reserveAchat(o);
    if (r > pl.soldeEUR + 1e-9) return { erreur: 'Solde insuffisant : cet ordre bloque ' + eur(r) + ', tu as ' + eur(pl.soldeEUR) + '.' };
    pl.soldeEUR -= r;
    o.reserve = { eur: r };
  } else {
    const a = pl.actifs[o.base];
    if (!a || a.qte + 1e-12 < o.qte) return { erreur: 'Tu ne possèdes que ' + fq(a ? a.qte : 0) + ' ' + o.base + ' disponibles.' };
    const cout = a.cout * Math.min(1, o.qte / a.qte);
    a.qte -= o.qte; a.cout -= cout;
    nettoyer(pl, o.base);
    o.reserve = { qte: o.qte, cout };
  }
  o.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ordresDe(partie).push(o);
  journal(partie, 'ordre', 'Ordre placé : ' + descriptionOrdre(o, fp, fq));
  return { ordre: o };
}

function retirer(partie, id) {
  const l = ordresDe(partie);
  const i = l.findIndex(x => x.id === id);
  return i >= 0 ? l.splice(i, 1)[0] : null;
}

function rendreReserve(partie, o) {
  const pl = partie.plateforme;
  if (o.reserve.eur != null) pl.soldeEUR += o.reserve.eur;
  else { const a = actif(pl, o.base); a.qte += o.reserve.qte; a.cout += o.reserve.cout; }
}

export function annulerOrdre(partie, id) {
  const o = retirer(partie, id);
  if (!o) return false;
  rendreReserve(partie, o);
  journal(partie, 'ordre', 'Ordre annulé : ' + descriptionOrdre(o, fp, fq));
  return true;
}

/** Exécute entièrement un ordre en attente au prix donné. Renvoie un texte pour le journal. */
export function executerOrdre(partie, o, px, tauxFrais, t) {
  retirer(partie, o.id);
  const pl = partie.plateforme;
  const montant = o.qte * px;
  let texte;
  if (o.sens === 'achat') {
    const frais = o.qte * tauxFrais;
    pl.soldeEUR += o.reserve.eur - montant; // rend la part non utilisée
    const a = actif(pl, o.base);
    a.qte += o.qte - frais; a.cout += montant;
    texte = `Ordre exécuté : achat de ${fq(o.qte - frais)} ${o.base} à ${fp(px)} € (${eur(montant)})`;
  } else {
    const recu = montant * (1 - tauxFrais);
    const pv = encaisserVente(partie, o.base, o.qte, recu, o.reserve.cout, t);
    texte = `Ordre exécuté : vente de ${fq(o.qte)} ${o.base} à ${fp(px)} € (${eur(recu)} reçus, ${pv >= 0 ? 'plus' : 'moins'}-value ${eur(Math.abs(pv))})`;
  }
  partie.historique.unshift({ t, type: o.sens === 'achat' ? 'achat' : 'vente', texte });
  return texte;
}

// Valeurs bloquées dans les ordres en attente.
export function valeurReservee(partie, prixDe) {
  let eurs = 0, cryptos = 0;
  for (const o of ordresDe(partie)) {
    if (o.reserve.eur != null) eurs += o.reserve.eur;
    else { const p = prixDe(o.base); if (p) cryptos += o.reserve.qte * p; }
  }
  return { eurs, cryptos };
}
