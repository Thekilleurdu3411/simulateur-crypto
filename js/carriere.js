// Carrière : diplômes et formations, progression dans le poste, événements du métier, chômage.
// Données et règles pures (testées) ; l'application à la partie se fait dans jeuvie.js.
import { METIERS_SALAIRES, salaireNet, SMIC } from './vie.js';

export const NIVEAUX = ['aucun', 'cap', 'bac', 'bac+2', 'bac+3', 'bac+5', 'bac+8'];
const RANG = Object.fromEntries(NIVEAUX.map((n, i) => [n, i]));

// Diplômes particuliers et niveau d'études qu'ils valent.
export const DIPLOMES = {
  cap: ['CAP', 'cap'], permis_c: ['Permis poids lourd + FIMO', 'aucun'], permis_d: ['Permis bus + FIMO voyageurs', 'aucun'],
  bac: ['Baccalauréat', 'bac'], 'bac+2': ['BTS / BUT', 'bac+2'], 'bac+3': ['Licence', 'bac+3'], 'bac+5': ['Master', 'bac+5'], 'bac+8': ['Doctorat', 'bac+8'],
  ingenieur: ["Diplôme d'ingénieur", 'bac+5'], dev: ['Titre de développeur web', 'bac+2'], cyber: ['Certification cybersécurité', 'bac+2'],
  infirmier: ["Diplôme d'État d'infirmier", 'bac+3'], aidesoignant: ["Diplôme d'aide-soignant", 'cap'], paramedical: ['Diplôme paramédical', 'bac+3'],
  social: ["Diplôme d'éducateur spécialisé", 'bac+3'], medecin: ['Doctorat de médecine', 'bac+8'], specialiste: ['Spécialité médicale (DES)', 'bac+8'],
  pharmacien: ['Diplôme de pharmacien', 'bac+5'], dentiste: ['Diplôme de chirurgien-dentiste', 'bac+5'], veterinaire: ['Diplôme de vétérinaire', 'bac+5'],
  sagefemme: ['Diplôme de sage-femme', 'bac+5'], kine: ['Diplôme de kinésithérapeute', 'bac+5'], psychologue: ['Master de psychologie', 'bac+5'],
  avocat: ["Certificat d'aptitude à la profession d'avocat", 'bac+5'], notaire: ['Diplôme supérieur du notariat', 'bac+5'],
  pilote: ['Licence de pilote de ligne (ATPL)', 'bac'], controleur: ['Qualification de contrôleur aérien (ENAC)', 'bac+3'],
  police: ['École de police', 'bac'], gendarme: ['École de gendarmerie', 'bac'], pompier: ['Formation de sapeur-pompier', 'aucun'],
  enseignant: ['Master MEEF et concours', 'bac+5'], insp: ['INSP (haute fonction publique)', 'bac+5'], expertcomptable: ["Diplôme d'expertise comptable", 'bac+8'],
  architecte: ["Diplôme d'architecte + HMONP", 'bac+5'], bpjeps: ['BPJEPS (sport et animation)', 'bac'], sport_pro: ['Centre de formation professionnel', 'aucun']
};
export const nomDiplome = id => (DIPLOMES[id] || [id])[0];

// Formations : coût total (€), durée à temps plein (mois), rémunération éventuelle pendant (€ net/mois).
// cpf : finançable par le CPF ; alternance : possible en alternance (payé comme apprenti) ; soir : en cours du soir ou à distance.
// Ordres de grandeur 2026 (frais d'inscription publics : licence 178 €, master 254 € par an), à vérifier.
export const FORMATIONS = [
  { id: 'cap', nom: 'CAP en un an (adultes)', requis: 'aucun', donne: ['cap'], mois: 12, cout: 1500, cpf: true, alternance: true, soir: true },
  { id: 'aidesoignant', nom: "Diplôme d'aide-soignant (DEAS)", requis: 'aucun', donne: ['aidesoignant'], mois: 12, cout: 0, alternance: true },
  { id: 'permis_c', nom: 'Permis poids lourd (C + FIMO)', requis: 'aucun', donne: ['permis_c'], mois: 3, cout: 4000, cpf: true },
  { id: 'permis_d', nom: 'Permis bus (D + FIMO voyageurs)', requis: 'aucun', donne: ['permis_d'], mois: 3, cout: 4500, cpf: true },
  { id: 'bpjeps', nom: 'BPJEPS (sport et animation)', requis: 'aucun', donne: ['bpjeps'], mois: 12, cout: 6000, cpf: true, alternance: true },
  { id: 'pompier', nom: 'Concours de sapeur-pompier professionnel', requis: 'aucun', donne: ['pompier'], mois: 4, cout: 0, paye: 1700 },
  { id: 'daeu', nom: "DAEU (équivalent du bac)", requis: 'aucun', donne: ['bac'], mois: 10, cout: 400, cpf: true, soir: true },
  { id: 'bootcamp', nom: 'Bootcamp développeur web', requis: 'aucun', donne: ['dev'], mois: 4, cout: 7000, cpf: true },
  { id: 'bts', nom: 'BTS ou BUT (2 ans)', requis: 'bac', donne: ['bac+2'], mois: 24, cout: 200, alternance: true },
  { id: 'licence', nom: 'Licence (3 ans)', requis: 'bac', donne: ['bac+3'], mois: 36, cout: 534, soir: true },
  { id: 'licencepro', nom: 'Licence professionnelle (1 an après bac+2)', requis: 'bac+2', donne: ['bac+3'], mois: 12, cout: 178, alternance: true },
  { id: 'master', nom: "Master à l'université", requis: 'bac+3', donne: ['bac+5'], mois: 24, cout: 508, alternance: true, soir: true },
  { id: 'commerce', nom: 'Grande école de commerce (master)', requis: 'bac+3', donne: ['bac+5'], mois: 24, cout: 32000, alternance: true },
  { id: 'inge', nom: "École d'ingénieurs publique", requis: 'bac+2', donne: ['ingenieur', 'bac+5'], mois: 36, cout: 1800, alternance: true },
  { id: 'doctorat', nom: 'Doctorat (thèse avec contrat doctoral)', requis: 'bac+5', donne: ['bac+8'], mois: 36, cout: 1200, paye: 1750 },
  { id: 'cyber', nom: 'Certification cybersécurité', requis: 'bac+2', donne: ['cyber'], mois: 6, cout: 6000, cpf: true, soir: true },
  { id: 'ifsi', nom: 'Institut de soins infirmiers (IFSI)', requis: 'bac', donne: ['infirmier'], mois: 36, cout: 534 },
  { id: 'paramedical', nom: 'École paramédicale (orthophonie, ergothérapie, radiologie)', requis: 'bac', donne: ['paramedical'], mois: 42, cout: 2000 },
  { id: 'social', nom: "Diplôme d'éducateur spécialisé (DEES)", requis: 'bac', donne: ['social'], mois: 36, cout: 534, alternance: true },
  { id: 'medecine', nom: 'Études de médecine (médecine générale)', requis: 'bac', donne: ['medecin'], mois: 108, cout: 2500, paye: 0 },
  { id: 'specialite', nom: 'Internat de spécialité médicale', requis: 'medecin', donne: ['specialiste'], mois: 24, cout: 1000, paye: 2000 },
  { id: 'pharmacie', nom: 'Études de pharmacie', requis: 'bac', donne: ['pharmacien'], mois: 72, cout: 1500 },
  { id: 'dentaire', nom: 'Études de chirurgie dentaire', requis: 'bac', donne: ['dentiste'], mois: 72, cout: 1500 },
  { id: 'veto', nom: 'École nationale vétérinaire', requis: 'bac', donne: ['veterinaire'], mois: 72, cout: 15000 },
  { id: 'sagefemme', nom: 'École de sages-femmes', requis: 'bac', donne: ['sagefemme'], mois: 60, cout: 1000 },
  { id: 'kine', nom: 'Institut de kinésithérapie', requis: 'bac', donne: ['kine'], mois: 60, cout: 20000 },
  { id: 'psycho', nom: 'Master de psychologie', requis: 'bac+3', donne: ['psychologue', 'bac+5'], mois: 24, cout: 508 },
  { id: 'avocat', nom: "Master de droit + école d'avocats", requis: 'bac+3', donne: ['avocat', 'bac+5'], mois: 42, cout: 3000 },
  { id: 'notaire', nom: 'Master de droit notarial + diplôme du notariat', requis: 'bac+3', donne: ['notaire', 'bac+5'], mois: 60, cout: 4000 },
  { id: 'meef', nom: 'Master MEEF + concours de professeur', requis: 'bac+3', donne: ['enseignant', 'bac+5'], mois: 24, cout: 508 },
  { id: 'insp', nom: 'INSP (concours de la haute fonction publique)', requis: 'bac+5', donne: ['insp'], mois: 24, cout: 0, paye: 2000 },
  { id: 'expertcompta', nom: "Diplôme d'expertise comptable (DEC)", requis: 'bac+5', donne: ['expertcomptable'], mois: 36, cout: 3000, soir: true },
  { id: 'archi', nom: "École d'architecture + HMONP", requis: 'bac', donne: ['architecte', 'bac+5'], mois: 72, cout: 3000 },
  { id: 'pilote', nom: 'Formation de pilote de ligne (ATPL)', requis: 'bac', donne: ['pilote'], mois: 24, cout: 100000 },
  { id: 'enac', nom: 'ENAC : contrôleur aérien (concours)', requis: 'bac+2', donne: ['controleur'], mois: 36, cout: 0, paye: 1700 },
  { id: 'police', nom: 'École de police (gardien de la paix)', requis: 'bac', donne: ['police'], mois: 12, cout: 0, paye: 1650 },
  { id: 'gendarmerie', nom: 'École de gendarmerie', requis: 'bac', donne: ['gendarme'], mois: 12, cout: 0, paye: 1500 }
];
export const formation = id => FORMATIONS.find(f => f.id === id);

// Diplôme exigé pour chaque métier : spécifique, sinon niveau d'études ; [a, b] = l'un ou l'autre.
const EXIGENCES = [
  [/^Médecin généraliste/, 'medecin'],
  [/^(Chirurgien libéral|Chirurgien hospitalier|Radiothérapeute|Médecin nucléaire|Radiologue|Ophtalmologiste|Anesthésiste|Cardiologue)/, 'specialiste'],
  [/^Pharmacien/, 'pharmacien'], [/^Chirurgien-dentiste/, 'dentiste'], [/^Vétérinaire/, 'veterinaire'], [/^Sage-femme/, 'sagefemme'],
  [/^Infirmier/, 'infirmier'], [/^Kinésithérapeute/, 'kine'], [/^(Orthophoniste|Ergothérapeute|Manipulateur radio)/, 'paramedical'],
  [/^Psychologue/, 'psychologue'], [/^(Aide-soignant|Auxiliaire de puériculture)/, 'aidesoignant'],
  [/^(Éducateur spécialisé|Assistant de service social|Moniteur-éducateur)/, 'social'],
  [/^Avocat/, 'avocat'], [/^Notaire/, 'notaire'], [/^(Pilote de ligne|Commandant de bord)/, 'pilote'], [/^Contrôleur aérien/, 'controleur'],
  [/^(Gardien de la paix|Policier municipal)/, 'police'], [/^Gendarme/, 'gendarme'], [/^Pompier/, 'pompier'],
  [/^(Professeur|CPE)/, 'enseignant'], [/^Maître de conférences/, 'bac+8'], [/^(Haut fonctionnaire|Préfet|Ambassadeur)/, 'insp'],
  [/^Expert-comptable/, 'expertcomptable'], [/^Architecte/, 'architecte'],
  [/^(Footballeur|Joueur de rugby)/, 'sport_pro'], [/^(Éducateur sportif|Maître-nageur)/, 'bpjeps'],
  [/^Chauffeur routier/, 'permis_c'], [/^Conducteur de bus/, 'permis_d'],
  [/^(Développeur)/, ['dev', 'bac+2']], [/^(Expert cybersécurité|Ingénieur cybersécurité)/, ['cyber', 'bac+5']],
  [/^Ingénieur/, ['ingenieur', 'bac+5']],
  [/^(Data scientist|Actuaire|Analyste financier|Banquier d'affaires|Trader|Consultant en stratégie|Directeur|PDG|Gérant de portefeuille|Contrôleur de gestion|Juriste|Chef de projet|Directeur artistique|Data analyst)/, 'bac+5'],
  [/^(Chargé|Journaliste|Designer UX|Gestionnaire de patrimoine|Responsable)/, 'bac+3'],
  [/^(Technicien|Administrateur|Conseiller|Commercial|Assistant|Gestionnaire de paie|Comptable|Secrétaire|Dessinateur|Automaticien|Électronicien|Opticien|Agent immobilier|Community manager|Graphiste|Préparateur en pharmacie|Chef de culture|Ingénieur agronome|Formateur)/, 'bac+2'],
  [/^(Électricien|Plombier|Maçon|Peintre|Couvreur|Menuisier|Carreleur|Charpentier|Boulanger|Pâtissier|Boucher|Coiffeur|Esthéticien|Fleuriste|Mécanicien|Soudeur|Tourneur|Commis de cuisine|Chef de partie|Chef de cuisine|Ambulancier|Moniteur d'auto-école|Monteur|Conducteur d'engins|Jardinier)/, 'cap']
];

/** Diplôme (ou niveau) exigé pour un métier : chaîne, tableau d'alternatives, ou 'aucun'. */
export function exigence(metier) {
  for (const [re, ex] of EXIGENCES) if (re.test(metier)) return ex;
  return 'aucun';
}

/** Niveau d'études le plus élevé des diplômes. */
export function niveau(diplomes = []) {
  let r = 0;
  for (const d of diplomes) r = Math.max(r, RANG[d] ?? RANG[(DIPLOMES[d] || [])[1]] ?? 0);
  return NIVEAUX[r];
}

/** Le joueur a-t-il le diplôme demandé (ou un niveau suffisant) ? */
export function possede(diplomes = [], ex) {
  if (Array.isArray(ex)) return ex.some(x => possede(diplomes, x));
  if (!ex || ex === 'aucun') return true;
  if (ex in RANG) return RANG[niveau(diplomes)] >= RANG[ex];
  if (ex === 'medecin' && diplomes.includes('specialiste')) return true;
  return diplomes.includes(ex);
}

/** Diplômes supposés au départ : ceux qu'exige le métier choisi (on part du principe qu'il les a). */
export function diplomesDeDepart(profil) {
  const r = new Set(['bac']);
  if ((profil.situation === 'salarie') && profil.metier) {
    const ex = exigence(profil.metier);
    for (const d of [].concat(ex)) {
      if (d === 'aucun') continue;
      r.add(d);
      if (d === 'specialiste') r.add('medecin');
      const niv = (DIPLOMES[d] || [])[1];
      if (niv && niv !== 'aucun') r.add(niv);
      break; // une seule alternative suffit
    }
  }
  return [...r];
}

/** Formation la plus directe pour obtenir l'exigence d'un métier. */
export function formationPour(metier) {
  const ex = [].concat(exigence(metier))[0];
  if (!ex || ex === 'aucun') return null;
  return FORMATIONS.find(f => f.donne.includes(ex)) || null;
}

/** Métiers que débloque une formation (et que le joueur ne pouvait pas faire avant). */
export function debouches(f, diplomes = []) {
  const apres = [...new Set([...diplomes, ...f.donne])];
  const r = [];
  for (const [, liste] of METIERS_SALAIRES) for (const [m] of liste) if (!possede(diplomes, exigence(m)) && possede(apres, exigence(m))) r.push(m);
  // D'abord les métiers qui demandent précisément ce diplôme, puis ceux qu'ouvre le niveau d'études
  const specifique = m => [].concat(exigence(m)).some(x => f.donne.includes(x) && !(x in RANG)) ? 0 : 1;
  return r.sort((a, b) => specifique(a) - specifique(b));
}

// ---------- Progression dans le poste ----------
export const ANS = 365.25 * 864e5;
export const PASSAGE_CONFIRME = 3, PASSAGE_EXPERIMENTE = 8; // années dans le métier
export const HEURES_SUP = [[0, 'Aucune'], [4, '+4 h/sem.'], [8, '+8 h/sem.']];
/** Bonus de salaire des heures supplémentaires (payées 25 % de plus). */
export function bonusHeuresSup(h) { return h ? h * 1.25 / 35 : 0; }

/** Salaire net du mois avec augmentations obtenues et heures supplémentaires (valeurs de 2026). */
export function salaireCarriere(profil, carriere = {}) {
  const base = salaireNet(profil);
  if (profil.situation !== 'salarie') return base;
  return base * (carriere.majoration || 1) * (1 + bonusHeuresSup(carriere.heuresSup || 0));
}

// ---------- Événements du métier ----------
// effet : prime (en mois de salaire [min, max]), arret (jours [min, max]), augmentation (% [min, max]), licenciement.
const COMMUNS = [
  { id: 'prime_fin', mois: [12], proba: 0.35, texte: 'Prime de fin d\'année versée', prime: [0.3, 1] },
  { id: 'grippe', proba: 0.012, texte: 'Arrêt maladie (grippe)', arret: [3, 7] },
  { id: 'interessement', mois: [4, 5], proba: 0.15, texte: 'Intéressement et participation versés', prime: [0.2, 0.8] },
  { id: 'licenciement', proba: 0.003, texte: 'Licenciement économique : ton entreprise supprime ton poste', licenciement: true }
];
export const EVENEMENTS_SECTEUR = {
  Industrie: [
    { proba: 0.006, texte: 'Accident du travail à l\'atelier', arret: [10, 30], at: true },
    { proba: 0.05, texte: 'Grosse commande : heures supplémentaires payées', prime: [0.08, 0.2] },
    { proba: 0.004, texte: 'Fermeture de l\'usine annoncée', licenciement: true }
  ],
  BTP: [
    { proba: 0.009, texte: 'Accident du travail sur le chantier', arret: [10, 45], at: true },
    { proba: 0.06, texte: 'Chantier en retard : heures supplémentaires payées', prime: [0.1, 0.25] },
    { mois: [1, 2], proba: 0.15, texte: 'Intempéries : chômage intempéries ce mois-ci', prime: [-0.15, -0.05] }
  ],
  'Tech et numérique': [
    { proba: 0.03, texte: 'Mise en production réussie : prime de projet', prime: [0.3, 0.8] },
    { proba: 0.02, texte: 'Un concurrent te débauche : ton employeur s\'aligne', augmentation: [5, 12] },
    { proba: 0.004, texte: 'Plan social dans ta boîte', licenciement: true }
  ],
  'Santé et social': [
    { proba: 0.15, texte: 'Gardes et astreintes supplémentaires ce mois-ci', prime: [0.05, 0.15] },
    { proba: 0.006, texte: 'Agression pendant le service', arret: [5, 15], at: true },
    { mois: [7, 8], proba: 0.2, texte: 'Été en sous-effectif : heures supplémentaires', prime: [0.1, 0.2] }
  ],
  Éducation: [
    { mois: [6], proba: 0.3, texte: 'Corrections du bac et jurys d\'examen payés', prime: [0.05, 0.12] },
    { proba: 0.01, texte: 'Épuisement : arrêt de travail', arret: [7, 21] }
  ],
  'Commerce et artisanat': [
    { mois: [1, 7], proba: 0.4, texte: 'Soldes : heures supplémentaires', prime: [0.05, 0.12] },
    { mois: [12], proba: 0.5, texte: 'Rush des fêtes : heures supplémentaires', prime: [0.08, 0.18] },
    { proba: 0.004, texte: 'Le magasin ferme ses portes', licenciement: true }
  ],
  'Fonction publique': [
    { mois: [7], proba: 0.35, texte: 'Revalorisation du point d\'indice', augmentation: [0.5, 1.5] },
    { proba: 0.08, texte: 'Prime de service et indemnités', prime: [0.05, 0.15] },
    { proba: 0.006, texte: 'Blessure en intervention', arret: [7, 30], at: true }
  ],
  Services: [
    { proba: 0.04, texte: 'Objectifs dépassés : prime', prime: [0.1, 0.4] },
    { proba: 0.004, texte: 'Ton client principal s\'en va : licenciement', licenciement: true }
  ],
  'Transport et logistique': [
    { proba: 0.08, texte: 'Pic d\'activité : heures supplémentaires', prime: [0.08, 0.2] },
    { proba: 0.005, texte: 'Accident de la route pendant le travail', arret: [10, 40], at: true },
    { mois: [11, 12], proba: 0.35, texte: 'Rush des fêtes : primes et heures sup', prime: [0.1, 0.25] }
  ],
  'Hôtellerie-restauration': [
    { mois: [7, 8], proba: 0.6, texte: 'Pleine saison : heures sup et pourboires', prime: [0.1, 0.3] },
    { proba: 0.006, texte: 'Brûlure en cuisine', arret: [5, 15], at: true },
    { proba: 0.005, texte: 'L\'établissement fait faillite', licenciement: true }
  ],
  Agriculture: [
    { mois: [8, 9, 10], proba: 0.45, texte: 'Récoltes et vendanges : heures supplémentaires', prime: [0.1, 0.3] },
    { proba: 0.007, texte: 'Accident avec une machine agricole', arret: [10, 40], at: true }
  ],
  'Banque-finance-assurance': [
    { mois: [2, 3], proba: 0.7, texte: 'Bonus annuel versé', prime: [0.5, 4] },
    { proba: 0.003, texte: 'Restructuration de la banque : départ contraint', licenciement: true }
  ],
  'Communication et arts': [
    { proba: 0.03, texte: 'Campagne virale : prime', prime: [0.2, 0.6] },
    { proba: 0.005, texte: 'Perte d\'un gros client : licenciement', licenciement: true }
  ],
  Droit: [
    { proba: 0.04, texte: 'Gros dossier gagné : prime', prime: [0.3, 1.2] },
    { mois: [12], proba: 0.5, texte: 'Bonus de fin d\'année du cabinet', prime: [0.5, 2] }
  ],
  'Sport et animation': [
    { proba: 0.02, texte: 'Blessure : plusieurs semaines sans travailler', arret: [20, 60], at: true },
    { mois: [7, 8], proba: 0.4, texte: 'Saison d\'été : heures supplémentaires', prime: [0.1, 0.25] },
    { proba: 0.01, texte: 'Transfert vers un plus gros club', augmentation: [15, 40], sport: true }
  ],
  "Direction d'entreprise": [
    { mois: [3, 4], proba: 0.6, texte: 'Bonus annuel et actions gratuites', prime: [1, 6] },
    { proba: 0.004, texte: 'Le conseil d\'administration te pousse vers la sortie', licenciement: true }
  ]
};

export function secteurDe(metier) {
  for (const [s, liste] of METIERS_SALAIRES) if (liste.some(m => m[0] === metier)) return s;
  return null;
}

/**
 * Tire les événements d'un mois de travail. rnd : générateur [0, 1[.
 * Renvoie [{ texte, prime (€), perte (€), augmentation (%), licenciement }] (montants en valeurs de 2026).
 */
export function evenementsDuMois(profil, carriere, mois, rnd = Math.random) {
  if (profil.situation !== 'salarie') return [];
  const secteur = secteurDe(profil.metier);
  const sport = /^(Footballeur|Joueur de rugby)/.test(profil.metier || '');
  const fonctionnaire = secteur === 'Fonction publique';
  const liste = [...COMMUNS.filter(e => !(fonctionnaire && e.licenciement)), ...(EVENEMENTS_SECTEUR[secteur] || [])].filter(e => !e.sport || sport);
  const salaire = salaireCarriere(profil, carriere);
  const r = [];
  const entre = ([a, b]) => a + (b - a) * rnd();
  for (const e of liste) {
    if (e.mois && !e.mois.includes(mois)) continue;
    if (rnd() >= e.proba) continue;
    const x = { texte: e.texte };
    if (e.prime) x.prime = Math.round(salaire * entre(e.prime));
    if (e.arret) {
      const j = Math.round(entre(e.arret));
      // Arrêt : indemnités journalières (50 % du brut, mieux pour un accident du travail), 3 jours de carence en maladie
      x.perte = Math.round(salaire * j / 30.44 * (e.at ? 0.2 : 0.35));
      x.texte += ` : ${j} jours d'arrêt`;
    }
    if (e.augmentation) x.augmentation = Math.round(entre(e.augmentation) * 10) / 10;
    if (e.licenciement) x.licenciement = true;
    r.push(x);
    if (e.licenciement) break;
  }
  return r;
}

// ---------- Chômage ----------
// Allocation d'aide au retour à l'emploi : environ 72 % du salaire net (57 % du brut), 18 mois au plus.
export const ARE = { taux: 0.72, plafondMois: 8600, dureeMois: 18 };
export function allocationChomage(salaireNetMensuel) { return Math.min(ARE.plafondMois, salaireNetMensuel * ARE.taux); }
/** Indemnité légale de licenciement : 1/4 de mois par année (10 premières années), 1/3 au-delà. */
export function indemniteLicenciement(salaire, annees) {
  if (annees < 8 / 12) return 0;
  return salaire * (Math.min(annees, 10) / 4 + Math.max(0, annees - 10) / 3);
}

// ---------- Entretien annuel, augmentation demandée ----------
/** Résultat de l'entretien annuel : augmentation en % (rnd fourni pour les tests). */
export function entretienAnnuel(profil, rnd = Math.random) {
  const fp = secteurDe(profil.metier) === 'Fonction publique';
  const promotion = rnd() < 0.1;
  const pct = fp ? 0.5 + rnd() * 1.2 : 0.8 + rnd() * 2.5;
  return { pct: Math.round((pct + (promotion ? 6 + rnd() * 6 : 0)) * 10) / 10, promotion };
}
/** Demande d'augmentation : 35 % de réussite, de 3 à 8 %. */
export function demandeAugmentation(rnd = Math.random, bonus = 0) {
  if (rnd() >= 0.35 + bonus) return { ok: false };
  return { ok: true, pct: Math.round((3 + rnd() * 5) * 10) / 10 };
}
export const CPF = { parAn: 500, plafond: 5000 };
export const SMIC_NET = SMIC.net;
