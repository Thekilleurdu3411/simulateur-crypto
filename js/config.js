// Données fixes du jeu : difficultés, cryptos, profils.
// Les prix ne sont jamais ici : ils viennent toujours du marché réel.

export const VERSION = '0.20.0';

// Point d'accès public de Binance réservé aux données de marché (sans compte, sans clé).
export const API_REST = 'https://data-api.binance.vision';
export const API_WS = 'wss://data-stream.binance.vision';

// Délai réel de vérification d'identité sur une plateforme (en minutes),
// divisé par la vitesse du temps de la difficulté.
export const KYC_MINUTES_REEL = 20;

export const DIFFICULTES = {
  decouverte: {
    id: 'decouverte', nom: 'Découverte', ligne: 'Pour apprendre sans stress',
    capital: 10000, temps: 10, minage: 4, elec: 0.5, score: 0.25,
    frais: 0, execution: 'milieu', aides: true, pannes: 0.1, bruit: 'off', protectionAbsence: true, levierMax: 0, liquidationAbsence: false, impots: 'off', vitesseMax: 10080,
    effets: ['Temps accéléré à volonté (jusqu\'à 1 min = 1 semaine), minage ×4', 'Électricité −50 %, ni frais ni impôts', 'Pannes très rares', 'Aucune perte pendant ton absence']
  },
  investisseur: {
    id: 'investisseur', nom: 'Investisseur', ligne: 'Réaliste, avec un coup de pouce',
    capital: 5000, temps: 4, minage: 2, elec: 0.75, score: 0.5,
    frais: 0.0005, execution: 'meilleur', aides: true, pannes: 0.5, bruit: 'alertes', protectionAbsence: false, levierMax: 5, liquidationAbsence: false, impots: 'preleve', vitesseMax: 10080,
    effets: ['Temps accéléré (jusqu\'à 1 min = 1 semaine), minage ×2', 'Électricité −25 %, frais divisés par deux', 'Flat tax prélevée automatiquement', 'Levier ×5 max, alerte avant liquidation']
  },
  expert: {
    id: 'expert', nom: 'Expert', ligne: 'Presque tout est réel',
    capital: 2000, temps: 2, minage: 1.25, elec: 1, score: 0.75,
    frais: 0.001, execution: 'carnet', aides: true, pannes: 1, bruit: 'reel', protectionAbsence: false, levierMax: 125, liquidationAbsence: true, impots: 'auto', vitesseMax: 1440,
    effets: ['Temps accéléré (jusqu\'à 1 min = 1 jour), minage ×1,25', 'Électricité, frais et pannes réels', 'Impôts calculés pour toi', 'Une seule sauvegarde']
  },
  realite: {
    id: 'realite', nom: 'Réalité', ligne: 'La réalité absolue, sans aide',
    capital: 1000, temps: 1, minage: 1, elec: 1, score: 1,
    frais: 0.001, execution: 'carnet', aides: false, pannes: 1, bruit: 'reel', protectionAbsence: false, levierMax: 125, liquidationAbsence: true, impots: 'manuel', vitesseMax: 1,
    effets: ['Temps réel, marché en direct, aucun coup de pouce', 'Aucune estimation de rentabilité', 'Déclaration fiscale à remplir toi-même', 'Une sauvegarde, aucun retour arrière']
  }
};

// Réglages avancés : tout multiplicateur est libre ; la moindre modification rend la partie « Personnalisée ».
export const REGLAGES = [
  { cle: 'vitesseMax', nom: 'Vitesse maximale du temps', aide: 'Au-delà du temps réel, tu règles la vitesse en jeu (pause comprise) et le marché passe en rejeu accéléré puis en simulation au-delà d\'aujourd\'hui.', type: 'choix', options: [[1, 'Temps réel'], [60, '1 min = 1 h'], [360, '1 min = 6 h'], [1440, '1 min = 1 jour'], [10080, '1 min = 1 sem.']] },
  { cle: 'minage', nom: 'Multiplicateur de minage', aide: 'Multiplie les gains de toutes tes machines.', type: 'nombre', min: 0.25, max: 10, pas: 0.25, unite: '×' },
  { cle: 'elec', nom: "Prix de l'électricité", aide: 'En pourcentage du tarif réel.', type: 'nombre', min: 0, max: 200, pas: 5, unite: '%', echelle: 100 },
  { cle: 'frais', nom: 'Frais de trading', aide: 'Commission par ordre au comptant (réel : 0,10 %).', type: 'nombre', min: 0, max: 0.5, pas: 0.01, unite: '%', echelle: 100 },
  { cle: 'execution', nom: 'Exécution des ordres au marché', type: 'choix', options: [['milieu', 'Prix moyen'], ['meilleur', 'Meilleur prix'], ['carnet', 'Carnet réel']] },
  { cle: 'pannes', nom: 'Fréquence des pannes', aide: 'Par rapport aux taux de panne réels.', type: 'nombre', min: 0, max: 3, pas: 0.1, unite: '×' },
  { cle: 'bruit', nom: 'Voisinage et alertes', type: 'choix', options: [['off', 'Aucun'], ['alertes', 'Alertes'], ['reel', 'Réel']] },
  { cle: 'protectionAbsence', nom: 'Aucune panne pendant ton absence', type: 'bool' },
  { cle: 'levierMax', nom: 'Levier maximum des perpétuels', aide: '0 désactive les dérivés.', type: 'choix', options: [[0, 'Aucun'], [2, '×2'], [5, '×5'], [10, '×10'], [20, '×20'], [50, '×50'], [125, '×125']] },
  { cle: 'liquidationAbsence', nom: 'Liquidation possible pendant ton absence', type: 'bool' },
  { cle: 'impots', nom: 'Impôts', type: 'choix', options: [['off', 'Aucun'], ['preleve', 'Prélevés'], ['auto', 'Automatiques'], ['manuel', 'À déclarer']] },
  { cle: 'aides', nom: 'Estimations de rentabilité', type: 'bool' }
];

/** Garde seulement les réglages valides et différents de la difficulté de base. */
export function nettoyerReglages(base, r) {
  const d = DIFFICULTES[base], sortie = {};
  for (const g of REGLAGES) {
    if (!r || !(g.cle in r)) continue;
    let v = r[g.cle];
    if (g.type === 'nombre') { v = Number(v); if (!Number.isFinite(v)) continue; const ech = g.echelle || 1; v = Math.min(g.max, Math.max(g.min, v * ech)) / ech; v = Math.round(v * 1e6) / 1e6; }
    else if (g.type === 'bool') v = !!v;
    else if (!g.options.some(o => o[0] === v)) continue;
    if (v !== d[g.cle]) sortie[g.cle] = v;
  }
  return sortie;
}

/** Règles effectives d'une partie : difficulté de base et réglages avancés. */
export function reglesDe(partie) {
  const base = DIFFICULTES[partie.difficulte] || DIFFICULTES.expert;
  const r = partie.reglages;
  const acc = partie.horloge ? { temps: 1 } : {}; // temps accéléré : les durées restent réelles
  if (!r || !Object.keys(r).length) return partie.horloge ? { ...base, ...acc } : base;
  return { ...base, ...r, ...acc, nom: 'Personnalisée', base: base.nom, personnalisee: true };
}


// Paires en euros sur la plateforme. Une paire absente du marché réel est simplement masquée.
export const CRYPTOS = [
  { s: 'BTCEUR', base: 'BTC', nom: 'Bitcoin' },
  { s: 'ETHEUR', base: 'ETH', nom: 'Ethereum' },
  { s: 'SOLEUR', base: 'SOL', nom: 'Solana' },
  { s: 'XRPEUR', base: 'XRP', nom: 'XRP' },
  { s: 'BNBEUR', base: 'BNB', nom: 'BNB' },
  { s: 'ADAEUR', base: 'ADA', nom: 'Cardano' },
  { s: 'DOGEEUR', base: 'DOGE', nom: 'Dogecoin' },
  { s: 'LTCEUR', base: 'LTC', nom: 'Litecoin' },
  { s: 'AVAXEUR', base: 'AVAX', nom: 'Avalanche' },
  { s: 'LINKEUR', base: 'LINK', nom: 'Chainlink' },
  { s: 'DOTEUR', base: 'DOT', nom: 'Polkadot' },
  { s: 'SHIBEUR', base: 'SHIB', nom: 'Shiba Inu' }
];

export const SITUATIONS = [
  { id: 'sans', nom: 'Sans emploi' },
  { id: 'etudiant', nom: 'Étudiant' },
  { id: 'alternant', nom: 'Alternant' },
  { id: 'salarie', nom: 'Salarié' }
];

export const LOGEMENTS = [
  { id: 'parents', nom: 'Chez tes parents', plus: 'Pas de loyer', moins: 'Peu de place, compteur partagé, aucun ASIC bruyant' },
  { id: 'appart', nom: 'Appartement en location', plus: 'Indépendance, choix de la ville', moins: 'Loyer, voisins sensibles au bruit, compteur limité' },
  { id: 'maison', nom: 'Maison avec garage', plus: 'Place et puissance électrique possibles', moins: 'Loyer ou crédit plus élevé' }
];

export const MODES_VIE = [
  { id: 'econome', nom: 'Économe' },
  { id: 'normal', nom: 'Normal' },
  { id: 'confort', nom: 'Confortable' }
];

// Métiers dont le salaire net réel est sourcé (voir js/vie.js et DECISIONS.md).
import { METIERS_SALAIRES } from './vie.js';
export const METIERS = METIERS_SALAIRES.map(([secteur, liste]) => [secteur, liste.map(m => m[0])]);

export const INTERVALLES = [
  { id: '15m', nom: '15 min', limite: 96 },
  { id: '1h', nom: '1 h', limite: 96 },
  { id: '4h', nom: '4 h', limite: 90 },
  { id: '1d', nom: '1 J', limite: 90 },
  { id: '1w', nom: '1 S', limite: 80 }
];
