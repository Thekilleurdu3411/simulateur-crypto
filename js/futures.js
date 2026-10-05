// Contrats perpétuels (marge isolée, en USDT) : calculs purs et testés.
// Frais standard d'une grande plateforme : 0,02 % faiseur, 0,05 % preneur (finder.com, 2026).

export const FRAIS_PRENEUR = 0.0005;
export const CONTRATS = [
  { s: 'BTCUSDT', base: 'BTC', nom: 'Bitcoin', levierMax: 125, mmr: 0.004 },
  { s: 'ETHUSDT', base: 'ETH', nom: 'Ethereum', levierMax: 125, mmr: 0.005 },
  { s: 'SOLUSDT', base: 'SOL', nom: 'Solana', levierMax: 75, mmr: 0.0065 }
];
export const HEURES_FINANCEMENT = [0, 8, 16]; // UTC

export function contrat(s) { return CONTRATS.find(c => c.s === s); }

// Prix de liquidation en marge isolée (mode à sens unique).
export function prixLiquidation(sens, entree, qte, marge, mmr) {
  if (sens === 'long') return Math.max(0, (entree * qte - marge) / (qte * (1 - mmr)));
  return (entree * qte + marge) / (qte * (1 + mmr));
}

export function pnl(pos, prix) { return (prix - pos.entree) * pos.qte * (pos.sens === 'long' ? 1 : -1); }

/**
 * Ouvre une position au marché. marge en USDT, prix d'exécution = meilleure offre du bon côté.
 * Renvoie { erreur } ou { position, frais }.
 */
export function ouvrir({ s, sens, levier, marge, bid, ask, pas, minNotional, solde, levierMax, maintenant }) {
  const c = contrat(s);
  if (!c) return { erreur: 'Contrat inconnu.' };
  const lmax = Math.min(c.levierMax, levierMax);
  if (!(levier >= 1 && levier <= lmax)) return { erreur: `Levier entre 1 et ${lmax} dans ta difficulté.` };
  if (!(marge > 0)) return { erreur: 'Indique une marge en USDT.' };
  const prix = sens === 'long' ? ask : bid;
  const p = Number(pas);
  const qte = Number((Math.floor(marge * levier / prix / p + 1e-9) * p).toFixed(10));
  if (!(qte > 0)) return { erreur: 'Marge trop faible pour la plus petite quantité autorisée.' };
  const notionnel = qte * prix;
  if (notionnel < minNotional) return { erreur: `Taille minimale d'une position : ${minNotional} USDT (marge × levier).` };
  const margeReelle = notionnel / levier;
  const frais = notionnel * FRAIS_PRENEUR;
  if (margeReelle + frais > solde + 1e-9) return { erreur: 'Solde de marge insuffisant (frais compris).' };
  return {
    frais,
    position: {
      id: maintenant.toString(36) + Math.random().toString(36).slice(2, 5),
      s, sens, levier, qte, entree: prix, marge: margeReelle, ouverteLe: maintenant, financement: 0,
      liquidation: prixLiquidation(sens, prix, qte, margeReelle, c.mmr)
    }
  };
}

/** Ferme une position au marché. Renvoie le montant rendu au portefeuille et le résultat net. */
export function fermer(pos, bid, ask) {
  const prix = pos.sens === 'long' ? bid : ask;
  const brut = pnl(pos, prix);
  const frais = pos.qte * prix * FRAIS_PRENEUR;
  return { prix, brut, frais, rendu: Math.max(0, pos.marge + brut - frais), net: brut - frais + pos.financement };
}

export function estLiquidee(pos, bas, haut) {
  return pos.sens === 'long' ? bas <= pos.liquidation : haut >= pos.liquidation;
}

// Financement : payé par les acheteurs si le taux est positif, reçu sinon.
export function financement(pos, prixMarque, taux) {
  return -pos.qte * prixMarque * taux * (pos.sens === 'long' ? 1 : -1);
}

// Prochaine échéance de financement après t.
export function prochainFinancement(t) {
  const d = new Date(t);
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  for (const h of [...HEURES_FINANCEMENT, 24]) { const x = base + h * 36e5; if (x > t) return x; }
  return base + 24 * 36e5;
}

// Part de la marge perdue (pour l'alerte avant liquidation).
export function risque(pos, prixMarque) {
  return Math.max(0, -pnl(pos, prixMarque)) / pos.marge;
}
