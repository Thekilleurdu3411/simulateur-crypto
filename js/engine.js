// Moteur d'exécution des ordres au marché.
// Fonctions pures : elles ne lisent ni le réseau ni la sauvegarde, ce qui les rend testables.

// Nombre de décimales d'un pas de quantité ("0.00001000" -> 5).
export function decimalesPas(pas) {
  const s = String(pas);
  if (!s.includes('.')) return 0;
  return s.replace(/0+$/, '').split('.')[1].length;
}

// Arrondit une quantité vers le bas au pas autorisé par la plateforme.
export function arrondirPas(q, pas) {
  const p = Number(pas);
  if (!p) return q;
  const d = decimalesPas(pas);
  return Number((Math.floor(q / p + 1e-9) * p).toFixed(d));
}

// Parcourt un côté du carnet pour une quantité donnée.
// niveaux : [[prix, qte], ...] triés du meilleur au moins bon.
function parcourir(niveaux, quantite) {
  let reste = quantite, total = 0;
  for (const [p, q] of niveaux) {
    const pris = Math.min(q, reste);
    total += pris * p;
    reste -= pris;
    if (reste <= 1e-12) break;
  }
  return { rempli: quantite - Math.max(reste, 0), montant: total, complet: reste <= 1e-12 };
}

// Quantité maximale achetable avec un budget en euros, en remontant les offres de vente.
function quantitePourBudget(asks, budget) {
  let reste = budget, qte = 0;
  for (const [p, q] of asks) {
    const cout = p * q;
    if (cout <= reste) { qte += q; reste -= cout; }
    else { qte += reste / p; reste = 0; break; }
  }
  return { qte, complet: reste <= 1e-9 };
}

/**
 * Achat au marché pour un montant en euros.
 * mode : 'milieu' (prix moyen entre achat et vente, sans glissement),
 *        'meilleur' (meilleure offre, sans glissement),
 *        'carnet' (on consomme le vrai carnet, avec glissement).
 * Les frais sont prélevés sur la crypto reçue, comme sur une vraie plateforme.
 */
export function acheterAuMarche({ budget, carnet, mode, tauxFrais, pas, minNotional }) {
  const asks = carnet.asks, bids = carnet.bids;
  if (!asks.length || !bids.length) return { erreur: 'Carnet d\'ordres indisponible. Réessaie dans un instant.' };
  const meilleur = asks[0][0];
  let qteBrute, cout, prixMoyen;

  if (mode === 'carnet') {
    const r = quantitePourBudget(asks, budget);
    if (!r.complet) return { erreur: 'Pas assez de liquidité dans le carnet pour ce montant.' };
    qteBrute = arrondirPas(r.qte, pas);
    const w = parcourir(asks, qteBrute);
    cout = w.montant;
  } else {
    prixMoyen = mode === 'milieu' ? (asks[0][0] + bids[0][0]) / 2 : meilleur;
    qteBrute = arrondirPas(budget / prixMoyen, pas);
    cout = qteBrute * prixMoyen;
  }
  if (qteBrute <= 0) return { erreur: 'Montant trop faible pour acheter la plus petite quantité autorisée.' };
  if (cout < minNotional) return { erreur: 'Montant minimum par ordre : ' + minNotional + ' €.' };
  prixMoyen = cout / qteBrute;
  const frais = qteBrute * tauxFrais;
  return {
    qteBrute, qteNette: qteBrute - frais, frais, cout, prixMoyen,
    meilleurPrix: meilleur, glissement: prixMoyen / meilleur - 1
  };
}

/** Vente au marché d'une quantité de crypto. Les frais sont prélevés sur les euros reçus. */
export function vendreAuMarche({ quantite, carnet, mode, tauxFrais, pas, minNotional }) {
  const asks = carnet.asks, bids = carnet.bids;
  if (!asks.length || !bids.length) return { erreur: 'Carnet d\'ordres indisponible. Réessaie dans un instant.' };
  const q = arrondirPas(quantite, pas);
  if (q <= 0) return { erreur: 'Quantité trop faible pour la plus petite quantité autorisée.' };
  const meilleur = bids[0][0];
  let recuBrut;
  if (mode === 'carnet') {
    const w = parcourir(bids, q);
    if (!w.complet) return { erreur: 'Pas assez de liquidité dans le carnet pour cette quantité.' };
    recuBrut = w.montant;
  } else {
    const p = mode === 'milieu' ? (asks[0][0] + bids[0][0]) / 2 : meilleur;
    recuBrut = q * p;
  }
  if (recuBrut < minNotional) return { erreur: 'Montant minimum par ordre : ' + minNotional + ' €.' };
  const frais = recuBrut * tauxFrais;
  const prixMoyen = recuBrut / q;
  return {
    quantite: q, recuBrut, frais, recuNet: recuBrut - frais, prixMoyen,
    meilleurPrix: meilleur, glissement: 1 - prixMoyen / meilleur
  };
}

// Valeur totale du joueur en euros, fonds bloqués dans les ordres en attente compris.
export function patrimoine(partie, prixDe, machines = 0) {
  let actifs = 0, bloqueEUR = 0;
  for (const [base, a] of Object.entries(partie.plateforme.actifs)) {
    const p = prixDe(base);
    if (p) actifs += a.qte * p;
  }
  for (const o of partie.plateforme.ordres || []) {
    if (o.reserve.eur != null) bloqueEUR += o.reserve.eur;
    else { const p = prixDe(o.base); if (p) actifs += o.reserve.qte * p; }
  }
  // Minage : BTC en attente de versement au pool (à toi), facture d'électricité en cours (à payer).
  let facture = 0;
  if (partie.minage) {
    const p = prixDe('BTC');
    if (p) actifs += partie.minage.soldePool * p;
    facture = partie.minage.factureEUR;
  }
  const plateforme = partie.plateforme.soldeEUR + bloqueEUR;
  return { banque: partie.banque.solde, plateforme, actifs, facture, machines, total: partie.banque.solde + plateforme + actifs + machines - facture };
}
