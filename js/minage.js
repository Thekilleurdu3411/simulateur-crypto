// Minage Bitcoin : catalogue réel, pools réels, électricité réelle, calcul des gains.
// Fonctions de calcul pures (testées) ; les données réseau arrivent de donnees.js.

// Prix relevés début octobre 2026 (hors taxes, en dollars). Sources dans DECISIONS.md.
export const CATALOGUE = [
  { id: 's19', nom: 'Antminer S19', th: 95, w: 3250, etat: 'occasion', prixUSD: 430, refroidissement: 'air', phase: 'mono' },
  { id: 's19jpro', nom: 'Antminer S19j Pro', th: 104, w: 3068, etat: 'occasion', prixUSD: 665, refroidissement: 'air', phase: 'mono' },
  { id: 's19pro', nom: 'Antminer S19 Pro', th: 110, w: 3250, etat: 'occasion', prixUSD: 665, refroidissement: 'air', phase: 'mono' },
  { id: 's21pro', nom: 'Antminer S21 Pro', th: 234, w: 3531, etat: 'neuf', prixUSD: 1910, refroidissement: 'air', phase: 'mono' },
  { id: 's21xp', nom: 'Antminer S21 XP', th: 270, w: 3645, etat: 'neuf', prixUSD: 3800, refroidissement: 'air', phase: 'mono' },
  { id: 's21xphyd', nom: 'Antminer S21 XP Hydro', th: 473, w: 5676, etat: 'neuf', prixUSD: 6899, refroidissement: 'hydro', phase: 'mono' },
  { id: 's21xpphyd', nom: 'Antminer S21 XP+ Hyd', th: 500, w: 5500, etat: 'neuf', prixUSD: 9500, refroidissement: 'hydro', phase: 'tri' },
  { id: 's23hyd', nom: 'Antminer S23 Hydro', th: 580, w: 5510, etat: 'neuf', prixUSD: 14299, refroidissement: 'hydro', phase: 'tri' }
];

// Frais et seuils de versement réels (relevé spark.money, octobre 2026).
export const POOLS = [
  { id: 'braiins', nom: 'Braiins Pool', mode: 'FPPS', frais: 0.02, min: 0.001 },
  { id: 'antpool', nom: 'AntPool', mode: 'FPPS', frais: 0.025, min: 0.001 },
  { id: 'luxor', nom: 'Luxor', mode: 'FPPS', frais: 0.007, min: 0.004 },
  { id: 'f2pool', nom: 'F2Pool', mode: 'FPPS', frais: 0.04, min: 0.001 },
  { id: 'viabtc', nom: 'ViaBTC', mode: 'PPS+', frais: 0.04, min: 0.001 }
];

// Tarif Bleu EDF au 1er août 2026 (CRE, délibération n° 2026-147), en € TTC par kWh.
export const TARIFS = {
  base: { 6: 0.2001, 9: 0.1985 },
  tempo: { bleu: [0.1654, 0.1356], blanc: [0.1921, 0.1536], rouge: [0.7295, 0.1615] } // [heures pleines, heures creuses]
};

export const TVA = 0.2;
export const LIVRAISON = { neuf: { eur: 150, jours: 14 }, occasion: { eur: 60, jours: 5 } };
export const RESERVE_FOYER_KVA = 2; // puissance gardée pour le reste du logement

export const COMPTEUR = { parents: 6, appart: 6, maison: 9 };

export function modele(id) { return CATALOGUE.find(m => m.id === id); }
export function pool(id) { return POOLS.find(p => p.id === id) || POOLS[0]; }

// Récompense de bloc selon la hauteur (division par deux tous les 210 000 blocs).
export function subvention(hauteur) { return 50 / 2 ** Math.floor(hauteur / 210000); }

/**
 * Gains attendus en BTC par seconde pour une puissance donnée (versement FPPS : la valeur
 * attendue, sans dépendre de la chance). th : TH/s ; difficulte : difficulté réelle ;
 * recompense : subvention + frais moyens par bloc ; fraisPool : 0,02 = 2 %.
 */
export function btcParSeconde(th, difficulte, recompense, fraisPool, multiplicateur = 1) {
  if (!th || !difficulte) return 0;
  return th * 1e12 / (difficulte * 2 ** 32) * recompense * (1 - fraisPool) * multiplicateur;
}

// Date (jour Tempo) et heure à Paris pour un instant donné.
const fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
export function paris(t) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, heure: Number(p.hour) };
}
// Un jour Tempo va de 6 h à 6 h le lendemain ; les heures creuses vont de 22 h à 6 h.
export function jourTempo(t) { return paris(t - 6 * 36e5).date; }
export function heureCreuse(t) { const h = paris(t).heure; return h >= 22 || h < 6; }

/** Prix du kWh à un instant. couleurs : { 'AAAA-MM-JJ': 'bleu'|'blanc'|'rouge' }. */
export function prixKWh(contrat, t, couleurs) {
  const base = TARIFS.base[contrat.kva >= 9 ? 9 : 6];
  if (contrat.type !== 'tempo') return { prix: base, couleur: null };
  const c = couleurs && couleurs[jourTempo(t)];
  if (!c) return { prix: base, couleur: null }; // couleur inconnue : prix Base (voir DECISIONS.md)
  return { prix: TARIFS.tempo[c][heureCreuse(t) ? 1 : 0], couleur: c };
}

// Puissance (kW) que le logement peut consacrer aux machines.
export function puissanceDispo(logement, kva) {
  if (logement === 'parents') return 0;
  return Math.max(0, kva - RESERVE_FOYER_KVA);
}

export function prixMachineEUR(m, eurUsd) {
  const ht = m.prixUSD / eurUsd;
  return { ht, ttc: ht * (1 + TVA), livraison: LIVRAISON[m.etat].eur, total: ht * (1 + TVA) + LIVRAISON[m.etat].eur };
}

/**
 * Fait avancer le minage de t0 à t1 par pas d'au plus 15 minutes.
 * Met à jour le solde du pool, la facture d'électricité, les livraisons, les versements.
 * ctx : { reseau: {difficulte, recompense}, couleurs, multMinage, multElec, temps, prixBTC (€), payer(base, qte, valeurEUR, t) }
 * Renvoie la liste des événements (textes).
 */
export function avancer(minage, t0, t1, ctx) {
  const evts = [];
  if (!(t1 > t0)) return evts;
  const p = pool(minage.pool);
  let t = t0;
  while (t < t1) {
    // Prochaine frontière : 15 min, minuit UTC (versement du pool), une livraison.
    let fin = Math.min(t1, t + 15 * 6e4);
    const minuitUTC = Math.floor(t / 864e5) * 864e5 + 864e5;
    if (minuitUTC < fin) fin = minuitUTC;
    for (const m of minage.machines) if (m.statut === 'livraison' && m.livraisonLe > t && m.livraisonLe < fin) fin = m.livraisonLe;

    // Livraisons arrivées
    for (const m of minage.machines) {
      if (m.statut === 'livraison' && m.livraisonLe <= t) {
        m.statut = 'arret';
        evts.push({ t, texte: `Livraison reçue : ${modele(m.modele).nom}. Tu peux la mettre en marche.` });
      }
    }

    const dt = (fin - t) / 1000;
    const actives = minage.machines.filter(m => m.statut === 'marche');
    const th = actives.reduce((s, m) => s + modele(m.modele).th, 0);
    const kw = actives.reduce((s, m) => s + modele(m.modele).w, 0) / 1000;
    if (th && ctx.reseau && ctx.reseau.difficulte) {
      const gain = btcParSeconde(th, ctx.reseau.difficulte, ctx.reseau.recompense, p.frais, ctx.multMinage) * dt;
      minage.soldePool += gain;
      minage.gainsTotal += gain;
    }
    if (kw) {
      const { prix } = prixKWh(minage.contrat, t, ctx.couleurs);
      const kwh = kw * dt / 3600;
      minage.factureKWh += kwh;
      minage.factureEUR += kwh * prix * ctx.multElec;
    }
    t = fin;

    // Versement quotidien du pool à minuit UTC
    if (t === minuitUTC && minage.soldePool >= p.min && ctx.peutRecevoir) {
      const q = minage.soldePool;
      minage.soldePool = 0;
      ctx.payer('BTC', q, t);
      evts.push({ t, texte: `${p.nom} a versé ${q.toFixed(8).replace('.', ',')} BTC sur ta plateforme` });
    }
  }
  return evts;
}

// Gains et coûts estimés par jour pour une machine (aide à la décision, masquée en Réalité).
export function estimationJour(m, reseau, contrat, fraisPool, multMinage, multElec, prixBTC) {
  const btc = btcParSeconde(m.th, reseau.difficulte, reseau.recompense, fraisPool, multMinage) * 86400;
  const prix = contrat.type === 'tempo' ? TARIFS.tempo.bleu[0] * 2 / 3 + TARIFS.tempo.bleu[1] / 3 : TARIFS.base[contrat.kva >= 9 ? 9 : 6];
  const cout = m.w / 1000 * 24 * prix * multElec;
  return { btc, eur: prixBTC ? btc * prixBTC : null, cout, net: prixBTC ? btc * prixBTC - cout : null };
}
