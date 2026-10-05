// Données fixes du jeu : difficultés, cryptos, profils.
// Les prix ne sont jamais ici : ils viennent toujours du marché réel.

export const VERSION = '0.3.0';

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
    frais: 0, execution: 'milieu', aides: true,
    effets: ['Temps hors marché ×10, minage ×4', 'Électricité −50 %, ni frais ni impôts', 'Pannes très rares', 'Aucune perte pendant ton absence']
  },
  investisseur: {
    id: 'investisseur', nom: 'Investisseur', ligne: 'Réaliste, avec un coup de pouce',
    capital: 5000, temps: 4, minage: 2, elec: 0.75, score: 0.5,
    frais: 0.0005, execution: 'meilleur', aides: true,
    effets: ['Temps ×4, minage ×2', 'Électricité −25 %, frais divisés par deux', 'Flat tax prélevée automatiquement', 'Levier ×5 max, alerte avant liquidation']
  },
  expert: {
    id: 'expert', nom: 'Expert', ligne: 'Presque tout est réel',
    capital: 2000, temps: 2, minage: 1.25, elec: 1, score: 0.75,
    frais: 0.001, execution: 'carnet', aides: true,
    effets: ['Temps ×2, minage ×1,25', 'Électricité, frais et pannes réels', 'Impôts calculés pour toi', 'Une seule sauvegarde']
  },
  realite: {
    id: 'realite', nom: 'Réalité', ligne: 'La réalité absolue, sans aide',
    capital: 1000, temps: 1, minage: 1, elec: 1, score: 1,
    frais: 0.001, execution: 'carnet', aides: false,
    effets: ["Tout est réel, rien n'est modifiable", 'Aucune estimation de rentabilité', 'Déclaration fiscale à remplir toi-même', 'Une sauvegarde, aucun retour arrière']
  }
};

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

// Première liste de métiers (la liste complète et les salaires réels arrivent avec la V0.9).
export const METIERS = [
  ['Industrie et électricité', ['Électricien', 'Technicien de maintenance', 'Électrotechnicien', 'Automaticien', 'Opérateur de production', 'Ingénieur industriel']],
  ['BTP', ['Maçon', 'Plombier', 'Chef de chantier', 'Conducteur de travaux']],
  ['Commerce et vente', ['Vendeur', 'Caissier', 'Commercial', 'Responsable de magasin']],
  ['Restauration et hôtellerie', ['Serveur', 'Cuisinier', 'Réceptionniste']],
  ['Santé et social', ['Infirmier', 'Aide-soignant', 'Pharmacien', 'Éducateur spécialisé']],
  ['Transport et logistique', ['Chauffeur routier', 'Cariste', 'Livreur', 'Agent logistique']],
  ['Informatique et numérique', ['Développeur', 'Technicien support', 'Administrateur réseau', 'Data analyst']],
  ['Banque et finance', ['Conseiller bancaire', 'Comptable', 'Analyste financier']],
  ['Enseignement', ['Professeur des écoles', 'Professeur de lycée', 'Formateur']],
  ['Fonction publique', ['Agent administratif', 'Policier', 'Pompier professionnel']],
  ['Agriculture', ['Agriculteur', 'Ouvrier agricole', 'Viticulteur']],
  ['Artisanat', ['Boulanger', 'Coiffeur', 'Menuisier', 'Mécanicien automobile']]
];

export const INTERVALLES = [
  { id: '15m', nom: '15 min', limite: 96 },
  { id: '1h', nom: '1 h', limite: 96 },
  { id: '4h', nom: '4 h', limite: 90 },
  { id: '1d', nom: '1 J', limite: 90 },
  { id: '1w', nom: '1 S', limite: 80 }
];
