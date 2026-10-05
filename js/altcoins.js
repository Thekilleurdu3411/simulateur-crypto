// Minage des autres cryptos : cartes graphiques (rigs) et ASIC Scrypt.
// Performances : WhatToMine (octobre 2026). Prix des cartes neuves en France : dropreference.com (15 août 2026).

// Puissance (H/s) et consommation (W) par algorithme.
export const CARTES = [
  { id: '3060ti', nom: 'RTX 3060 Ti', prixEUR: 467, algos: { KawPow: [27e6, 190], Etchash: [60e6, 140], Autolykos: [160e6, 130] } },
  { id: '3070', nom: 'RTX 3070', prixEUR: 406, algos: { KawPow: [27.6e6, 180], Etchash: [60e6, 130], Autolykos: [160e6, 130] } },
  { id: '4070', nom: 'RTX 4070', prixEUR: 990, algos: { KawPow: [31.3e6, 170], Etchash: [62e6, 140], Autolykos: [120e6, 80] } },
  { id: '7900xtx', nom: 'RX 7900 XTX', prixEUR: 929, algos: { KawPow: [58e6, 320], Etchash: [100e6, 220], Autolykos: [190e6, 230] } },
  { id: '4090', nom: 'RTX 4090', prixEUR: 3790, algos: { KawPow: [67e6, 330], Etchash: [127e6, 260], Autolykos: [260e6, 200] } }
];

// Cryptos minables par carte graphique, et leur algorithme.
export const COINS_GPU = { RVN: 'KawPow', ETC: 'Etchash', ERG: 'Autolykos' };

// Pièces d'un rig (prix estimés, voir DECISIONS.md).
export const RIG = {
  chassis: 60, kit: 150, riser: 10, alim: { prix: 220, watts: 1200, chargeMax: 0.8, rendement: 0.92 },
  baseW: 60, maxCartes: 8, livraisonJours: 3
};
export const FRAIS_POOL_ALT = 0.01;

export function carte(id) { return CARTES.find(c => c.id === id); }

// Composition et caractéristiques d'un rig : modèle de carte, nombre, crypto minée.
export function calculerRig(carteId, nb, coin) {
  const c = carte(carteId);
  const [h, w] = c.algos[COINS_GPU[coin]];
  const wCartes = w * nb;
  const wMur = Math.round(wCartes / RIG.alim.rendement + RIG.baseW);
  const alims = Math.max(1, Math.ceil(wMur / (RIG.alim.watts * RIG.alim.chargeMax)));
  const prix = c.prixEUR * nb + RIG.chassis + RIG.kit + RIG.riser * nb + RIG.alim.prix * alims;
  return { carte: c, nb, coin, h: h * nb, w: wMur, alims, prix };
}

/**
 * Caractéristiques communes d'une machine pour le moteur de minage.
 * ASIC Bitcoin : th > 0. Rig GPU ou ASIC Scrypt : production d'autres cryptos.
 */
export function specRig(m) {
  const r = calculerRig(m.config.carte, m.config.nb, m.config.coin);
  return {
    nom: `Rig ${m.config.nb} × ${r.carte.nom}`, th: 0, w: r.w, etat: 'neuf', refroidissement: 'air', phase: 'mono', bruyant: false,
    production: [{ coin: m.config.coin, h: r.h }], prixUSD: null, prixEUR: r.prix, rig: true
  };
}

// Gain en monnaie par seconde pour une puissance h (H/s), à partir des données réseau.
export function coinsParSeconde(h, d, fraisPool = FRAIS_POOL_ALT, multiplicateur = 1) {
  if (!d || !d.nethash || !d.blockTime) return 0;
  return h / d.nethash * d.reward / d.blockTime * (1 - fraisPool) * multiplicateur;
}

// Prix en euros d'une crypto minée, à partir de son cours en BTC.
export function prixAltEUR(tag, alt, prixBTC) {
  const d = alt && alt.coins && alt.coins[tag];
  return d && prixBTC ? d.btc * prixBTC : null;
}
