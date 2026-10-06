// Ta société crypto (V0.20) : SAS, trésorerie, minage industriel, traders salariés, comptabilité et impôt sur les sociétés.
// Fonctions pures ou qui ne touchent qu'à la partie passée en paramètre (testées).
import { CATALOGUE, modele, btcParSeconde, disponible, marcheMachines } from './minage.js';
import { rng } from './personnalites.js';
import { jourExpansion, valeurAmorcage, salariesPlateforme, AGREMENTS, nouveauFonds, nouvellePlateforme } from './expansion.js';

const JOUR = 864e5, MOIS = 30.4375 * JOUR, AN = 365.25 * JOUR;
const jourDe = t => Math.floor(t / JOUR);
const arr = x => Math.round(x * 100) / 100;

// ---------- Création et règles ----------
export const CREATION = { frais: 250, capitalMin: 1000, delaiJours: 7 }; // greffe + annonce légale ; Kbis en une semaine environ
export const IS = { tauxReduit: 0.15, plafondReduit: 42500, taux: 0.25 };    // impôt sur les sociétés 2026, à vérifier
export const PFU = 0.314;   // flat tax sur les dividendes (12,8 % d'impôt + 18,6 % de prélèvements sociaux en 2026), à vérifier
export const RESERVE_LEGALE = 0.05;
export const CHARGES_FIXES = { comptable: 180, parSalarie: 35, banque: 40, assurance: 120 }; // € par mois, à vérifier
export const AGIOS = 0.09;  // taux annuel du découvert de la société
export const LIQUIDATION_JOURS = 60; // jours de trésorerie négative avant la liquidation judiciaire

// ---------- Sites de minage ----------
// Prix, loyers et électricité industrielle : ordres de grandeur 2026, à vérifier.
export const SITES = [
  { id: 'entrepot', nom: 'Entrepôt en France', lieu: 'France', kw: 500, travaux: 90000, loyer: 4500, kwh: 0.115, devise: 'EUR', delai: 45 },
  { id: 'norvege', nom: 'Hangar en Norvège', lieu: 'Norvège (hydroélectricité)', kw: 2000, travaux: 380000, loyer: 14000, kwh: 0.055, devise: 'EUR', delai: 90 },
  { id: 'texas', nom: 'Ferme au Texas', lieu: 'Texas', kw: 10000, travaux: 1600000, loyer: 45000, kwh: 0.045, devise: 'USD', delai: 120 },
  { id: 'paraguay', nom: 'Ferme hydro au Paraguay', lieu: 'Paraguay (barrage d\'Itaipu)', kw: 20000, travaux: 2900000, loyer: 70000, kwh: 0.038, devise: 'USD', delai: 150 }
];
export const site = id => SITES.find(s => s.id === id);
export const PUE = 1.08;            // refroidissement, éclairage, pertes
export const MACHINES_PAR_TECH = 250;
export const TECHNICIEN = { coutMois: 4100, recrutement: 1500 }; // coût employeur d'un technicien (≈ 2 300 € net), à vérifier
export const REMISES = [[500, 0.1], [100, 0.05]];
export const LIVRAISON_JOURS = 21;
export const FRAIS_POOL = 0.02;

/** Machines achetables par la société : ASIC bitcoin sortis à la date t. */
export function machinesAchetables(t) { return CATALOGUE.filter(m => m.th > 0 && disponible(m, t)); }

/** Prix HT d'un lot (la société récupère la TVA). */
export function prixLot(m, n, eurUsd) {
  const remise = (REMISES.find(([q]) => n >= q) || [0, 0])[1];
  const unitaire = m.prixUSD * marcheMachines.facteur / eurUsd;
  return { unitaire, remise, total: arr(unitaire * n * (1 - remise) + 300) }; // + transport du lot
}
/** Valeur de revente d'un lot de machines (marché de l'occasion, 10 % de frais). */
export function valeurLot(lot, eurUsd, t) {
  const m = modele(lot.modele);
  if (!m || !eurUsd) return 0;
  const ans = (t - lot.acheteLe) / AN;
  return lot.n * m.prixUSD * marcheMachines.facteur / eurUsd * 0.7 * Math.max(0.25, 1 - 0.2 * ans) * 0.9;
}
export const puissanceSite = s => s.lots.reduce((a, l) => a + l.n * modele(l.modele).w, 0) * PUE / 1000; // kW
export const machinesTotal = e => e.sites.reduce((a, s) => a + s.lots.reduce((b, l) => b + l.n, 0), 0);
export const techniciensRequis = e => Math.ceil(machinesTotal(e) / MACHINES_PAR_TECH);
/** Part des machines en marche : 97 % avec assez de techniciens, beaucoup moins sinon. */
export function disponibilite(e) {
  const req = techniciensRequis(e);
  if (!req) return 0.97;
  return 0.97 - 0.25 * Math.max(0, 1 - e.techniciens / req);
}

// ---------- Traders ----------
const PRENOMS = ['Julien', 'Camille', 'Nicolas', 'Sarah', 'Antoine', 'Léa', 'Thomas', 'Manon', 'Karim', 'Chloé', 'Maxime', 'Inès', 'Lucas', 'Emma', 'Hugo', 'Yanis', 'Jade', 'Romain', 'Nadia', 'Adrien'];
const NOMS = ['Moreau', 'Girard', 'Lefèvre', 'Benali', 'Rousseau', 'Faure', 'Chevalier', 'Nguyen', 'Perrin', 'Marchand', 'Leclerc', 'Duval', 'Ferrand', 'Aubert', 'Masson', 'Kaci', 'Renaud', 'Carpentier', 'Lemaire', 'Barbier'];
export const PROFILS_TRADER = {
  junior: { nom: 'Junior', salaire: [42000, 55000], competence: [0.3, 0.65], bonus: 0.1 },
  confirme: { nom: 'Confirmé', salaire: [75000, 110000], competence: [0.45, 0.78], bonus: 0.15 },
  star: { nom: 'Star', salaire: [180000, 300000], competence: [0.6, 0.92], bonus: 0.2 }
};
export const CHARGES_PATRONALES = 0.45; // sur le brut, ordre de grandeur cadre
export const FRAIS_RECRUTEMENT = 0.2;   // cabinet : 20 % du brut annuel
/** Rendement annuel moyen hors marché selon la compétence : la plupart ne battent pas le marché. */
export const alpha = c => (c - 0.62) * 0.35;

/** Trois candidats pour le mois (reproductibles). */
export function candidats(seed, mois) {
  const R = rng(seed, mois, 77);
  return ['junior', 'confirme', 'star'].map((type, i) => {
    const P = PROFILS_TRADER[type];
    const tire = ([a, b]) => a + (b - a) * R();
    const integrite = R() < 0.15 ? 0.1 + R() * 0.25 : 0.55 + R() * 0.45; // 15 % de profils douteux
    const competence = tire(P.competence);
    return {
      id: `${mois}-${i}`, type, nom: `${PRENOMS[Math.floor(R() * PRENOMS.length)]} ${NOMS[Math.floor(R() * NOMS.length)]}`,
      salaire: Math.round(tire(P.salaire) / 1000) * 1000, competence, risque: 0.2 + R() * 0.8, integrite, bonus: P.bonus,
      // Ce que tu vois : un entretien bruité et des références
      note: Math.max(1, Math.min(10, Math.round((competence + (R() - 0.5) * 0.3) * 10))),
      references: integrite < 0.4 ? (R() < 0.5 ? 'Floues' : 'Bonnes') : (R() < 0.85 ? 'Bonnes' : 'Moyennes')
    };
  });
}

// ---------- État ----------
export function nouvelleEntreprise(nom, capital, t) {
  return {
    nom, creeLe: t, pretLe: t + CREATION.delaiJours * JOUR, capital, tresorerie: capital - CREATION.frais, compteCourant: 0,
    sites: [], techniciens: 0, traders: [], btc: 0, btcCout: 0, vendreBTC: true,
    exercice: nouvelExercice(t, CREATION.frais), exercices: [], deficit: 0, reserves: 0, reserveLegale: 0, dividendes: 0,
    jour: jourDe(t), negatifDepuis: null, dernierBTC: null, candidatsMois: null
  };
}
function nouvelExercice(t, fixes = 0) { return { an: new Date(t).getUTCFullYear(), ca: 0, trading: 0, elec: 0, loyers: 0, salaires: 0, fixes, amort: 0, agios: 0, plusValues: 0 }; }
export function resultat(x) { return x.ca + x.trading + x.plusValues + (x.gestion || 0) + (x.plateforme || 0) - x.elec - x.loyers - x.salaires - x.fixes - x.amort - x.agios - (x.activites || 0) - (x.pertes || 0); }
/** Impôt sur les sociétés d'un bénéfice imposable. */
export function impotSocietes(benefice) {
  if (benefice <= 0) return 0;
  return Math.min(benefice, IS.plafondReduit) * IS.tauxReduit + Math.max(0, benefice - IS.plafondReduit) * IS.taux;
}
export function salariesDe(e) { return e.techniciens + e.traders.length + (e.plateforme ? salariesPlateforme(e.plateforme) : 0) + (e.fonds && e.fonds.statut === 'actif' ? 1 : 0); }
export function chargesFixesMois(e) { const c = CHARGES_FIXES; return c.comptable + c.banque + c.assurance + c.parSalarie * salariesDe(e); }

/** Valeur de la société (actif net) : trésorerie, bitcoins, machines (valeur comptable, au moins leur prix de revente), sites, capital confié aux traders (tel qu'annoncé). */
export function valeurEntreprise(e, prixBTC, eurUsd, t) {
  if (!e) return 0;
  const machines = e.sites.reduce((a, s) => a + s.lots.reduce((b, l) => b + Math.max(l.prix * Math.max(0, 1 - (t - l.acheteLe) / (3 * AN)), valeurLot(l, eurUsd, t)), 0), 0);
  const traders = e.traders.reduce((a, x) => a + x.capitalAffiche, 0);
  const sites = e.sites.reduce((a, s) => a + valeurSite(s, t), 0);
  return e.tresorerie + e.btc * (prixBTC || 0) + machines + traders + sites + valeurAmorcage(e);
}

/** Valeur comptable d'un site (bâtiment, raccordement, refroidissement), amorti sur 10 ans. */
export const valeurSite = (s, t) => s.travaux * Math.max(0, 1 - (t - s.construitLe) / (10 * AN));

/** Ce que la société vaut pour toi : ton compte courant plus ta part des fonds propres (ou de la capitalisation si elle est cotée). */
export function partEntreprise(e, prixBTC, eurUsd, t) {
  if (!e || e.liquidee) return 0;
  const propres = e.bourse && e.bourse.cotee ? e.bourse.capi : valeurEntreprise(e, prixBTC, eurUsd, t) - e.compteCourant;
  return e.compteCourant + (e.parts ?? 1) * propres;
}

/** Demander un agrément (fonds ou plateforme) : dossier payé, fonds propres minimaux exigés. */
export function demanderAgrement(e, type, t, valeurNette) {
  const A = AGREMENTS[type];
  if (!A) return { erreur: 'Agrément inconnu.' };
  if (e[type]) return { erreur: 'Déjà demandé.' };
  if (t < e.pretLe) return { erreur: 'La société n\'est pas encore immatriculée.' };
  if (valeurNette < A.fondsPropres + A.dossier) return { erreur: `L'AMF exige au moins ${A.fondsPropres.toLocaleString('fr-FR')} € de fonds propres (en plus des ${A.dossier.toLocaleString('fr-FR')} € du dossier). Augmente-les avec des bénéfices ou du capital.` };
  if (e.tresorerie < A.dossier) return { erreur: `Il faut ${A.dossier.toLocaleString('fr-FR')} € de trésorerie pour le dossier.` };
  e.tresorerie -= A.dossier; e.exercice.activites = (e.exercice.activites || 0) + A.dossier;
  e[type] = type === 'fonds' ? nouveauFonds(t) : nouvellePlateforme(t);
  return { ok: true };
}
/** Augmentation de capital : tes euros deviennent des fonds propres (non remboursables). */
export function augmenterCapital(partie, montant) {
  const e = partie.entreprise;
  if (!(montant > 0)) return { erreur: 'Montant invalide.' };
  if (e.bourse) return { erreur: 'Société cotée : passe par une émission d\'actions (pas encore disponible).' };
  if (partie.banque.solde < montant) return { erreur: 'Pas assez sur ton compte bancaire.' };
  partie.banque.solde -= montant; e.capital += montant; e.tresorerie += montant;
  return { ok: true };
}

// ---------- Une journée de la société ----------
/**
 * ctx : { prixBTC (€), eurUsd, reseau: { difficulte, recompense } }. Renvoie les textes d'événements.
 * Les journées en retard sont rattrapées (au plus 400), avec les prix actuels.
 */
export function avancerEntreprise(e, t, ctx, seed = 0) {
  const evts = [];
  if (!e || e.liquidee) return evts;
  let j = e.jour, n = 0;
  const rBTC = e.dernierBTC && ctx.prixBTC ? ctx.prixBTC / e.dernierBTC - 1 : 0;
  if (ctx.prixBTC) e.dernierBTC = ctx.prixBTC;
  const d = e.derniers || (e.derniers = {});
  const rend = k => (d[k] && ctx['prix' + k] ? ctx['prix' + k] / d[k] - 1 : k === 'BTC' ? rBTC : 0);
  const r = { BTC: rBTC, ETH: rend('ETH'), ALT: rend('ALT') };
  for (const k of ['ETH', 'ALT']) if (ctx['prix' + k]) d[k] = ctx['prix' + k];
  while (j < jourDe(t) && n++ < 400) {
    j++;
    const tj = j * JOUR;
    // Clôture de l'exercice au 31 décembre
    if (new Date(tj).getUTCFullYear() !== e.exercice.an) evts.push(...cloturer(e, tj));
    unJour(e, tj, ctx, n === 1 ? r : { BTC: 0, ETH: 0, ALT: 0 }, rng(seed, j, 313), evts);
    if (e.liquidee) break;
  }
  e.jour = jourDe(t);
  return evts;
}

function unJour(e, t, ctx, r, R, evts) {
  const x = e.exercice, d = 1 / 30.4375, rBTC = r.BTC;
  // Livraisons et chantiers
  for (const s of e.sites) {
    if (!s.ouvert && t >= s.pretLe) { s.ouvert = true; evts.push(`${s.nom} : le site est prêt, les machines peuvent tourner.`); }
    for (const l of s.lots) if (l.livreLe && t >= l.livreLe && !l.livre) { l.livre = true; evts.push(`${l.n} ${modele(l.modele).nom} livrées sur le site ${s.nom}.`); }
  }
  // Minage
  const dispo = disponibilite(e);
  let btc = 0;
  for (const s of e.sites) {
    const S = site(s.type);
    x.loyers += S.loyer * d; e.tresorerie -= S.loyer * d;
    if (!s.ouvert) continue;
    let kwh = 0;
    for (const l of s.lots) {
      if (!l.livre) continue;
      const m = modele(l.modele);
      if (ctx.reseau) btc += btcParSeconde(l.n * m.th * dispo, ctx.reseau.difficulte, ctx.reseau.recompense, FRAIS_POOL) * 86400;
      kwh += l.n * m.w * dispo * PUE * 24 / 1000;
    }
    const prix = S.devise === 'USD' ? (ctx.eurUsd ? S.kwh / ctx.eurUsd : S.kwh / 1.15) : S.kwh;
    x.elec += kwh * prix; e.tresorerie -= kwh * prix;
  }
  if (btc && ctx.prixBTC) {
    x.ca += btc * ctx.prixBTC;
    if (e.vendreBTC) e.tresorerie += btc * ctx.prixBTC * 0.999; // vente au fil de l'eau, 0,1 % de frais
    else { e.btc += btc; e.btcCout += btc * ctx.prixBTC; }
  }
  // Amortissement des machines sur 3 ans
  for (const s of e.sites) {
    for (const l of s.lots) if (t - l.acheteLe < 3 * AN) x.amort += l.prix / (3 * 365.25);
    if (t - s.construitLe < 10 * AN) x.amort += s.travaux / (10 * 365.25); // bâtiment et installations sur 10 ans
  }
  // Salaires et charges fixes
  const masse = e.techniciens * TECHNICIEN.coutMois + e.traders.reduce((a, tr) => a + tr.salaire * (1 + CHARGES_PATRONALES) / 12, 0);
  x.salaires += masse * d; e.tresorerie -= masse * d;
  const fixes = chargesFixesMois(e);
  x.fixes += fixes * d; e.tresorerie -= fixes * d;
  // Traders : bêta au bitcoin, talent, hasard ; certains maquillent leurs pertes
  for (const tr of e.traders) {
    const beta = 0.2 + tr.risque * 0.8, vol = 0.08 + tr.risque * 0.45;
    const z = gaussR(R);
    const r = beta * rBTC + alpha(tr.competence) / 365 + vol * z / Math.sqrt(365) - 0.00002 * tr.risque; // frais de courtage
    const avant = tr.capital;
    tr.capital = Math.max(0, tr.capital * (1 + r) * (tr.fraude ? 1 - 0.0015 : 1)); // le fraudeur prend des risques cachés et perd
    const gain = tr.capital - avant;
    tr.pnlAn += gain; tr.pnlCumul += gain; x.trading += gain;
    if (!tr.fraude && tr.integrite < 0.4 && R() < 0.0015 * (1 - tr.integrite)) tr.fraude = true;
    tr.capitalAffiche = tr.fraude ? Math.max(tr.capitalAffiche * (1 + 0.0004), tr.capital) : tr.capital;
    if (tr.fraude && (tr.capitalAffiche - tr.capital > 0.3 * tr.capitalAffiche || R() < 0.004)) {
      const trou = tr.capitalAffiche - tr.capital;
      evts.push(`Scandale : ${tr.nom} cachait des pertes. Il manque ${Math.round(trou).toLocaleString('fr-FR')} € à son portefeuille. Licencié pour faute grave.`);
      e.tresorerie += tr.capital;
      e.traders = e.traders.filter(y => y !== tr);
      e.scandales = (e.scandales || 0) + 1;
    }
  }
  // Fonds, plateforme d'échange, Bourse
  if (e.fonds || e.plateforme || e.bourse) jourExpansion(e, x, t, r, ctx, R, evts, e.bourse ? valeurEntreprise(e, ctx.prixBTC, ctx.eurUsd, t) - e.compteCourant : 0);
  // Découvert : agios, puis liquidation judiciaire si ça dure
  if (e.tresorerie < 0) {
    const a = -e.tresorerie * AGIOS / 365;
    x.agios += a; e.tresorerie -= a;
    if (e.negatifDepuis == null) { e.negatifDepuis = t; evts.push(`${e.nom} est à découvert : renfloue la trésorerie, sinon c'est la liquidation dans ${LIQUIDATION_JOURS} jours.`); }
    else if (t - e.negatifDepuis >= LIQUIDATION_JOURS * JOUR) liquider(e, t, ctx, evts);
  } else e.negatifDepuis = null;
}
function gaussR(R) { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }

/** Clôture : impôt sur les sociétés (avec report des déficits), bonus des traders, nouvel exercice. */
export function cloturer(e, t) {
  const evts = [];
  const x = e.exercice;
  // Bonus des traders sur leurs gains annoncés de l'année
  let bonus = 0;
  for (const tr of e.traders) { const b = Math.max(0, tr.pnlAn) * tr.bonus; bonus += b; tr.pnlAn = 0; }
  if (bonus) { x.salaires += bonus * (1 + CHARGES_PATRONALES); e.tresorerie -= bonus * (1 + CHARGES_PATRONALES); }
  const res = resultat(x);
  let imposable = res;
  if (imposable > 0 && e.deficit > 0) { const imp = Math.min(e.deficit, imposable <= 1e6 ? imposable : 1e6 + (imposable - 1e6) * 0.5); imposable -= imp; e.deficit -= imp; }
  else if (imposable < 0) { e.deficit += -imposable; imposable = 0; }
  const is = Math.round(impotSocietes(imposable));
  e.tresorerie -= is;
  const net = res - is;
  if (net > 0) {
    const legale = Math.min(net * RESERVE_LEGALE, Math.max(0, e.capital * 0.1 - e.reserveLegale));
    e.reserveLegale += legale; e.reserves += net - legale;
  } else e.reserves += net;
  e.exercices.unshift({ ...x, resultat: res, is, net, bonus });
  if (e.exercices.length > 20) e.exercices.length = 20;
  e.exercice = nouvelExercice(t);
  evts.push(`${e.nom} : exercice ${x.an} clôturé. Résultat ${Math.round(res).toLocaleString('fr-FR')} €, impôt sur les sociétés ${is.toLocaleString('fr-FR')} €.`);
  return evts;
}

function liquider(e, t, ctx, evts) {
  // Tout est vendu à la casse (moitié de la valeur), les dettes sont payées, l'associé récupère ce qui reste.
  const actifs = e.btc * (ctx.prixBTC || 0) * 0.98 + e.traders.reduce((a, tr) => a + tr.capital, 0)
    + e.sites.reduce((a, s) => a + s.lots.reduce((b, l) => b + valeurLot(l, ctx.eurUsd, t) * 0.5, 0), 0);
  const solde = (e.tresorerie + actifs + valeurAmorcage(e) + e.sites.reduce((a, s) => a + valeurSite(s, t) * 0.3, 0)) * (e.parts ?? 1);
  e.liquidee = { t, rendu: Math.max(0, solde) };
  e.sites = []; e.traders = []; e.btc = 0; e.techniciens = 0; e.tresorerie = 0; e.fonds = null; e.plateforme = null;
  evts.push(`Liquidation judiciaire de ${e.nom}. ${solde > 0 ? `Il te revient ${Math.round(solde).toLocaleString('fr-FR')} €.` : 'Il ne te revient rien, ton compte courant d\'associé est perdu.'}`);
}

// ---------- Décisions du dirigeant ----------
export function construireSite(e, type, t) {
  const S = site(type);
  if (!S) return { erreur: 'Site inconnu.' };
  if (t < e.pretLe) return { erreur: 'La société n\'est pas encore immatriculée.' };
  if (e.tresorerie < S.travaux) return { erreur: `Il faut ${S.travaux.toLocaleString('fr-FR')} € de trésorerie pour les travaux.` };
  e.tresorerie -= S.travaux;
  const n = e.sites.filter(s => s.type === type).length + 1;
  const s = { id: `${type}-${t.toString(36)}`, type, nom: S.nom + (n > 1 ? ` n° ${n}` : ''), pretLe: t + S.delai * JOUR, ouvert: false, lots: [], travaux: S.travaux, construitLe: t };
  e.sites.push(s);
  return { site: s };
}

export function acheterMachines(e, siteId, modeleId, n, eurUsd, t) {
  const s = e.sites.find(x => x.id === siteId), m = modele(modeleId);
  if (!s || !m || !(n >= 1)) return { erreur: 'Choix invalide.' };
  if (!machinesAchetables(t).includes(m)) return { erreur: 'Machine indisponible.' };
  if (!eurUsd) return { erreur: 'Taux de change indisponible.' };
  const S = site(s.type);
  const kw = puissanceSite(s) + n * m.w * PUE / 1000;
  if (kw > S.kw) return { erreur: `Le site est limité à ${S.kw.toLocaleString('fr-FR')} kW : il reste de la place pour ${Math.floor((S.kw - puissanceSite(s)) / (m.w * PUE / 1000))} machines de ce modèle.` };
  const p = prixLot(m, n, eurUsd);
  if (e.tresorerie < p.total) return { erreur: `Il faut ${Math.round(p.total).toLocaleString('fr-FR')} € de trésorerie.` };
  e.tresorerie -= p.total;
  const lot = { modele: modeleId, n, prix: p.total, acheteLe: t, livreLe: Math.max(t, s.pretLe) + LIVRAISON_JOURS * JOUR, livre: false };
  s.lots.push(lot);
  return { lot, prix: p };
}

export function vendreLot(e, siteId, i, eurUsd, t) {
  const s = e.sites.find(x => x.id === siteId), l = s && s.lots[i];
  if (!l || !l.livre) return { erreur: 'Lot introuvable ou pas encore livré.' };
  const v = valeurLot(l, eurUsd, t);
  const vnc = l.prix * Math.max(0, 1 - (t - l.acheteLe) / (3 * AN)); // valeur restant à amortir
  e.exercice.plusValues += v - vnc;
  e.tresorerie += v;
  s.lots.splice(i, 1);
  return { montant: v };
}

export function changerTechniciens(e, n) {
  if (n < 0) return { erreur: 'Choix invalide.' };
  const nouveaux = Math.max(0, n - e.techniciens);
  const cout = nouveaux * TECHNICIEN.recrutement + Math.max(0, e.techniciens - n) * TECHNICIEN.coutMois; // un mois d'indemnité par départ
  e.tresorerie -= cout; e.exercice.salaires += cout;
  e.techniciens = n;
  return { cout };
}

export function embaucher(e, candidat, capital, t) {
  if (e.traders.length >= 30) return { erreur: 'Trente traders, c\'est déjà une vraie salle de marché.' };
  const frais = candidat.salaire * FRAIS_RECRUTEMENT;
  if (e.tresorerie < frais + capital) return { erreur: `Il faut ${Math.round(frais + capital).toLocaleString('fr-FR')} € de trésorerie (recrutement et capital confié).` };
  e.tresorerie -= frais + capital; e.exercice.salaires += frais;
  const tr = { ...candidat, capital, capitalAffiche: capital, pnlAn: 0, pnlCumul: 0, embaucheLe: t, fraude: false };
  e.traders.push(tr);
  e.embauches = { ...(e.embauches || {}), [candidat.id]: true };
  return { trader: tr };
}

/** Confier ou reprendre du capital (montant négatif = reprendre). */
export function allouer(e, idx, montant) {
  const tr = e.traders[idx];
  if (!tr) return { erreur: 'Trader introuvable.' };
  if (montant > 0 && e.tresorerie < montant) return { erreur: 'Pas assez de trésorerie.' };
  if (montant < 0 && -montant > tr.capitalAffiche) return { erreur: 'Il n\'a pas autant.' };
  if (montant < 0 && tr.fraude && -montant > tr.capital) {
    // Le trou apparaît quand on veut récupérer l'argent
    e.tresorerie += tr.capital;
    const trou = tr.capitalAffiche - tr.capital;
    e.traders.splice(idx, 1); e.scandales = (e.scandales || 0) + 1;
    return { scandale: `En voulant récupérer les fonds, tu découvres que ${tr.nom} cachait ${Math.round(trou).toLocaleString('fr-FR')} € de pertes. Licencié.` };
  }
  e.tresorerie -= montant;
  tr.capital += montant; tr.capitalAffiche += montant;
  return { ok: true };
}

export function licencier(e, idx) {
  const tr = e.traders[idx];
  if (!tr) return { erreur: 'Trader introuvable.' };
  const indemnite = tr.salaire * (1 + CHARGES_PATRONALES) / 12 * 2; // préavis et indemnité, environ deux mois
  e.tresorerie += tr.capital - indemnite; e.exercice.salaires += indemnite;
  e.traders.splice(idx, 1);
  const trou = tr.capitalAffiche - tr.capital;
  return { indemnite, trou: tr.fraude ? trou : 0 };
}

export function vendreBitcoins(e, prixBTC) {
  if (!e.btc || !prixBTC) return { erreur: 'Aucun bitcoin à vendre.' };
  const v = e.btc * prixBTC * 0.999;
  e.exercice.plusValues += v - e.btcCout;
  e.tresorerie += v; e.btc = 0; e.btcCout = 0;
  return { montant: v };
}

// ---------- Flux entre toi et ta société ----------
/** Apport en compte courant d'associé (prêt à ta société, remboursable sans impôt). */
export function apporter(partie, montant) {
  const e = partie.entreprise;
  if (!(montant > 0)) return { erreur: 'Montant invalide.' };
  if (partie.banque.solde < montant) return { erreur: 'Pas assez sur ton compte bancaire.' };
  partie.banque.solde -= montant; e.tresorerie += montant; e.compteCourant += montant;
  return { ok: true };
}
export function rembourser(partie, montant) {
  const e = partie.entreprise;
  if (!(montant > 0)) return { erreur: 'Montant invalide.' };
  if (montant > e.compteCourant) return { erreur: `Ton compte courant d'associé n'est que de ${Math.round(e.compteCourant).toLocaleString('fr-FR')} €.` };
  if (montant > e.tresorerie) return { erreur: 'Pas assez de trésorerie.' };
  e.tresorerie -= montant; e.compteCourant -= montant; partie.banque.solde += montant;
  return { ok: true };
}
/** Dividendes : seulement sur les bénéfices des exercices clôturés, flat tax prélevée. */
export function distribuer(partie, montant) {
  const e = partie.entreprise;
  if (!(montant > 0)) return { erreur: 'Montant invalide.' };
  if (montant > e.reserves) return { erreur: `Bénéfices distribuables : ${Math.max(0, Math.round(e.reserves)).toLocaleString('fr-FR')} € (exercices clôturés seulement).` };
  if (montant > e.tresorerie) return { erreur: 'Pas assez de trésorerie.' };
  e.tresorerie -= montant; e.reserves -= montant; e.dividendes += montant;
  const brut = montant * (e.parts ?? 1); // les autres actionnaires touchent leur part
  const net = brut * (1 - PFU);
  partie.banque.solde += net;
  return { net, impot: brut - net, brut };
}
