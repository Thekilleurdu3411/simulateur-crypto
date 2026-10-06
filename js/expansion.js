// L'entreprise grandit (V0.21) : fonds d'investissement ouvert aux clients, plateforme d'échange, introduction en Bourse.
// Appelé chaque jour par entreprise.js ; ne dépend pas de la partie (testé).

const JOUR = 864e5, AN = 365.25 * JOUR;
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const mns = x => (x / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// ---------- Agréments (AMF) ----------
// Montants et délais : ordres de grandeur 2026, à vérifier.
export const AGREMENTS = {
  fonds: { nom: 'Société de gestion de portefeuille (agrément AMF)', dossier: 40000, fondsPropres: 125000, delai: 180 },
  plateforme: { nom: 'Plateforme d\'échange (agrément MiCA de prestataire de services sur crypto-actifs)', dossier: 250000, fondsPropres: 150000, delai: 270 }
};

// ---------- Fonds ----------
export const STRATEGIES = {
  prudente: { nom: 'Prudente', poids: { BTC: 0.3, ETH: 0, ALT: 0 }, monetaire: 0.7, desc: '30 % bitcoin, 70 % placements monétaires' },
  equilibree: { nom: 'Équilibrée', poids: { BTC: 0.6, ETH: 0.2, ALT: 0 }, monetaire: 0.2, desc: '60 % bitcoin, 20 % ether, 20 % monétaire' },
  offensive: { nom: 'Offensive', poids: { BTC: 0.5, ETH: 0.3, ALT: 0.2 }, monetaire: 0, desc: '50 % bitcoin, 30 % ether, 20 % autres cryptos' }
};
export const FRAIS_FONDS = { gestion: 0.02, performance: 0.2, depositaire: 0.0005, rcci: 6500 }; // RCCI : responsable de la conformité (coût employeur par mois)
export const TAUX_MONETAIRE = 0.025;
export const MARKETING = [0, 5000, 20000, 100000]; // € par mois

export function nouveauFonds(t) {
  const A = AGREMENTS.fonds;
  return { statut: 'instruction', pretLe: t + A.delai * JOUR, nom: null, strategie: 'equilibree', gerant: null, vl: 100, hwm: 100, partsClients: 0, partsSociete: 0, marketing: 0, historique: [], an: new Date(t).getUTCFullYear() };
}
export const encours = f => (f.partsClients + f.partsSociete) * f.vl;
/** Performance sur un an glissant (d'après les relevés mensuels de la valeur liquidative). */
export function perf12(f) { const h = f.historique; return h.length >= 2 ? f.vl / h[Math.max(0, h.length - 13)] - 1 : 0; }

function jourFonds(e, x, t, r, gerant, rep, R, evts) {
  const f = e.fonds;
  if (f.statut === 'instruction') {
    if (t >= f.pretLe) { f.statut = 'actif'; evts.push(`Agrément AMF obtenu : ta société de gestion peut lancer son fonds.`); (e.flash || (e.flash = [])).push({ de: 'agnes', texte: `L'AMN délivre un nouvel agrément de société de gestion à ${e.nom}. Bienvenue aux épargnants avertis.` }); }
    return;
  }
  const S = STRATEGIES[f.strategie];
  const a = gerant ? (gerant.competence - 0.62) * 0.35 : -0.02;
  const z = gauss(R);
  const rj = S.poids.BTC * r.BTC + S.poids.ETH * r.ETH + S.poids.ALT * r.ALT + S.monetaire * TAUX_MONETAIRE / 365 + a / 365 + 0.04 * z / Math.sqrt(365);
  f.vl *= (1 + rj) * (1 - FRAIS_FONDS.gestion / 365);
  const clients = f.partsClients * f.vl;
  const gestion = clients * FRAIS_FONDS.gestion / 365;
  x.gestion = (x.gestion || 0) + gestion; e.tresorerie += gestion;
  // Coûts : conformité, dépositaire, marketing
  const couts = FRAIS_FONDS.rcci / 30.4375 + encours(f) * FRAIS_FONDS.depositaire / 365 + f.marketing / 30.4375;
  x.activites = (x.activites || 0) + couts; e.tresorerie -= couts;
  // Souscriptions et rachats des clients
  const p = perf12(f);
  const entrees = f.marketing / 30.4375 * 30 * (1 + borne(p, -0.5, 1)) * borne(rep / 50, 0.2, 2) + clients * 0.0002 * Math.max(0, p);
  const sorties = clients * (p < -0.15 ? 0.003 : 0.0003);
  f.partsClients = Math.max(0, f.partsClients + (entrees - sorties) / f.vl);
  // Commission de performance au 1er janvier, au-dessus du plus haut historique
  const an = new Date(t).getUTCFullYear();
  if (an !== f.an) {
    f.an = an;
    if (f.vl > f.hwm) {
      const com = (f.vl - f.hwm) * FRAIS_FONDS.performance * f.partsClients;
      f.vl -= (f.vl - f.hwm) * FRAIS_FONDS.performance * f.partsClients / (f.partsClients + f.partsSociete || 1);
      x.gestion = (x.gestion || 0) + com; e.tresorerie += com;
      if (com > 1) evts.push(`Commission de performance du fonds : ${Math.round(com).toLocaleString('fr-FR')} €.`);
    }
    f.hwm = Math.max(f.hwm, f.vl);
  }
  if (new Date(t).getUTCDate() === 1) { f.historique.push(f.vl); if (f.historique.length > 24) f.historique.shift(); }
}

/** Placer ou retirer l'argent de la société dans son propre fonds (amorçage). */
export function amorcer(e, montant) {
  const f = e.fonds;
  if (!f || f.statut !== 'actif') return { erreur: 'Le fonds n\'est pas encore lancé.' };
  if (montant > 0 && e.tresorerie < montant) return { erreur: 'Pas assez de trésorerie.' };
  if (montant < 0 && -montant > f.partsSociete * f.vl) return { erreur: 'La société n\'a pas autant dans le fonds.' };
  f.partsSociete += montant / f.vl; e.tresorerie -= montant;
  return { ok: true };
}

// ---------- Plateforme d'échange ----------
export const SECURITE = {
  faible: { nom: 'Minimale', cout: 3000, piratage: 0.0008 },
  standard: { nom: 'Standard', cout: 20000, piratage: 0.0002 },
  renforcee: { nom: 'Renforcée', cout: 80000, piratage: 0.00003 }
};
export const PLATEFORME = { cac: 90, revenuClientMois: 6, depotsParClient: 2000, salarieMois: 6500, salariesBase: 8, clientsParSalarie: 4000, serveurClientMois: 0.25, desabonnement: 0.0007 };

export function nouvellePlateforme(t) {
  return { statut: 'instruction', pretLe: t + AGREMENTS.plateforme.delai * JOUR, clients: 0, marketing: 20000, securite: 'standard', piratages: 0 };
}
export const salariesPlateforme = p => (p.statut === 'actif' ? PLATEFORME.salariesBase + Math.floor(p.clients / PLATEFORME.clientsParSalarie) : 0);

function jourPlateforme(e, x, t, r, rep, R, evts) {
  const p = e.plateforme, P = PLATEFORME;
  if (p.statut === 'instruction') {
    if (t >= p.pretLe) { p.statut = 'actif'; evts.push('Agrément MiCA obtenu : ta plateforme d\'échange ouvre ses portes.'); (e.flash || (e.flash = [])).push({ de: 'yasmine', texte: `Un nouveau concurrent, ${e.nom}, ouvre sa plateforme. La concurrence, c'est sain. Kryptal reste devant 😉` }); }
    return;
  }
  // Clients : publicité (coût d'acquisition qui monte avec la taille), bouche-à-oreille, départs
  const cac = P.cac * (1 + p.clients / 500000);
  const nouveaux = p.marketing / 30.4375 / cac * borne(rep / 50, 0.2, 2) + p.clients * 0.0004 * borne(rep / 50, 0, 2);
  p.clients = Math.max(0, p.clients + nouveaux - p.clients * P.desabonnement);
  // Revenus : commissions, plus fortes quand le marché bouge
  const activite = 1 + 15 * Math.abs(r.BTC);
  const ca = p.clients * P.revenuClientMois / 30.4375 * activite;
  x.plateforme = (x.plateforme || 0) + ca; e.tresorerie += ca;
  const S = SECURITE[p.securite];
  const couts = (salariesPlateforme(p) * P.salarieMois + p.clients * P.serveurClientMois + S.cout + p.marketing) / 30.4375;
  x.activites = (x.activites || 0) + couts; e.tresorerie -= couts;
  // Piratage : la plateforme rembourse ses clients
  if (p.clients > 100 && R() < S.piratage) {
    const vol = p.clients * P.depotsParClient * (0.03 + R() * 0.12);
    x.pertes = (x.pertes || 0) + vol; e.tresorerie -= vol;
    p.clients *= 0.7; p.piratages++;
    evts.push(`Piratage de ta plateforme : ${Math.round(vol).toLocaleString('fr-FR')} € volés, remboursés aux clients. 30 % des clients partent.`);
    (e.flash || (e.flash = [])).push({ de: 'marc', texte: `EXCLUSIF : la plateforme ${e.nom} victime d'un piratage. ${mns(vol)} M€ dérobés. Les clients seront remboursés, selon la direction.` });
    e.reputationChoc = (e.reputationChoc || 0) - 15;
  }
}

// ---------- Introduction en Bourse ----------
export const BOURSE = { valeurMin: 20e6, exercicesMin: 2, delai: 120, fixe: 300000, commission: 0.07, flottant: 0.25, per: 15, actions: 10e6, vol: 0.6, decote: 0.03 };

/** Valeur de marché « juste » des fonds propres : actif net, ou 15 fois le dernier bénéfice net s'il est plus élevé. */
export function valeurJuste(e, valeurNette) {
  const dernier = e.exercices[0];
  return Math.max(valeurNette, dernier && dernier.net > 0 ? dernier.net * BOURSE.per : 0);
}
export function conditionsBourse(e, valeurNette) {
  if (e.bourse) return e.bourse.cotee ? 'Déjà cotée.' : 'Introduction en préparation.';
  if (e.exercices.length < BOURSE.exercicesMin) return `Il faut ${BOURSE.exercicesMin} années de comptes clôturées.`;
  if (valeurJuste(e, valeurNette) < BOURSE.valeurMin) return `La société doit valoir au moins ${(BOURSE.valeurMin / 1e6).toLocaleString('fr-FR')} M€.`;
  if (e.tresorerie < BOURSE.fixe) return `Il faut ${BOURSE.fixe.toLocaleString('fr-FR')} € de trésorerie (banque conseil, avocats, auditeurs).`;
  return null;
}
export function preparerBourse(e, t, valeurNette) {
  const c = conditionsBourse(e, valeurNette);
  if (c) return { erreur: c };
  e.tresorerie -= BOURSE.fixe; e.exercice.activites = (e.exercice.activites || 0) + BOURSE.fixe;
  e.bourse = { cotee: false, pretLe: t + BOURSE.delai * JOUR };
  return { ok: true };
}

function jourBourse(e, x, t, r, valeurNette, R, evts) {
  const b = e.bourse;
  const juste = Math.max(1, valeurJuste(e, valeurNette));
  if (!b.cotee) {
    if (t < b.pretLe) return;
    // Introduction : 25 % d'actions nouvelles, prix fixé sur la valeur juste et le moral du marché
    const pre = juste * (0.85 + 0.3 * R());
    const levee = pre * BOURSE.flottant / (1 - BOURSE.flottant);
    const frais = levee * BOURSE.commission;
    e.tresorerie += levee - frais; x.activites = (x.activites || 0) + frais;
    e.parts = (e.parts ?? 1) * (1 - BOURSE.flottant);
    Object.assign(b, { cotee: true, le: t, capi: pre + levee, prixIntro: (pre + levee) / BOURSE.actions, levee });
    evts.push(`${e.nom} entre en Bourse sur Euronext Growth : ${mns(levee)} M€ levés, capitalisation ${mns(pre + levee)} M€.`);
    (e.flash || (e.flash = [])).push({ de: 'marc', texte: `${e.nom} fait son entrée en Bourse : ${Math.round((pre + levee) / 1e6)} M€ de capitalisation. Les débuts sont scrutés.` });
    return;
  }
  // Cours : suit le bitcoin, revient vers la valeur juste, et bouge beaucoup
  const z = gauss(R);
  b.capi *= Math.exp(0.9 * r.BTC + 0.01 * Math.log(juste / b.capi) + BOURSE.vol * z / Math.sqrt(365) - BOURSE.vol ** 2 / 730);
}
export const cours = e => (e.bourse && e.bourse.cotee ? e.bourse.capi / BOURSE.actions : null);

/** Vendre une partie de tes actions (en points de capital, ex. 0,05 = 5 %). Renvoie le net après flat tax. */
export function vendreActions(partie, part, pfu) {
  const e = partie.entreprise, b = e && e.bourse;
  if (!b || !b.cotee) return { erreur: 'La société n\'est pas cotée.' };
  if (!(part > 0) || part > (e.parts ?? 1) - 0.0001) return { erreur: 'Tu n\'as pas autant d\'actions.' };
  const brut = b.capi * part * (1 - BOURSE.decote);
  const revient = e.capital * part / (e.partsInitiales || 1);
  const impot = Math.max(0, brut - revient) * pfu;
  e.parts -= part;
  partie.banque.solde += brut - impot;
  return { brut, impot, net: brut - impot };
}

// ---------- Une journée ----------
/** Appelé par entreprise.js. r : rendements du jour { BTC, ETH, ALT } ; ctx.reputation : réputation du joueur (0 à 100). */
export function jourExpansion(e, x, t, r, ctx, R, evts, valeurNette) {
  const rep = ctx.reputation ?? 50;
  if (e.fonds) jourFonds(e, x, t, r, e.traders.find(tr => tr.id === e.fonds.gerant), rep, R, evts);
  if (e.plateforme) jourPlateforme(e, x, t, r, rep, R, evts);
  if (e.bourse) jourBourse(e, x, t, r, valeurNette, R, evts);
}

/** Valeur des parts du fonds détenues par la société. */
export const valeurAmorcage = e => (e.fonds && e.fonds.statut === 'actif' ? e.fonds.partsSociete * e.fonds.vl : 0);

function gauss(R) { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }
