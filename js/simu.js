// Marché simulé au-delà d'aujourd'hui (parties en temps accéléré).
// À partir de l'instant où la partie dépasse le présent, les prix ne viennent plus de la plateforme :
// ils sont générés pas à pas (15 minutes), de façon réaliste et aléatoire, mais reproductible
// (même graine = même futur, ce qui permet de recalculer le passé de la partie à chaque ouverture).
//
// Modèle (paramètres à valider, voir DECISIONS.md) :
// - un facteur commun de marché (porté par le bitcoin) avec des phases haussières, baissières et
//   latérales qui s'enchaînent sur des mois, une volatilité qui s'auto-entretient (GARCH) et des krachs ;
// - chaque crypto suit le marché avec sa propre sensibilité (bêta) et sa part de hasard propre ;
// - des événements (piratages, régulation, ETF, mises à jour, halving…) font bouger les prix ;
// - l'euro-dollar, la difficulté du réseau Bitcoin et les frais évoluent aussi.

export const PAS = 15 * 60000;
const AN = 365.25 * 864e5;
const PAS_AN = AN / PAS;
const PAS_JOUR = 96;

// [volatilité annuelle, bêta au marché, dérive propre annuelle]
export const PARAMS = {
  BTC: [0.55, 1, 0], ETH: [0.72, 1.15, -0.03], SOL: [0.95, 1.35, -0.05], XRP: [0.85, 1.05, -0.06],
  BNB: [0.6, 0.85, -0.03], ADA: [0.9, 1.2, -0.08], DOGE: [1.05, 1.25, -0.08], LTC: [0.75, 1, -0.08],
  AVAX: [1, 1.35, -0.08], LINK: [0.9, 1.2, -0.06], DOT: [0.9, 1.2, -0.1], SHIB: [1.1, 1.3, -0.1]
};
const PARAM_DEFAUT = [0.9, 1.2, -0.08];

// Phases du marché : dérive annuelle (en log), multiplicateur de volatilité, durée moyenne (jours).
export const REGIMES = {
  haussier: { nom: 'haussier', derive: 0.6, vol: 0.85, duree: 270 },
  baissier: { nom: 'baissier', derive: -0.7, vol: 1.1, duree: 240 },
  lateral: { nom: 'latéral', derive: 0.05, vol: 0.6, duree: 120 }
};
const SUIVANT = {
  haussier: [['baissier', 0.6], ['lateral', 0.4]],
  baissier: [['lateral', 0.55], ['haussier', 0.45]],
  lateral: [['haussier', 0.5], ['baissier', 0.5]]
};
const GARCH = { a: 0.06, b: 0.93 };
const KRACHS_AN = 3, KRACH = [-0.025, 0.05], SAUTS_PROPRES_AN = 3, EVENEMENTS_AN = 12;

// Actualités possibles : titre, cible ('marche', 'BTC', ou '*' = une crypto au hasard), impact [min, max] en %.
export const ACTUALITES = [
  { titre: "Piratage d'une grande plateforme d'échange", texte: 'Des centaines de millions de dollars de cryptos dérobés, la confiance vacille.', cible: 'marche', impact: [-12, -5], poids: 2 },
  { titre: 'Un nouvel ETF approuvé aux États-Unis', texte: 'Les investisseurs institutionnels peuvent acheter {nom} en bourse.', cible: '*', impact: [8, 20], poids: 1 },
  { titre: "L'Union européenne durcit les règles sur les cryptos", texte: 'Nouvelles obligations pour les plateformes et les portefeuilles.', cible: 'marche', impact: [-6, -2], poids: 1 },
  { titre: 'Une multinationale ajoute du bitcoin à sa trésorerie', texte: "L'annonce fait grimper le cours.", cible: 'BTC', impact: [4, 10], poids: 2 },
  { titre: 'Panne majeure du réseau {nom}', texte: 'Les transactions sont bloquées plusieurs heures.', cible: '*', impact: [-18, -6], poids: 1 },
  { titre: 'La Fed relève ses taux par surprise', texte: 'Les actifs risqués reculent partout.', cible: 'marche', impact: [-7, -3], poids: 1 },
  { titre: 'Les banques centrales baissent leurs taux', texte: "L'argent moins cher profite aux cryptos.", cible: 'marche', impact: [3, 8], poids: 2 },
  { titre: '{nom} : mise à jour majeure réussie', texte: 'Le réseau devient plus rapide et moins cher.', cible: '*', impact: [5, 15], poids: 2 },
  { titre: 'Un stablecoin perd son ancrage au dollar', texte: 'Vent de panique sur tout le marché.', cible: 'marche', impact: [-18, -8], poids: 0.5, regime: 'baissier' },
  { titre: 'Rumeur : un grand pays veut interdire le minage', texte: 'Les mineurs et le bitcoin sont sous pression.', cible: 'BTC', impact: [-7, -3], poids: 1 },
  { titre: 'Un mème devient viral', texte: '{nom} s\'envole sur les réseaux sociaux.', cible: 'mème', impact: [15, 50], poids: 1 },
  { titre: 'Un fonds souverain investit dans les cryptos', texte: 'Le marché salue un signal fort.', cible: 'marche', impact: [5, 12], poids: 0.5, regime: 'haussier' },
  { titre: "Faillite d'un prêteur crypto", texte: 'Des milliers de clients ne peuvent plus retirer leurs fonds.', cible: 'marche', impact: [-12, -5], poids: 1 },
  { titre: '{nom} retiré de plusieurs plateformes', texte: 'Doutes sur sa conformité réglementaire.', cible: '*', impact: [-25, -10], poids: 0.5 },
  { titre: 'Partenariat entre {nom} et une grande banque', texte: 'Le projet gagne en crédibilité.', cible: '*', impact: [6, 18], poids: 1.5 },
  { titre: 'Un pays adopte le bitcoin comme monnaie officielle', texte: "Une première qui relance l'intérêt mondial.", cible: 'BTC', impact: [5, 12], poids: 0.5 },
  { titre: 'Afflux record dans les fonds crypto', texte: 'Les gros investisseurs reviennent sur le marché.', cible: 'marche', impact: [3, 9], poids: 2 }
];
const POIDS_TOTAL = ACTUALITES.reduce((s, a) => s + a.poids, 0);
const moyLog = a => (Math.log(1 + a.impact[0] / 100) + Math.log(1 + a.impact[1] / 100)) / 2;
// Effet moyen annuel des krachs et des actualités de marché sur le cours, retiré de la dérive.
const COMPENSATION = -(KRACHS_AN * KRACH[0] + EVENEMENTS_AN * ACTUALITES.filter(a => a.cible === 'marche').reduce((s, a) => s + a.poids * moyLog(a), 0) / POIDS_TOTAL);
const NOMS = { BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'XRP', BNB: 'BNB', ADA: 'Cardano', DOGE: 'Dogecoin', LTC: 'Litecoin', AVAX: 'Avalanche', LINK: 'Chainlink', DOT: 'Polkadot', SHIB: 'Shiba Inu' };

// ---------- Hasard reproductible ----------
function mulberry(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hash01(seed, k, i) { return mulberry((seed ^ Math.imul(k, 0x9E3779B1) ^ Math.imul(i + 1, 0x85EBCA77)) | 0)(); }
function normale(R) { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }
// Queues épaisses : de temps en temps, un mouvement bien plus fort que la normale (variance ramenée à 1).
const P_FORT = 0.03, NORME = 1 / Math.sqrt(1 + 8 * P_FORT);
function choc(R) { const z = normale(R); return (R() < P_FORT ? z * 3 : z) * NORME; }

/** Crée l'état d'une simulation (petit, enregistré dans la partie). */
export function creerSimulation({ debut, seed, prix, volumes = {}, stats0 = {}, eurUsd = 1.17, reseau = null }) {
  return {
    stats0: { ...stats0 },
    debut: Math.floor(debut / PAS) * PAS,
    seed: seed >>> 0,
    prix: { ...prix }, volumes: { ...volumes }, eurUsd,
    reseau: reseau ? { difficulte: reseau.difficulte, hauteur: reseau.hauteur, fraisMoyens: reseau.fraisMoyens } : { difficulte: 1.5e14, hauteur: 950000, fraisMoyens: 0.03 }
  };
}

// ---------- Générateur ----------
const caches = new Map();
function generateur(sim) {
  const cle = sim.seed + ':' + sim.debut + ':' + Object.keys(sim.prix).join(',');
  let g = caches.get(cle);
  if (!g) { g = nouveau(sim); caches.set(cle, g); if (caches.size > 4) caches.delete(caches.keys().next().value); }
  return g;
}

function nouveau(sim) {
  const syms = Object.keys(sim.prix);
  const bases = syms.map(s => s.replace(/EUR$/, ''));
  const p = bases.map(b => PARAMS[b] || PARAM_DEFAUT);
  const volM = PARAMS.BTC[0];
  const g = {
    sim, R: mulberry(sim.seed), syms, bases,
    vol: p.map(x => x[0]), beta: p.map(x => x[1]), derive: p.map(x => x[2]),
    idio: p.map(x => Math.sqrt(Math.max(0.0001, x[0] ** 2 - (x[1] * volM) ** 2))),
    k0: Math.floor(sim.debut / PAS), n: 0,
    lp: syms.map(s => Math.log(sim.prix[s])), closes: syms.map(() => []),
    regime: 'lateral', regimes: [], h: (volM * REGIMES.lateral.vol) ** 2 / PAS_AN,
    evts: [],
    fx: Math.log(sim.eurUsd), fxJ: [],
    reseau: [], hr: Math.log(sim.reseau.difficulte * 2 ** 32 / 600), frais: 0,
    prochainHalving: Math.ceil((sim.reseau.hauteur + 1) / 210000) * 210000, dernierHalving: null
  };
  g.regimes.push([0, g.regime]);
  return g;
}

function tempsDeHauteur(g, h) { return g.sim.debut + (h - g.sim.reseau.hauteur) * 600000; }
export function hauteurA(sim, t) { return Math.floor(sim.reseau.hauteur + Math.max(0, t - sim.debut) / 600000); }

function avancer(g) {
  const R = g.R, j = g.n, debutPas = (g.k0 + j) * PAS;
  const volM = PARAMS.BTC[0];
  // Halving du Bitcoin (toutes les 210 000 blocs, environ tous les 4 ans)
  if (debutPas >= tempsDeHauteur(g, g.prochainHalving)) {
    const recompense = 50 / 2 ** (g.prochainHalving / 210000);
    g.evts.push({ t: debutPas, titre: 'Halving du Bitcoin', texte: `La récompense des mineurs passe à ${String(recompense).replace('.', ',')} BTC par bloc. Historiquement, les mois suivants ont souvent été haussiers.`, impact: null });
    g.dernierHalving = debutPas;
    g.prochainHalving += 210000;
  }
  // Changement de phase du marché
  const reg = REGIMES[g.regime];
  const apresHalving = g.dernierHalving && debutPas - g.dernierHalving < 540 * 864e5;
  if (R() < PAS / (reg.duree * 864e5 * (apresHalving && g.regime === 'haussier' ? 1.5 : 1))) {
    let suiv = SUIVANT[g.regime];
    if (apresHalving) suiv = suiv.map(([n, q]) => [n, n === 'haussier' ? q + 0.3 : q]);
    const tot = suiv.reduce((s, x) => s + x[1], 0);
    let x = R() * tot;
    for (const [n, q] of suiv) { x -= q; if (x <= 0) { g.regime = n; break; } }
    g.regimes.push([j, g.regime]);
  }
  const r2 = REGIMES[g.regime];
  // Facteur de marché : volatilité qui s'auto-entretient (GARCH) et sauts
  const cible = (volM * r2.vol) ** 2 / PAS_AN;
  const eps = Math.sqrt(g.h) * choc(R);
  g.h = (1 - GARCH.a - GARCH.b) * cible + GARCH.a * eps * eps + GARCH.b * g.h;
  let marche = r2.derive / PAS_AN + eps;
  if (R() < KRACHS_AN / PAS_AN) marche += KRACH[0] + KRACH[1] * normale(R);
  marche += COMPENSATION / PAS_AN; // krachs et actualités compensés en moyenne : pas de dérive cachée
  // Actualités
  const chocs = new Array(g.syms.length).fill(0);
  if (R() < EVENEMENTS_AN / PAS_AN) {
    let x = R() * POIDS_TOTAL, a = ACTUALITES[0];
    for (const e of ACTUALITES) { x -= e.poids; if (x <= 0) { a = e; break; } }
    let i = -1;
    if (a.cible === 'BTC') i = g.bases.indexOf('BTC');
    else if (a.cible === 'mème') i = g.bases.indexOf(R() < 0.6 ? 'DOGE' : 'SHIB');
    else if (a.cible === '*') i = Math.floor(R() * g.syms.length);
    const pct = a.impact[0] + (a.impact[1] - a.impact[0]) * R();
    const lr = Math.log(1 + pct / 100);
    if (a.cible === 'marche') marche += lr;
    else if (i >= 0) chocs[i] += lr;
    if (a.regime) { g.regime = a.regime; g.regimes.push([j, g.regime]); }
    const nom = i >= 0 ? NOMS[g.bases[i]] || g.bases[i] : '';
    if (a.cible === 'marche' || i >= 0) g.evts.push({ t: debutPas, titre: a.titre.replace('{nom}', nom), texte: a.texte.replace('{nom}', nom), impact: { cible: a.cible === 'marche' ? 'marché' : g.bases[i], pct: Math.round(pct) } });
  }
  // Chaque crypto : bêta × marché + part propre + sauts propres
  for (let i = 0; i < g.syms.length; i++) {
    let r = g.beta[i] * marche + (g.derive[i] - 0.5 * g.idio[i] ** 2) / PAS_AN + g.idio[i] / Math.sqrt(PAS_AN) * choc(R) + chocs[i];
    if (R() < SAUTS_PROPRES_AN / PAS_AN) r += 0.12 * normale(R);
    g.lp[i] += r;
    g.closes[i].push(Math.exp(g.lp[i]));
  }
  // Une fois par jour : euro-dollar, réseau Bitcoin
  if (j % PAS_JOUR === 0) {
    g.fx += 0.07 / Math.sqrt(365) * normale(R) + 0.5 * (Math.log(1.1) - g.fx) / 365;
    g.fxJ.push(Math.exp(g.fx));
    const ib = g.bases.indexOf('BTC');
    const cl = ib >= 0 ? g.closes[ib] : null;
    const tend = cl && cl.length > 90 * PAS_JOUR ? Math.log(cl[cl.length - 1] / cl[cl.length - 1 - 90 * PAS_JOUR]) : 0;
    // La puissance du réseau suit le cours avec retard : +25 %/an de fond, plus la tendance des 3 derniers mois.
    g.hr += 0.25 / 365 + 0.35 * tend / 90 + 0.01 * normale(R);
    g.frais = Math.max(-1.5, Math.min(1.5, g.frais * 0.97 + 0.15 * normale(R)));
    g.reseau.push({ hr: g.hr, frais: g.frais });
  }
  g.n++;
}

function assurer(g, j) { while (g.n <= j) avancer(g); }
function indice(g, t) { return Math.floor(t / PAS) - g.k0; }

// ---------- Lecture ----------
/** Bougie de 15 min n° j : ouverture, plus haut, plus bas, clôture, volume en euros. */
function pasBougie(g, i, j) {
  assurer(g, j);
  const c = g.closes[i][j], o = j > 0 ? g.closes[i][j - 1] : g.sim.prix[g.syms[i]];
  const sig = g.vol[i] / Math.sqrt(PAS_AN);
  const s = g.sim.seed;
  const h = Math.max(o, c) * Math.exp(Math.abs(normale(mulberry((s ^ Math.imul(j, 2654435761) ^ i * 97) | 0))) * sig * 0.6);
  const l = Math.min(o, c) * Math.exp(-Math.abs(normale(mulberry((s ^ Math.imul(j, 2246822519) ^ i * 131) | 0))) * sig * 0.6);
  const base = (g.sim.volumes[g.syms[i]] || 1e6) / PAS_JOUR;
  const q = base * (0.6 + 2.5 * Math.abs(Math.log(c / o)) / sig) * (0.8 + 0.4 * hash01(s, j, i));
  return { o, h, l, c, q };
}

export function couvre(sim, s, t) { return !!sim && t >= sim.debut && s in sim.prix; }

/** Prix simulé à l'instant t (interpolé dans le pas en cours). */
export function prixSimu(sim, s, t) {
  const g = generateur(sim), i = g.syms.indexOf(s);
  if (i < 0) return null;
  const j = indice(g, t);
  if (j < 0) return sim.prix[s];
  const b = pasBougie(g, i, j);
  const f = (t - (g.k0 + j) * PAS) / PAS;
  return b.o + (b.c - b.o) * f;
}

/**
 * Bougie simulée d'intervalle I (ms, multiple de 15 min) contenant t. Si « jusqua » est donné,
 * la bougie s'arrête à cet instant (bougie en cours, sans voir le futur).
 */
export function bougieSimu(sim, s, t, I = PAS, jusqua = null) {
  const g = generateur(sim), i = g.syms.indexOf(s);
  if (i < 0) return null;
  const debut = Math.max(Math.floor(t / I) * I, sim.debut);
  const finI = Math.floor(t / I) * I + I;
  const fin = jusqua != null ? Math.min(finI, jusqua) : finI;
  let o = null, h = -Infinity, l = Infinity, c = null, q = 0;
  for (let tt = debut; tt < fin; tt += PAS) {
    const j = indice(g, tt);
    let b = pasBougie(g, i, j);
    if (jusqua != null && tt + PAS > jusqua) { // pas en cours : seulement jusqu'à maintenant
      const p = prixSimu(sim, s, jusqua);
      b = { o: b.o, h: Math.max(b.o, p), l: Math.min(b.o, p), c: p, q: b.q * (jusqua - tt) / PAS };
    }
    if (o === null) o = b.o;
    h = Math.max(h, b.h); l = Math.min(l, b.l); c = b.c; q += b.q;
  }
  return o === null ? null : { t: Math.floor(t / I) * I, o, h, l, c, q, fin: finI };
}

/** Bougies simulées entières d'intervalle I entre debut et fin (la dernière peut être en cours). */
export function bougiesSimu(sim, s, I, debut, fin) {
  const r = [];
  for (let t = Math.max(Math.floor(debut / I) * I, Math.floor(sim.debut / I) * I); t < fin; t += I) {
    const b = bougieSimu(sim, s, Math.max(t, sim.debut), I, t + I > fin ? fin : null);
    if (b) r.push(b);
  }
  return r;
}

/** Statistiques sur 24 h (ouverture, plus haut, plus bas, volume) à l'instant t. */
export function stats24Simu(sim, s, t, avant = null) {
  const d = t - 864e5;
  const bs = bougiesSimu(sim, s, PAS, Math.max(d, sim.debut), t);
  if (!bs.length) return null;
  let o = d < sim.debut && avant ? avant.o : bs[0].o;
  let h = Math.max(...bs.map(b => b.h)), l = Math.min(...bs.map(b => b.l));
  if (d < sim.debut && avant) { h = Math.max(h, avant.h); l = Math.min(l, avant.l); }
  const q = bs.reduce((x, b) => x + b.q, 0) * (d < sim.debut ? 864e5 / Math.max(PAS, t - sim.debut) : 1);
  return { o, h, l, q };
}

/** Actualités simulées entre deux instants (ordre chronologique). */
export function actualitesSimu(sim, debut, fin) {
  const g = generateur(sim);
  assurer(g, indice(g, fin));
  return g.evts.filter(e => e.t >= debut && e.t < fin);
}

/** Phase du marché à l'instant t (pour l'affichage des tendances). */
export function phaseSimu(sim, t) {
  const g = generateur(sim), j = indice(g, t);
  assurer(g, j);
  let r = 'lateral';
  for (const [k, n] of g.regimes) { if (k <= j) r = n; else break; }
  return REGIMES[r].nom;
}

export function eurUsdSimu(sim, t) {
  const g = generateur(sim), j = indice(g, t);
  if (j < 0) return sim.eurUsd;
  assurer(g, j);
  return g.fxJ[Math.floor(j / PAS_JOUR)] || sim.eurUsd;
}

/** Réseau Bitcoin simulé : difficulté ajustée tous les 2 016 blocs, hauteur, frais moyens. */
export function reseauSimu(sim, t) {
  const g = generateur(sim), j = Math.max(0, indice(g, t));
  assurer(g, j);
  const hauteur = hauteurA(sim, t);
  // La difficulté ne change qu'aux ajustements (tous les 2 016 blocs, environ 2 semaines)
  const ajust = Math.floor(hauteur / 2016) * 2016;
  const tAjust = Math.max(sim.debut, tempsDeHauteur(g, ajust));
  const jA = Math.max(0, Math.floor(indice(g, tAjust) / PAS_JOUR));
  const r = g.reseau[Math.min(jA, g.reseau.length - 1)];
  const difficulte = tAjust <= sim.debut ? sim.reseau.difficulte : Math.exp(r.hr) * 600 / 2 ** 32;
  const jJ = Math.floor(j / PAS_JOUR);
  const frais = sim.reseau.fraisMoyens * Math.exp((g.reseau[Math.min(jJ, g.reseau.length - 1)] || { frais: 0 }).frais);
  const subvention = 50 / 2 ** Math.floor(hauteur / 210000);
  return { difficulte, hashrate: Math.exp((g.reseau[Math.min(jJ, g.reseau.length - 1)] || { hr: g.hr }).hr), hauteur, subvention, fraisMoyens: frais, recompense: subvention + frais, simule: true, date: t };
}
