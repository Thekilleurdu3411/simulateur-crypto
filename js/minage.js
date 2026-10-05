import { specRig, coinsParSeconde } from './altcoins.js';
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
  { id: 's23hyd', nom: 'Antminer S23 Hydro', th: 580, w: 5510, etat: 'neuf', prixUSD: 14299, refroidissement: 'hydro', phase: 'tri' },
  // ASIC Scrypt : minage fusionné Litecoin + Dogecoin (Kryptex, octobre 2026)
  { id: 'l9', nom: 'Antminer L9', th: 0, w: 3260, etat: 'neuf', prixUSD: 6500, refroidissement: 'air', phase: 'mono', production: [{ coin: 'LTC', h: 16e9 }, { coin: 'DOGE', h: 16e9 }] }
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

// Abonnements annuels du Tarif Bleu au 1er août 2026 (€ TTC) et changement de puissance Linky (Enedis).
export const ABONNEMENTS = { base: { 6: 190.32, 9: 238.56, 12: 285.12 }, tempo: { 6: 189.60, 9: 236.40, 12: 282.00 } };
export const CHANGEMENT_PUISSANCE = 4.28;

// Hébergeurs réels (spark.money, octobre 2026). Tarifs annoncés + 0,02 $/kWh de frais annexes habituels.
export const HEBERGEURS = [
  { id: 'saz', nom: 'SAZ Mining', pays: 'Paraguay', usdKwh: 0.047, engagementMois: 12, installUSD: 0, hydro: false },
  { id: 'compass', nom: 'Compass Mining', pays: 'États-Unis', usdKwh: 0.065, engagementMois: 1, installUSD: 0, hydro: false },
  { id: 'ezb', nom: 'EZ Blockchain', pays: 'Oklahoma et Texas', usdKwh: 0.075, engagementMois: 12, installUSD: 30, hydro: true },
  { id: 'terra', nom: 'Terra Hosting', pays: 'Texas', usdKwh: 0.075, engagementMois: 6, installUSD: 100, hydro: false }
];
export const FRAIS_ANNEXES_USD = 0.02;
export const ENVOI = { eur: 150, jours: 10 };
export function hebergeur(id) { return HEBERGEURS.find(h => h.id === id); }
export function prixHebergeurEUR(id, eurUsd) { const h = hebergeur(id); return h && eurUsd ? (h.usdKwh + FRAIS_ANNEXES_USD) / eurUsd : 0; }
export function supplementAbonnementParSeconde(contrat, kvaInitial) {
  const tab = ABONNEMENTS[contrat.type] || ABONNEMENTS.base;
  return Math.max(0, (tab[contrat.kva] || 0) - (tab[kvaInitial] || 0)) / (365 * 864e5 / 1000);
}

export function modele(id) { return CATALOGUE.find(m => m.id === id); }
// Caractéristiques d'une machine possédée (catalogue, ou rig calculé à partir de ses cartes).
export function spec(m) { return m.modele === 'rig' ? specRig(m) : modele(m.modele); }
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
    for (const m of minage.machines) {
      if (m.statut === 'livraison' && m.livraisonLe > t && m.livraisonLe < fin) fin = m.livraisonLe;
      if (m.statut === 'reparation' && m.reparationFin > t && m.reparationFin < fin) fin = m.reparationFin;
      if (m.statut === 'envoi' && m.envoiFin > t && m.envoiFin < fin) fin = m.envoiFin;
    }

    // Livraisons, réparations et envois terminés
    for (const m of minage.machines) {
      if (m.statut === 'livraison' && m.livraisonLe <= t) {
        m.statut = 'arret';
        evts.push({ t, texte: `Livraison reçue${m.lieu && m.lieu !== 'maison' ? ' chez ton hébergeur' : ''} : ${spec(m).nom}. Tu peux la mettre en marche.` });
      }
      if (m.statut === 'reparation' && m.reparationFin <= t) {
        m.statut = 'arret'; m.santeHash = 1; m.panne = null;
        evts.push({ t, texte: `Réparation terminée : ${spec(m).nom} est revenue, prête à redémarrer.` });
      }
      if (m.statut === 'envoi' && m.envoiFin <= t) {
        m.statut = 'arret'; m.lieu = m.envoiVers; m.envoiVers = null;
        evts.push({ t, texte: m.lieu === 'maison' ? `${spec(m).nom} est de retour chez toi.` : `${spec(m).nom} est arrivée chez ton hébergeur. Tu peux la mettre en marche.` });
      }
    }

    const dt = (fin - t) / 1000;
    const h = paris(t).heure;
    const nuit = h >= 22 || h < 7;
    const appart = ctx.logement === 'appart';
    const bridageNuit = minage.restrictionNuit && nuit && appart;
    const enMarche = minage.machines.filter(m => m.statut === 'marche');
    const chezSoi = m => !m.lieu || m.lieu === 'maison';
    const maison = bridageNuit ? [] : enMarche.filter(chezSoi);
    const heberges = enMarche.filter(m => !chezSoi(m));
    const actives = maison.concat(heberges);

    // Température de la pièce et bridage thermique (seulement pour les machines chez toi)
    const kwNominal = maison.reduce((s, m) => s + spec(m).w * MODES[m.mode || 'normal'].w, 0) / 1000;
    const tExt = ctx.temperature ? ctx.temperature(t) : null;
    const T = temperaturePiece(ctx.logement, minage.ventilation, tExt, kwNominal);
    const f = facteurChaleur(T);
    minage.temperature = T;
    const facteur = m => (chezSoi(m) ? f : 1); // un hébergeur garde ses salles au frais
    const th = actives.reduce((s, m) => s + spec(m).th * MODES[m.mode || 'normal'].th * (m.santeHash ?? 1) * facteur(m), 0);
    const kw = kwNominal * (T > 40 ? 0.5 : 1);

    // Bruit : une machine bruyante qui tourne la nuit en appartement
    if (nuit && appart && maison.some(m => spec(m).bruyant !== false)) minage.nuitBruyante = true;
    const hFin = paris(fin).heure;
    if (h < 7 && hFin >= 7) {
      if (minage.nuitBruyante) evts.push(...nuitDeBruit(minage, ctx, fin));
      minage.nuitBruyante = false;
    }

    // Usure et pannes
    for (const m of actives) {
      m.heures = (m.heures || 0) + dt / 3600;
      m.heuresDepuisNettoyage = (m.heuresDepuisNettoyage || 0) + dt / 3600;
      if (!ctx.rng || !ctx.pannes) continue;
      const md = spec(m);
      const Tm = chezSoi(m) ? T : 25;
      const parHeure = (md.etat === 'neuf' ? 0.06 : 0.15) / 8760
        * (Tm > 35 ? 3 : Tm > 30 ? 1.5 : 1)
        * MODES[m.mode || 'normal'].usure
        * (1 + (chezSoi(m) ? m.heuresDepuisNettoyage : 0) / 720 * 0.3) // l'hébergeur entretient
        * ctx.pannes;
      if (ctx.rng() < parHeure * dt / 3600) evts.push(declencherPanne(m, ctx.rng(), fin));
    }

    // Autres cryptos (rigs GPU, ASIC Scrypt) : gains à partir de la part de la puissance du réseau
    if (ctx.alt) {
      for (const m of actives) {
        for (const pr of spec(m).production || []) {
          const g = coinsParSeconde(pr.h * MODES[m.mode || 'normal'].th * (m.santeHash ?? 1) * facteur(m), ctx.alt.coins[pr.coin], undefined, ctx.multMinage) * dt;
          minage.soldesAlt = minage.soldesAlt || {};
          minage.soldesAlt[pr.coin] = (minage.soldesAlt[pr.coin] || 0) + g;
        }
      }
    }
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
    // Supplément d'abonnement si le compteur a été augmenté pour les machines
    if (ctx.supplementAbonnement) minage.factureEUR += ctx.supplementAbonnement * dt;
    // Électricité facturée par les hébergeurs (prix tout compris au kWh)
    for (const m of heberges) {
      const kwh = spec(m).w * MODES[m.mode || 'normal'].w / 1000 * dt / 3600;
      const px = ctx.prixHebergeur ? ctx.prixHebergeur(m.lieu) : 0;
      minage.factureHebKWh = (minage.factureHebKWh || 0) + kwh;
      minage.factureHebEUR = (minage.factureHebEUR || 0) + kwh * px;
    }
    t = fin;

    // Versement quotidien du pool à minuit UTC
    if (t === minuitUTC && ctx.peutRecevoir && minage.soldesAlt) {
      for (const [tag, q] of Object.entries(minage.soldesAlt)) {
        if (q <= 0) continue;
        minage.soldesAlt[tag] = 0;
        ctx.payer(tag, q, t);
        evts.push({ t, texte: `Pool : ${q.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${tag} versés sur ta plateforme` });
      }
    }
    if (t === minuitUTC && minage.soldePool >= p.min && ctx.peutRecevoir) {
      const q = minage.soldePool;
      minage.soldePool = 0;
      ctx.payer('BTC', q, t);
      evts.push({ t, texte: `${p.nom} a versé ${q.toFixed(8).replace('.', ',')} BTC sur ta plateforme` });
    }
  }
  return evts;
}

// ---------- Gestion du parc (V0.4) ----------

// Réglages du micrologiciel : moins de puissance mais meilleure efficacité en éco, l'inverse en performance.
export const MODES = {
  eco: { nom: 'Éco', th: 0.8, w: 0.7, usure: 0.7 },
  normal: { nom: 'Normal', th: 1, w: 1, usure: 1 },
  perf: { nom: 'Performance', th: 1.1, w: 1.2, usure: 1.6 }
};

export const PANNES = [
  { type: 'ventilateur', nom: 'Ventilateur hors service', p: 0.40, arret: true, cout: 25, jours: 2 },
  { type: 'hashboard', nom: 'Carte de hachage hors service', p: 0.35, arret: false, cout: 180, jours: 15 },
  { type: 'alim', nom: 'Alimentation hors service', p: 0.20, arret: true, cout: 120, jours: 3 },
  { type: 'controle', nom: 'Carte de contrôle hors service', p: 0.05, arret: true, cout: 80, jours: 3 }
];
export const GARANTIE_JOURS = 365;      // machines neuves
export const ENVOI_SAV = 40;            // frais d'envoi d'une réparation sous garantie
export const VENTILATION = { nom: 'Extracteur d\'air avec gaine vers l\'extérieur', prix: 120 };

// Échauffement de la pièce par kW de machines (°C/kW) : chambre fermée ou garage, avec ou sans extraction.
export function temperaturePiece(logement, ventilation, tExt, kw) {
  const garage = logement === 'maison';
  const base = garage ? (tExt == null ? 18 : tExt + 3) : (tExt == null ? 20 : Math.max(20, tExt + 2));
  const k = garage ? (ventilation ? 0.8 : 2) : (ventilation ? 1.5 : 4);
  return base + kw * k;
}

// Plage de fonctionnement d'un ASIC à air : jusqu'à 35 °C sans souci, bridage au-delà, protection au-dessus de 40 °C.
export function facteurChaleur(T) {
  if (T <= 35) return 1;
  if (T <= 40) return 1 - (T - 35) / 5 * 0.4;
  return 0.3; // la machine coupe et redémarre en boucle
}

function declencherPanne(m, tirage, t) {
  let cumul = 0;
  const p = PANNES.find(x => (cumul += x.p) >= tirage) || PANNES[0];
  m.panne = { type: p.type, depuis: t };
  if (p.arret) m.statut = 'panne';
  else m.santeHash = Math.max(1 / 3, (m.santeHash ?? 1) - 1 / 3);
  return { t, texte: `Panne : ${p.nom} sur ${spec(m).nom}` + (p.arret ? ' (machine arrêtée)' : ' (elle tourne à puissance réduite)'), panne: true };
}

function nuitDeBruit(minage, ctx, t) {
  if (ctx.bruit === 'off' || !ctx.rng) return [];
  if (ctx.rng() >= 0.35) return [];
  if (ctx.bruit === 'alertes') return [{ t, texte: 'Un voisin se plaint du bruit de tes machines cette nuit (sans conséquence dans ta difficulté).' }];
  minage.plaintes = (minage.plaintes || 0) + 1;
  if (minage.plaintes >= 3 && !minage.restrictionNuit) {
    minage.restrictionNuit = true;
    return [{ t, texte: 'Mise en demeure du syndic après 3 plaintes : tes machines doivent rester arrêtées de 22 h à 7 h.' }];
  }
  return [{ t, texte: `Plainte d'un voisin pour le bruit de la nuit (${minage.plaintes} sur 3 avant mise en demeure).` }];
}

export function infosPanne(m) { return m.panne ? PANNES.find(p => p.type === m.panne.type) : null; }

// Valeur de revente d'une machine sur le marché de l'occasion, en dollars.
export function valeurReventeUSD(m) {
  const md = spec(m);
  const prix = md.rig ? md.prixEUR * (m.eurUsdAchat || 1.17) / 1.2 : md.prixUSD;
  const base = md.etat === 'neuf' ? prix * 0.7 : prix * 0.85;
  const ans = (Date.now() - m.acheteLe) / (365 * 864e5);
  const etat = m.statut === 'panne' || (m.santeHash ?? 1) < 1 ? 0.5 : 1;
  return Math.max(40, base * Math.max(0.3, 1 - 0.15 * ans) * etat);
}

// Gains et coûts estimés par jour pour une machine (aide à la décision, masquée en Réalité).
export function estimationJour(m, reseau, contrat, fraisPool, multMinage, multElec, prixBTC) {
  const btc = btcParSeconde(m.th, reseau.difficulte, reseau.recompense, fraisPool, multMinage) * 86400;
  const prix = contrat.type === 'tempo' ? TARIFS.tempo.bleu[0] * 2 / 3 + TARIFS.tempo.bleu[1] / 3 : TARIFS.base[contrat.kva >= 9 ? 9 : 6];
  const cout = m.w / 1000 * 24 * prix * multElec;
  return { btc, eur: prixBTC ? btc * prixBTC : null, cout, net: prixBTC ? btc * prixBTC - cout : null };
}
