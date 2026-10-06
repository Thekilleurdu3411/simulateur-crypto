// Personnalités fictives du monde de la crypto : profils, fortunes qui suivent le marché,
// publications sur le réseau social du jeu et propositions en messages privés.
// Toutes les personnes et entreprises sont inventées (aucune vraie personne).

// expo : part de la fortune exposée aux cryptos [BTC, ETH, autres] ; fiabilite : justesse de leurs pronostics.
export const PERSONNALITES = [
  { id: 'hugo', nom: 'Hugo Valmont', pseudo: 'BaleineBleue', role: 'Trader baleine', bio: 'Bitcoin depuis 2013. Je ne vends jamais.', fortune: 180e6, expo: [0.8, 0.1, 0.05], fiabilite: 0.6, abonnes: 410000, couleur: '#3E7BFA', humeur: 'calme' },
  { id: 'sofia', nom: 'Sofia Mercer', pseudo: 'SofiaOnChain', role: 'Analyste on-chain', bio: 'Les données ne mentent pas. Pas de conseil financier.', fortune: 4.2e6, expo: [0.5, 0.25, 0.05], fiabilite: 0.66, abonnes: 186000, couleur: '#2EBD85', humeur: 'prudente' },
  { id: 'kenji', nom: 'Kenji Arata', pseudo: 'HashKing', role: 'PDG de Kumo Mining (fictive)', bio: '1,2 EH/s au Paraguay et au Texas. On recrute.', fortune: 95e6, expo: [0.6, 0, 0], fiabilite: 0.55, abonnes: 92000, couleur: '#F3B33D', humeur: 'mineur' },
  { id: 'lina', nom: 'Lina Diallo', pseudo: 'LinaInvestit', role: 'Influenceuse finances perso', bio: 'Budget, épargne, crypto : je t\'explique tout simplement.', fortune: 1.3e6, expo: [0.3, 0.15, 0.05], fiabilite: 0.55, abonnes: 520000, couleur: '#E85D9A', humeur: 'pedagogue' },
  { id: 'max', nom: 'Max Turbo', pseudo: 'MaxToTheMoon', role: 'Influenceur altcoins', bio: '🚀🚀🚀 100x ou rien. Mes calls en VIP.', fortune: 2.8e6, expo: [0.1, 0.2, 0.6], fiabilite: 0.42, abonnes: 760000, couleur: '#F6465D', humeur: 'hype' },
  { id: 'elena', nom: 'Elena Voss', pseudo: 'VossMacro', role: 'Économiste macro', bio: 'Taux, inflation, liquidité. Sceptique mais curieuse.', fortune: 3.5e6, expo: [0.1, 0, 0], fiabilite: 0.58, abonnes: 240000, couleur: '#9B8AFB', humeur: 'sceptique' },
  { id: 'marc', nom: 'Marc Delorme', pseudo: 'MarcDelorme', role: 'Journaliste au « Coin Quotidien » (fictif)', bio: 'Enquêtes, scandales et coulisses de la crypto.', fortune: 0.4e6, expo: [0.1, 0.05, 0], fiabilite: 0.5, abonnes: 130000, couleur: '#8A94A6', humeur: 'journaliste' },
  { id: 'agnes', nom: 'Agnès Royer', pseudo: 'AgnesRoyerAMN', role: 'Présidente de l\'Autorité des marchés numériques (fictive)', bio: 'Protéger les épargnants.', fortune: 0.9e6, expo: [0, 0, 0], fiabilite: 0.5, abonnes: 61000, couleur: '#5B6B82', humeur: 'regulatrice' },
  { id: 'ghost', nom: 'Ghost', pseudo: 'nakamoto_ghost', role: 'Développeur anonyme', bio: 'Don\'t trust, verify.', fortune: 60e6, expo: [0.95, 0, 0], fiabilite: 0.6, abonnes: 330000, couleur: '#C9CED6', humeur: 'cypherpunk' },
  { id: 'tom', nom: 'Tom Bernier', pseudo: 'TomDeFi', role: 'Spécialiste DeFi', bio: 'Rendements, protocoles, et parfois des pertes.', fortune: 7.5e6, expo: [0.2, 0.5, 0.25], fiabilite: 0.5, abonnes: 98000, couleur: '#00C2D1', humeur: 'degen' },
  { id: 'clara', nom: 'Clara Fontaine', pseudo: 'ClaraFontaine', role: 'Gérante du fonds Fontaine Digital (fictif)', bio: '450 M€ sous gestion. Le long terme gagne toujours.', fortune: 38e6, expo: [0.4, 0.2, 0.05], fiabilite: 0.62, abonnes: 54000, couleur: '#2E86AB', humeur: 'institutionnelle' },
  { id: 'ravi', nom: 'Ravi Patel', pseudo: 'RaviMine', role: 'Petit mineur passionné', bio: '6 machines dans le garage. Ma femme n\'est pas ravie.', fortune: 0.12e6, expo: [0.7, 0, 0], fiabilite: 0.5, abonnes: 8400, couleur: '#E0A458', humeur: 'mineur' },
  { id: 'renard', nom: 'Le Renard', pseudo: 'FoxSignals', role: 'Vendeur de signaux', bio: '92 % de réussite 📈 Rejoins le groupe VIP.', fortune: 0.9e6, expo: [0.1, 0.1, 0.3], fiabilite: 0.35, abonnes: 210000, couleur: '#FF8A3D', humeur: 'arnaqueur' },
  { id: 'yasmine', nom: 'Yasmine Haddad', pseudo: 'YasmineKryptal', role: 'Fondatrice de la plateforme Kryptal (fictive)', bio: '8 millions de clients en Europe.', fortune: 420e6, expo: [0.3, 0.1, 0.1], fiabilite: 0.55, abonnes: 190000, couleur: '#7C5CFF', humeur: 'patronne' },
  { id: 'paul', nom: 'Paul Garnier', pseudo: 'PaulGarnier_Or', role: 'Investisseur à l\'ancienne', bio: 'L\'or, l\'immobilier, et du bon sens.', fortune: 12e6, expo: [0, 0, 0], fiabilite: 0.45, abonnes: 45000, couleur: '#B8860B', humeur: 'boomer' },
  { id: 'zoe', nom: 'Zoé Lambert', pseudo: 'ZoeDe500', role: 'Étudiante', bio: 'Partie de 500 €. On verra où ça mène.', fortune: 3200, expo: [0.4, 0.3, 0.2], fiabilite: 0.5, abonnes: 2100, couleur: '#FF6FB5', humeur: 'rivale' },
  { id: 'viktor', nom: 'Viktor Orlov', pseudo: 'V_Orlov', role: 'Investisseur discret', bio: '', fortune: 900e6, expo: [0.5, 0.1, 0.1], fiabilite: 0.6, abonnes: 3100, couleur: '#4B4B4B', humeur: 'opaque' },
  { id: 'ines', nom: 'Inès Morel', pseudo: 'InesWhiteHat', role: 'Hackeuse éthique', bio: 'Je trouve les failles avant les méchants.', fortune: 0.6e6, expo: [0.3, 0.1, 0], fiabilite: 0.5, abonnes: 77000, couleur: '#00B894', humeur: 'securite' },
  { id: 'bastien', nom: 'Bastien Roy', pseudo: 'BastienTrade', role: 'Youtubeur trading', bio: 'Analyse technique tous les soirs à 21 h.', fortune: 1.6e6, expo: [0.3, 0.2, 0.2], fiabilite: 0.48, abonnes: 380000, couleur: '#E17055', humeur: 'trader' },
  { id: 'aiko', nom: 'Aiko Tanaka', pseudo: 'AikoArt', role: 'Artiste numérique', bio: 'Mes œuvres vivent sur la blockchain.', fortune: 2.2e6, expo: [0.1, 0.5, 0.1], fiabilite: 0.5, abonnes: 150000, couleur: '#FD79A8', humeur: 'artiste' }
];
export const perso = id => PERSONNALITES.find(p => p.id === id);

// ---------- Hasard reproductible ----------
export function rng(seed, a, b = 0) {
  let x = (seed ^ Math.imul(a + 1, 0x9E3779B1) ^ Math.imul(b + 7, 0x85EBCA77)) | 0;
  return () => { x = x + 0x6D2B79F5 | 0; let t = Math.imul(x ^ x >>> 15, 1 | x); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

/**
 * Fortune d'une personnalité : la part crypto suit les cours depuis le début de la partie,
 * le reste croît doucement (placements, entreprise) avec un talent propre.
 * r = { BTC, ETH, ALT } : rapport des prix actuels à ceux du départ.
 */
export function fortune(p, r, annees, seed = 0) {
  const [b, e, a] = p.expo, reste = 1 - b - e - a;
  const talent = (rng(seed, p.id.length * 31 + p.fortune % 97)() - 0.4) * 0.12; // de −5 % à +7 % par an
  return p.fortune * (b * (r.BTC || 1) + e * (r.ETH || 1) + a * (r.ALT || 1) + reste * Math.exp(0.04 * annees)) * Math.exp(talent * annees);
}

// ---------- Publications ----------
const PUBLICATIONS = {
  hausse: {
    hype: ['On part sur la lune 🚀 {coin} +{var} % et ce n\'est QUE le début', 'Je vous l\'avais dit. {coin} explose. Next stop : x10', 'Les sceptiques pleurent, nous on encaisse 💰'],
    calme: ['Belle journée. Je ne change rien à ma stratégie.', 'Le bitcoin fait ce qu\'il fait. Patience.'],
    prudente: ['Hausse solide : les sorties des plateformes confirment. Je reste vigilante sur les leviers.', 'Les gros portefeuilles accumulent depuis deux semaines. Intéressant.'],
    sceptique: ['Une hausse portée par la liquidité, pas par les fondamentaux.', 'Attention à l\'euphorie. Les marchés ont la mémoire courte.'],
    boomer: ['Bulle. Je l\'ai dit en 2017, je le redis.', 'Mes petits-enfants me demandent du bitcoin. C\'est mauvais signe.'],
    arnaqueur: ['✅ Signal VIP +{var} % sur {coin} encore validé. Rejoignez-nous avant qu\'il soit trop tard.'],
    trader: ['Cassure de résistance sur {coin}. Objectif suivant en vidéo ce soir.', 'Volume en hausse, momentum intact.'],
    degen: ['J\'ai tout remis dans les pools, le rendement est indécent cette semaine.'],
    rivale: ['Mes 500 € font +{var} % aujourd\'hui, je me sens trader 😅'],
    defaut: ['{coin} +{var} % sur la journée. Belle séance.']
  },
  baisse: {
    hype: ['C\'est une secousse pour faire sortir les mains faibles. HOLD 💎🙌', 'Soldes sur {coin} ! Je recharge.'],
    calme: ['Ceux qui vendent aujourd\'hui achèteront plus cher demain.', 'Rien de nouveau. J\'achète un peu.'],
    prudente: ['Liquidations en cascade sur les dérivés. La purge peut continuer.', 'Les plateformes reçoivent beaucoup de BTC : pression vendeuse.'],
    sceptique: ['−{var} % en une journée. Toujours un actif sans valeur intrinsèque ?', 'La volatilité rappelle à tous que ce n\'est pas une épargne.'],
    boomer: ['Je vous l\'avais dit. Achetez de l\'or.'],
    arnaqueur: ['La baisse était prévue dans le groupe VIP 🦊 Lien en bio.'],
    trader: ['Support cassé. Je coupe mes positions et j\'attends.', 'Stop-loss touché. La discipline avant l\'ego.'],
    degen: ['Liquidé sur mon levier. On recommence 💀'],
    rivale: ['Mon portefeuille saigne… je ne regarde plus 🙈'],
    defaut: ['{coin} −{var} % sur la journée. Dur.']
  },
  calme: {
    pedagogue: ['Rappel : n\'investis que ce que tu peux perdre. Et garde une épargne de précaution !', 'Le DCA (acheter un peu chaque mois) bat souvent ceux qui essaient de deviner le bon moment.'],
    mineur: ['Nouvelle livraison de machines aujourd\'hui. Le réseau ne dort jamais ⛏️', 'Facture d\'électricité reçue. Le minage, c\'est d\'abord de la gestion.'],
    cypherpunk: ['Fais tourner ton propre nœud.', 'Pas tes clés, pas tes bitcoins.'],
    securite: ['Active la double authentification. Ne clique jamais sur un lien d\'« airdrop ».', 'Nouvelle arnaque en circulation : de faux supports qui demandent ta phrase secrète.'],
    regulatrice: ['Méfiez-vous des promesses de rendement garanti. Consultez notre liste noire.'],
    journaliste: ['Enquête à venir sur les vendeurs de signaux. Restez à l\'écoute.'],
    patronne: ['Kryptal dépasse un nouveau cap de clients. Merci à vous !'],
    institutionnelle: ['Nous renforçons progressivement notre exposition. Horizon : 10 ans.'],
    artiste: ['Nouvelle collection en préparation 🎨'],
    opaque: ['…'],
    defaut: ['Journée calme sur les marchés.']
  }
};
const choisir = (liste, R) => liste[Math.floor(R() * liste.length)];

/**
 * Publications des personnalités pour une journée. var : variation du bitcoin sur 24 h (fraction).
 * actus : actualités du jour (réagies par la journaliste, la régulatrice, l'économiste).
 */
export function publicationsDuJour(jour, seed, variation, actus = [], coin = 'Bitcoin') {
  const R = rng(seed, jour, 3);
  const ton = variation > 0.04 ? 'hausse' : variation < -0.04 ? 'baisse' : 'calme';
  const n = ton === 'calme' ? 2 + Math.floor(R() * 2) : 4 + Math.floor(R() * 3);
  const posts = [];
  const pris = new Set();
  for (let i = 0; i < n; i++) {
    const p = PERSONNALITES[Math.floor(R() * PERSONNALITES.length)];
    if (pris.has(p.id)) continue;
    pris.add(p.id);
    const table = PUBLICATIONS[ton];
    const texte = choisir(table[p.humeur] || table.defaut, R).replace('{coin}', coin).replace('{var}', Math.abs(Math.round(variation * 1000) / 10).toLocaleString('fr-FR'));
    posts.push({ auteur: p.id, texte, h: Math.floor(R() * 24), likes: Math.round(p.abonnes * (0.002 + R() * 0.01)) });
  }
  for (const a of actus) {
    const p = perso(R() < 0.5 ? 'marc' : R() < 0.5 ? 'elena' : 'agnes');
    posts.push({ auteur: p.id, texte: `${a.titre}. ${p.humeur === 'regulatrice' ? 'Nous suivons la situation de près.' : p.humeur === 'sceptique' ? 'Je l\'avais anticipé.' : 'Nos informations dans l\'article.'}`, h: Math.floor(R() * 24), likes: Math.round(p.abonnes * 0.01) });
  }
  return posts.sort((a, b) => a.h - b.h);
}

// ---------- Messages privés (choix de réponses) ----------
// condition(ctx) → vrai si le message peut arriver ; poids : fréquence relative.
// Chaque réponse a un id traité par le jeu (jeusocial.js) ; « texte » est ce que répond le joueur.
export const SCENARIOS = [
  { id: 'vip', de: 'renard', poids: 3, texte: 'Salut 👋 J\'ai vu ton profil. Mon groupe VIP fait +92 % de réussite. 299 € par mois, satisfait ou remboursé 😉',
    reponses: [['vip-payer', 'Je rejoins (299 €)'], ['ignorer', 'Non merci'], ['signaler', 'Signaler le compte']] },
  { id: 'airdrop', de: 'renard', poids: 2, condition: c => c.cryptos > 200, texte: '🎁 Airdrop exclusif : connecte ton portefeuille sur notre site pour réclamer 0,5 ETH gratuit. Offre limitée à 24 h !',
    reponses: [['airdrop-connecter', 'Je connecte mon portefeuille'], ['ignorer', 'Ignorer'], ['signaler', 'Signaler l\'arnaque']] },
  { id: 'a2f', de: 'ines', poids: 2, condition: c => !c.a2f, texte: 'Salut ! Une base de mots de passe vient de fuiter et ton adresse y est. Active la double authentification sur ta plateforme, sérieusement.',
    reponses: [['a2f-activer', 'Merci, je l\'active'], ['ignorer', 'Pas le temps']] },
  { id: 'tuyau-sofia', de: 'sofia', poids: 3, simulation: true, texte: 'Petite observation entre nous : {tuyau}. À toi de voir, ce n\'est pas un conseil 😉',
    reponses: [['merci', 'Merci pour l\'info'], ['ignorer', 'Je préfère me faire mon avis']] },
  { id: 'tuyau-max', de: 'max', poids: 3, simulation: true, texte: '🚀 Entre nous : {tuyau}. Ça va être énorme.',
    reponses: [['merci', 'Je note'], ['ignorer', 'Hmm…']] },
  { id: 'pump', de: 'max', poids: 1, condition: c => c.abonnes > 1000, texte: 'On fait monter {alt} ensemble ? Tu postes à 20 h, j\'achète avant, on revend au sommet. Tout le monde gagne 😏',
    reponses: [['pump-accepter', 'Ok, on y va'], ['ignorer', 'Sans moi'], ['signaler', 'Signaler à l\'Autorité des marchés numériques']] },
  { id: 'otc', de: 'viktor', poids: 1, condition: c => c.patrimoine > 300000, texte: 'Je peux te céder du bitcoin 6 % sous le prix du marché. Paiement par virement à une société à Chypre. Pas de questions.',
    reponses: [['otc-accepter', 'J\'en prends pour 20 000 €'], ['ignorer', 'Trop louche pour moi']] },
  { id: 'ravi-machine', de: 'ravi', poids: 2, texte: 'Je vends un de mes S19 d\'occasion, 300 € à débattre. Il a un ventilateur bruyant mais il tourne !',
    reponses: [['ravi-acheter', 'Je le prends (300 €)'], ['ignorer', 'Non merci']] },
  { id: 'kenji-rachat', de: 'kenji', poids: 2, condition: c => c.machines >= 3, texte: 'Kumo Mining recherche des machines tout de suite : je rachète tout ton parc 10 % au-dessus du prix de l\'occasion. Intéressé ?',
    reponses: [['kenji-vendre', 'Je vends tout mon parc'], ['ignorer', 'Je garde mes machines']] },
  { id: 'lina-collab', de: 'lina', poids: 2, condition: c => c.abonnes > 500, texte: 'Coucou ! On ferait une vidéo ensemble sur ton parcours ? Mon audience adorerait 😊',
    reponses: [['collab', 'Avec plaisir !'], ['ignorer', 'Je préfère rester discret']] },
  { id: 'clara-fonds', de: 'clara', poids: 1, condition: c => c.patrimoine > 100000, texte: 'Mon fonds ouvre une part pour les particuliers aisés : minimum 50 000 €, frais 2 % par an, horizon long. Ça t\'intéresse ?',
    reponses: [['fonds-investir', 'J\'investis 50 000 €'], ['ignorer', 'Pas pour l\'instant']] },
  { id: 'zoe-pari', de: 'zoe', poids: 2, texte: 'Je te parie 100 € que je fais un meilleur pourcentage que toi d\'ici un mois 😤',
    reponses: [['pari', 'Pari tenu !'], ['ignorer', 'Je ne parie pas']] },
  { id: 'marc-interview', de: 'marc', poids: 1, condition: c => c.patrimoine > 1e6 || c.abonnes > 5000, texte: 'Bonjour, je prépare un portrait des nouveaux investisseurs crypto. Accepteriez-vous une interview ?',
    reponses: [['interview', 'Oui'], ['ignorer', 'Non, je préfère l\'anonymat']] },
  { id: 'paul-or', de: 'paul', poids: 1, texte: 'Jeune homme, un conseil d\'ancien : gardez toujours de quoi tenir six mois. Le reste, faites-en ce que vous voulez.',
    reponses: [['merci', 'Merci, c\'est noté']] }
];
