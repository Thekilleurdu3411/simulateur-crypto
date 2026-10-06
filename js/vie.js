// Vie quotidienne : revenus et dépenses du joueur, calculs purs et testés.
// Sources : SMIC au 1er juin 2026 (info.gouv.fr), grille des apprentis (filiz.io), salaires nets 2026
// (moicombien.fr, salairebrut-en-net.fr, travail-industrie.com, fiche-paie.fr, grilles de la fonction publique ;
// détail par métier dans DECISIONS.md), loyers de juillet 2026 (123loger.com), Périgueux (mysweetimmo,
// février 2026), alimentation (Insee, budget de famille).

export const SMIC = { brut: 1867.02, net: 1477.93 };

// Salaire minimum d'un apprenti en % du SMIC, par âge et année de contrat.
export const APPRENTI = [
  { ageMax: 17, taux: [0.27, 0.39, 0.55] },
  { ageMax: 20, taux: [0.43, 0.51, 0.67] },
  { ageMax: 25, taux: [0.53, 0.61, 0.78] },
  { ageMax: 200, taux: [1, 1, 1] }
];
export const APPRENTI_EXONERATION = 0.5;      // pas de cotisations jusqu'à 50 % du SMIC
export const COTISATIONS_SALARIALES = 0.22;   // part approximative au-delà
export const HEURES_JOB_ETUDIANT = 10;        // job étudiant de 10 h par semaine au SMIC (estimation)

// Salaires nets mensuels : [débutant, confirmé, expérimenté], chacun [min, max].
export const METIERS_SALAIRES = [
  ["Industrie", [
    ["Automaticien", [1820, 2470], [2470, 3250], [2730, 4230]],
    ["Dessinateur projeteur", [1680, 2080], [2080, 2600], [2600, 3120]],
    ["Électronicien", [1600, 1750], [1900, 2100], [2250, 2550]],
    ["Ingénieur généraliste", [2210, 2730], [2730, 3380], [3800, 5250]],
    ["Ingénieur méthodes", [2210, 2730], [2730, 3380], [3380, 4220]],
    ["Mécanicien automobile", [1480, 1750], [1700, 2300], [2200, 3500]],
    ["Monteur câbleur", [1480, 1760], [1950, 2470], [1950, 2730]],
    ["Opérateur de production", [1480, 1690], [1690, 2080], [2080, 2400]],
    ["Responsable de production", [2600, 3120], [3120, 3900], [3900, 4880]],
    ["Soudeur", [1500, 1700], [1700, 2250], [2250, 3400]],
    ["Technicien de laboratoire", [1500, 1650], [1800, 1950], [2200, 2450]],
    ["Technicien de maintenance", [1600, 1840], [1685, 1685], [2560, 3360]],
    ["Technicien qualité", [1630, 1950], [1950, 2410], [2410, 3060]],
    ["Tourneur-fraiseur", [1480, 1950], [1950, 2470], [2210, 3120]]]],
  ["BTP", [
    ["Architecte", [1560, 1870], [2340, 3280], [3280, 4680]],
    ["Carreleur", [1480, 1690], [1690, 2150], [2150, 2730]],
    ["Charpentier", [1480, 1700], [1600, 2000], [1800, 2100]],
    ["Chef de chantier", [1850, 2340], [2340, 3120], [3120, 4060]],
    ["Conducteur d'engins", [1560, 1820], [1820, 2210], [2210, 2730]],
    ["Conducteur de travaux", [2100, 2630], [2630, 3740], [3740, 5070]],
    ["Couvreur", [1480, 1760], [1760, 2210], [2210, 2860]],
    ["Électricien", [1480, 1660], [1660, 2050], [2050, 4000]],
    ["Ingénieur BTP", [2470, 2930], [2930, 3770], [3770, 5530]],
    ["Maçon", [1480, 1630], [1630, 2100], [2080, 2800]],
    ["Menuisier", [1480, 1650], [1850, 2200], [2450, 3050]],
    ["Peintre en bâtiment", [1500, 1640], [1830, 2030], [2030, 2480]],
    ["Plombier", [1480, 1760], [1760, 2280], [2280, 2930]]]],
  ["Tech et numérique", [
    ["Administrateur systèmes et réseaux", [1950, 2470], [2470, 3120], [3120, 3900]],
    ["Chef de projet", [2400, 3200], [3200, 3900], [3900, 5900]],
    ["Data analyst", [1950, 2340], [2340, 3120], [3120, 4030]],
    ["Data scientist", [2400, 3200], [3200, 3800], [3800, 6500]],
    ["Designer UX", [2080, 2540], [2540, 3250], [3250, 4230]],
    ["Développeur", [2000, 2900], [2900, 4300], [3700, 5600]],
    ["Développeur freelance", [3500, 4300], [4000, 5500], [5100, 7200]],
    ["Expert cybersécurité freelance", [4100, 5100], [4700, 6100], [5900, 11400]],
    ["Ingénieur cybersécurité", [2340, 2930], [2930, 4030], [4030, 5850]],
    ["Ingénieur DevOps", [2340, 2930], [2930, 3770], [3770, 5330]],
    ["Technicien support informatique", [1690, 2080], [2080, 2600], [2600, 3250]]]],
  ["Santé et social", [
    ["Aide à domicile", [1480, 1650], [1600, 1850], [1800, 2300]],
    ["Aide-soignant", [1480, 1700], [1650, 1900], [1950, 2200]],
    ["Ambulancier", [1480, 1700], [1700, 1900], [1950, 2350]],
    ["Anesthésiste-réanimateur libéral", [8400, 10700], [13800, 16900], [17600, 23000]],
    ["Assistant de service social", [1560, 1790], [1790, 2180], [2180, 2730]],
    ["Auxiliaire de puériculture", [1650, 1900], [1900, 2250], [2250, 2600]],
    ["Cardiologue libéral", [7200, 9100], [11700, 14300], [15000, 19600]],
    ["Chirurgien hospitalier", [4400, 5200], [4800, 6000], [5400, 8900]],
    ["Chirurgien libéral", [7800, 10000], [12800, 15700], [16400, 21400]],
    ["Chirurgien-dentiste", [5600, 6600], [7800, 9800], [12300, 23900]],
    ["Éducateur spécialisé", [1600, 1750], [1850, 2100], [2300, 2650]],
    ["Ergothérapeute", [1630, 1950], [1950, 2470], [2470, 3120]],
    ["Infirmier", [1600, 1900], [1950, 2350], [2350, 2900]],
    ["Kinésithérapeute", [1700, 1900], [2000, 2300], [2400, 2650]],
    ["Manipulateur radio", [1560, 1950], [1950, 2470], [2470, 3120]],
    ["Médecin généraliste", [3900, 4600], [4800, 6000], [6000, 8000]],
    ["Médecin nucléaire libéral", [12500, 15900], [20400, 24900], [26100, 34000]],
    ["Moniteur-éducateur", [1500, 1760], [1760, 2080], [2080, 2470]],
    ["Ophtalmologiste libéral", [8400, 10700], [13800, 16900], [17700, 23000]],
    ["Opticien", [1560, 1950], [1950, 2470], [2470, 3250]],
    ["Orthophoniste", [1600, 1750], [2000, 2200], [2200, 3000]],
    ["Pharmacien", [2050, 2300], [2250, 2600], [2850, 3300]],
    ["Pharmacien titulaire d'officine", [4600, 5600], [7300, 8900], [11800, 13200]],
    ["Préparateur en pharmacie", [1570, 1890], [1890, 2280], [2280, 2740]],
    ["Psychologue", [1700, 2000], [2000, 2700], [2700, 4500]],
    ["Radiologue libéral", [9400, 11900], [15300, 18700], [19600, 25500]],
    ["Radiothérapeute libéral", [18400, 23400], [30100, 36700], [38400, 50100]],
    ["Sage-femme", [1870, 2030], [2110, 2340], [2420, 3120]],
    ["Secrétaire médicale", [1480, 1550], [1600, 1750], [1900, 2100]],
    ["Vétérinaire", [2400, 2800], [3400, 4000], [4800, 6000]]]],
  ["Éducation", [
    ["ATSEM", [1490, 1550], [1550, 1650], [1750, 1900]],
    ["CPE", [1920, 2210], [2210, 2730], [2730, 3450]],
    ["Formateur pour adultes", [1630, 1950], [1950, 2470], [2470, 2930]],
    ["Maître de conférences", [2280, 2730], [2730, 3580], [3580, 4560]],
    ["Professeur de collège-lycée", [1850, 2100], [2100, 2300], [2400, 3000]],
    ["Professeur des écoles", [1800, 2200], [2250, 2700], [2800, 4000]]]],
  ["Commerce et artisanat", [
    ["Boucher", [1480, 1600], [1700, 1900], [2100, 2300]],
    ["Boulanger", [1490, 1800], [1750, 2000], [2000, 3500]],
    ["Caissier", [1480, 1500], [1480, 1590], [1590, 1760]],
    ["Coiffeur", [1480, 1550], [1700, 1900], [2100, 2500]],
    ["Commercial", [1820, 2210], [2470, 3380], [3380, 4880]],
    ["Directeur de magasin", [2340, 2930], [3120, 4160], [4230, 5850]],
    ["Esthéticien", [1480, 1500], [1500, 1650], [2000, 2250]],
    ["Fleuriste", [1480, 1550], [1600, 1750], [1900, 2050]],
    ["Jardinier paysagiste", [1480, 1700], [1600, 2000], [1900, 3500]],
    ["Pâtissier", [1480, 1550], [1700, 1900], [2200, 3100]],
    ["Vendeur en magasin", [1480, 1560], [1560, 1820], [1800, 2140]]]],
  ["Fonction publique", [
    ["Agent administratif", [1490, 1840], [1840, 2120], [2260, 2600]],
    ["Ambassadeur", [9000, 9500], [9500, 14400], [14400, 15300]],
    ["Facteur", [1480, 1560], [1500, 1640], [1550, 1900]],
    ["Gardien de la paix", [2000, 2350], [2400, 3000], [3000, 3700]],
    ["Gendarme", [2120, 2250], [2540, 2820], [3190, 4340]],
    ["Haut fonctionnaire", [3200, 3800], [5000, 6500], [7000, 9000]],
    ["Militaire du rang", [1550, 1750], [1600, 1850], [1830, 2050]],
    ["Policier municipal", [1680, 1750], [2000, 2100], [2400, 2600]],
    ["Pompier professionnel", [1750, 2100], [2100, 2600], [2600, 4500]],
    ["Préfet", [8100, 9600], [9600, 10700], [10700, 11500]],
    ["Surveillant pénitentiaire", [2040, 2200], [2200, 2600], [2600, 3100]]]],
  ["Services", [
    ["Agent d'entretien", [1480, 1500], [1500, 1650], [1750, 1900]],
    ["Agent de sécurité", [1550, 1750], [1700, 2000], [1950, 2500]],
    ["Agent immobilier", [1500, 2000], [2500, 3200], [3500, 4500]],
    ["Assistant de direction", [1720, 2100], [2100, 2500], [2500, 3120]],
    ["Assistant RH", [1500, 1650], [1800, 2000], [2150, 2350]],
    ["Chargé de recrutement", [1740, 2150], [2150, 2930], [2930, 3900]],
    ["Expert-comptable", [3000, 3500], [3500, 3800], [3800, 7300]],
    ["Gestionnaire de paie", [1600, 2000], [2000, 2800], [2560, 3600]],
    ["Moniteur d'auto-école", [1600, 1800], [1800, 2000], [2150, 2500]],
    ["Secrétaire", [1600, 1700], [1800, 2000], [2100, 2500]]]],
  ["Transport et logistique", [
    ["Cariste", [1480, 1560], [1560, 1820], [1820, 2150]],
    ["Chauffeur routier", [1510, 1760], [1760, 2150], [2150, 2600]],
    ["Chauffeur-livreur", [1480, 1500], [1500, 1690], [1690, 1950]],
    ["Commandant de bord long-courrier", [10600, 12000], [12000, 14000], [14000, 16300]],
    ["Conducteur de bus", [1480, 1690], [1690, 2080], [2080, 2470]],
    ["Conducteur de train", [1820, 2150], [2150, 2600], [2600, 3250]],
    ["Contrôleur aérien", [1480, 2200], [5500, 7300], [7300, 8500]],
    ["Pilote de ligne", [4000, 5000], [5200, 6600], [8000, 12000]],
    ["Préparateur de commandes", [1480, 1550], [1600, 1750], [1850, 2000]],
    ["Responsable logistique", [2080, 2470], [2600, 3380], [3380, 4550]]]],
  ["Hôtellerie-restauration", [
    ["Barman", [1500, 1690], [1690, 2080], [2080, 2470]],
    ["Chef de cuisine", [2080, 2730], [2730, 3640], [3640, 5850]],
    ["Chef de partie", [1790, 2210], [2210, 2730], [2730, 3390]],
    ["Commis de cuisine", [1480, 1630], [1630, 1820], [1820, 2080]],
    ["Réceptionniste", [1480, 1690], [1690, 2080], [2080, 2600]],
    ["Serveur", [1500, 1690], [1690, 2080], [2080, 2600]],
    ["Valet de chambre", [1480, 1560], [1560, 1760], [1730, 1920]]]],
  ["Agriculture", [
    ["Chef d'élevage", [1500, 1760], [1820, 2210], [2210, 2730]],
    ["Chef de culture", [1560, 1820], [1950, 2470], [2470, 3120]],
    ["Ingénieur agronome", [1950, 2340], [2470, 3120], [3120, 4230]],
    ["Ouvrier agricole", [1480, 1500], [1500, 1690], [1690, 1940]],
    ["Ouvrier viticole", [1480, 1500], [1530, 1760], [1710, 1970]],
    ["Technicien agricole", [1560, 1820], [1890, 2340], [2340, 2860]],
    ["Tractoriste", [1480, 1560], [1630, 1890], [1890, 2210]]]],
  ["Banque-finance-assurance", [
    ["Actuaire", [2470, 2990], [3250, 4420], [4550, 6500]],
    ["Analyste financier", [2470, 3120], [3380, 4680], [4880, 7800]],
    ["Banquier d'affaires", [4300, 7600], [7600, 13900], [14300, 47500]],
    ["Comptable", [1560, 1950], [2190, 2730], [2500, 2970]],
    ["Conseiller bancaire", [1720, 1980], [2020, 2470], [2470, 3020]],
    ["Conseiller en assurance", [1500, 1760], [1820, 2210], [2210, 2600]],
    ["Contrôleur de gestion", [2190, 2730], [2730, 3900], [3900, 5070]],
    ["Gérant de portefeuille", [2700, 3600], [3900, 5500], [5900, 9800]],
    ["Gestionnaire de patrimoine", [2080, 2600], [2860, 4030], [4030, 5850]],
    ["Trader", [3800, 4100], [6300, 7000], [8200, 18400]]]],
  ["Communication et arts", [
    ["Chargé de communication", [1630, 1950], [1950, 2600], [2600, 3380]],
    ["Community manager", [1480, 1600], [1760, 2240], [2240, 3200]],
    ["Directeur artistique", [2280, 2730], [2730, 3580], [3580, 4880]],
    ["Graphiste", [1650, 1800], [2000, 2250], [2400, 2800]],
    ["Journaliste", [1600, 1800], [2300, 2600], [3600, 4600]]]],
  ["Droit", [
    ["Assistant juridique", [1690, 2080], [2080, 2600], [2600, 3250]],
    ["Avocat", [1950, 2730], [3040, 5320], [6000, 12000]],
    ["Avocat associé en cabinet d'affaires", [6300, 12700], [12700, 22500], [22500, 60000]],
    ["Juriste", [2000, 2400], [2700, 3300], [3800, 4800]],
    ["Notaire associé", [5200, 9200], [12000, 17600], [20900, 33300]],
    ["Notaire salarié", [1800, 2200], [2900, 3400], [3500, 4500]]]],
  ["Sport et animation", [
    ["Animateur", [1500, 1620], [1620, 1750], [1730, 1950]],
    ["Éducateur sportif", [1480, 1560], [1560, 1740], [1770, 2100]],
    ["Footballeur professionnel de Ligue 1", [17200, 31200], [31200, 106900], [106900, 171600]],
    ["Joueur de rugby du Top 14", [3100, 3900], [12300, 18200], [18200, 39000]],
    ["Maître-nageur", [1560, 1650], [1750, 1900], [2000, 2500]]]],
  ["Direction d'entreprise", [
    ["Consultant en stratégie", [3000, 3800], [8600, 11700], [14600, 26000]],
    ["Directeur commercial", [4400, 6300], [5700, 8200], [7600, 12700]],
    ["Directeur des systèmes d'information", [4900, 6600], [6600, 8900], [8200, 8900]],
    ["Directeur financier", [4100, 4800], [5700, 7000], [7600, 15800]],
    ["Directeur général de PME", [2900, 4800], [4800, 7000], [7000, 9500]],
    ["PDG de grand groupe coté", [245000, 380000], [380000, 583000], [583000, 1350000]]]]
];
export const EXPERIENCES = [['debutant', 'Débutant'], ['confirme', 'Confirmé'], ['experimente', 'Expérimenté']];

// Loyer moyen d'un T2 (€ par mois). Ville absente : 12 €/m² sur 40 m², valeur de Périgueux.
export const LOYERS_T2 = {
  paris: 1602, lyon: 965, marseille: 835, bordeaux: 869, toulouse: 767, lille: 800, nantes: 715,
  nice: 1119, montpellier: 793, strasbourg: 879, rennes: 722, perigueux: 480
};
export const LOYER_M2_DEFAUT = 12;
export const FACTEUR_MAISON = 1.8;  // maison avec garage par rapport à un T2 (estimation)

export const ALIMENTATION = { econome: 250, normal: 297, confort: 375 };
export const LOISIRS = { econome: 30, normal: 100, confort: 250 };
export const FORFAITS = { internetMobile: 40, assuranceHabitation: 15 };
export const ABONNEMENT_ELEC_MOIS = { 6: 190.32 / 12, 9: 238.56 / 12, 12: 285.12 / 12 };
export const AGIOS_ANNUELS = 0.16;

// Transports (coût mensuel). Voiture déjà possédée, sans crédit : carburant 119 €, assurance 45 €, entretien 44 €
// (fiches-auto.fr, budget 2025). Passe Navigo 90,80 € (janvier 2026) ; ailleurs, abonnement urbain estimé à 50 €.
// L'employeur rembourse la moitié de l'abonnement ; les étudiants ont un tarif réduit d'environ moitié.
export const TRANSPORTS = [
  ['commun', 'Transports en commun'], ['voiture', 'Voiture'], ['velo', 'Vélo'], ['pied', 'À pied']
];
export const VOITURE_MOIS = 119 + 45 + 44;
export const NAVIGO = 90.80, ABONNEMENT_URBAIN = 50, VELO_MOIS = 10;

export function coutTransport(profil) {
  const t = profil.transport || 'commun';
  if (t === 'voiture') return VOITURE_MOIS;
  if (t === 'velo') return VELO_MOIS;
  if (t === 'pied') return 0;
  const prix = normaliser(profil.ville) === 'paris' ? NAVIGO : ABONNEMENT_URBAIN;
  return ['salarie', 'alternant', 'etudiant'].includes(profil.situation) ? prix / 2 : prix;
}

// Prestations sociales au 1er avril 2026 (personne seule, sans enfant). RSA : décret 2026-220, 25 ans et plus.
// Prime d'activité : montant forfaitaire 638,28 €, 61 % des revenus d'activité, bonification individuelle
// de 0 à 240,63 € entre 0,5 et 1,15 SMIC (réforme d'avril 2026). Forfait logement (hébergé gratuitement) : 12 %.
export const RSA = { forfait: 651.69, ageMin: 25 };
export const PRIME_ACTIVITE = { forfait: 638.28, taux: 0.61, bonifMax: 240.63, bonifDebut: 0.5, bonifPlein: 1.15, minimum: 15, seuilEtudiant: 0.78 };
export const FORFAIT_LOGEMENT = 0.12;

/** Prestations mensuelles du profil : [{ nom, montant }]. */
export function prestations(profil) {
  const age = Number(profil.age) || 25;
  const r = salaireNet(profil);
  const logementGratuit = profil.logement === 'parents';
  const l = [];
  if (age >= RSA.ageMin && profil.situation !== 'etudiant' && profil.situation !== 'alternant') {
    const fl = logementGratuit ? RSA.forfait * FORFAIT_LOGEMENT : 0;
    const rsa = RSA.forfait - r - fl;
    if (rsa > 0 && r === 0) l.push({ nom: 'RSA', montant: rsa });
  }
  const pa = PRIME_ACTIVITE;
  const eligible = age >= 18 && r > 0 && (!['etudiant', 'alternant'].includes(profil.situation) || r >= pa.seuilEtudiant * SMIC.net);
  if (eligible) {
    const x = (r / SMIC.net - pa.bonifDebut) / (pa.bonifPlein - pa.bonifDebut);
    const bonif = pa.bonifMax * Math.min(1, Math.max(0, x));
    const fl = logementGratuit ? RSA.forfait * FORFAIT_LOGEMENT : 0;
    const montant = pa.forfait + pa.taux * r + bonif - Math.max(pa.forfait, r) - fl;
    if (montant >= pa.minimum) l.push({ nom: "Prime d'activité", montant });
  }
  return l.map(x => ({ nom: x.nom, montant: Math.round(x.montant * 100) / 100 }));
}
export const MOIS = 30.44 * 864e5;

const normaliser = v => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

export function trouverMetier(nom) {
  for (const [, liste] of METIERS_SALAIRES) for (const m of liste) if (m[0] === nom) return m;
  return null;
}

/** Salaire net mensuel du profil. */
export function salaireNet(profil) {
  if (profil.situation === 'salarie') {
    const m = trouverMetier(profil.metier);
    if (!m) return SMIC.net;
    const [a, b] = m[1 + Math.max(0, EXPERIENCES.findIndex(x => x[0] === (profil.experience || 'debutant')))];
    return (a + b) / 2;
  }
  if (profil.situation === 'alternant') {
    const age = Number(profil.age) || 20;
    const ligne = APPRENTI.find(l => age <= l.ageMax);
    const brut = SMIC.brut * ligne.taux[Math.min(2, Math.max(0, (Number(profil.anneeApprentissage) || 1) - 1))];
    const seuil = SMIC.brut * APPRENTI_EXONERATION;
    return brut <= seuil ? brut : brut - (brut - seuil) * COTISATIONS_SALARIALES;
  }
  if (profil.situation === 'etudiant') return SMIC.net * HEURES_JOB_ETUDIANT / 35; // job étudiant payé au SMIC
  return 0; // sans emploi : aucun revenu
}

export function loyer(profil) {
  if (profil.logement === 'parents') return 0;
  const t2 = LOYERS_T2[normaliser(profil.ville)] ?? LOYER_M2_DEFAUT * 40;
  return profil.logement === 'maison' ? t2 * FACTEUR_MAISON : t2;
}

/** Dépenses mensuelles détaillées. */
export function depenses(profil, kva = 6, { impot = true } = {}) {
  const mode = profil.modeVie || 'normal';
  const chezParents = profil.logement === 'parents';
  const l = [
    ['Loyer', loyer(profil)],
    ['Alimentation', chezParents ? ALIMENTATION[mode] * 0.5 : ALIMENTATION[mode]],
    ['Loisirs et sorties', LOISIRS[mode]],
    ['Transports', coutTransport(profil)],
    ['Forfait mobile et internet', chezParents ? 15 : FORFAITS.internetMobile],
    ['Assurance habitation', chezParents ? 0 : FORFAITS.assuranceHabitation],
    ['Abonnement électricité', chezParents ? 0 : ABONNEMENT_ELEC_MOIS[kva] || ABONNEMENT_ELEC_MOIS[6]],
    ['Impôt sur le revenu (prélèvement à la source)', impot ? impotRevenu(profil) / 12 : 0]
  ];
  return l.filter(([, v]) => v > 0).map(([nom, montant]) => ({ nom, montant: Math.round(montant * 100) / 100 }));
}

/**
 * Fait avancer la vie de t0 à t1 : salaire et dépenses à chaque échéance, agios sur le découvert.
 * periode : durée d'un « mois » de vie (raccourcie par la vitesse du temps de la difficulté).
 */
export function avancerVie(vie, banque, profil, t0, t1, periode, kva, options = {}) {
  const evts = [];
  if (!(t1 > t0)) return evts;
  if (!vie.prochaineEcheance) vie.prochaineEcheance = t0 + periode;
  let t = t0;
  while (vie.prochaineEcheance <= t1) {
    const e = vie.prochaineEcheance;
    // Agios sur la période écoulée si le compte était à découvert
    if (banque.solde < 0) {
      const agios = Math.round(-banque.solde * AGIOS_ANNUELS * (e - t) / (365 * 864e5) * 100) / 100;
      if (agios > 0) { banque.solde -= agios; evts.push({ t: e, texte: `Agios de découvert : ${agios.toFixed(2).replace('.', ',')} €` }); }
    }
    // Changements d'emploi arrivés à échéance
    if (vie.changement && vie.changement.le <= e) {
      Object.assign(profil, vie.changement.profil);
      evts.push({ t: vie.changement.le, texte: vie.changement.texte });
      vie.changement = null;
    }
    // Montants de 2026 ramenés à l'année de l'échéance (inflation, revalorisations du 1er janvier)
    const k = options.indice ? options.indice(e) : 1;
    const s = Math.round(salaireNet(profil) * k * 100) / 100;
    if (s > 0) { banque.solde += s; evts.push({ t: e, texte: `Salaire reçu : ${s.toFixed(2).replace('.', ',')} €` }); }
    for (const p of prestations(profil)) { const m = Math.round(p.montant * k * 100) / 100; banque.solde += m; evts.push({ t: e, texte: `${p.nom} versé(e) par la CAF : ${m.toFixed(2).replace('.', ',')} €` }); }
    const dep = depenses(profil, kva, options);
    const total = Math.round(dep.reduce((x, d) => x + d.montant, 0) * k * 100) / 100;
    banque.solde -= total;
    evts.push({ t: e, texte: `Dépenses du mois (loyer, courses, forfaits, loisirs${dep.some(d => d.nom.startsWith('Impôt')) ? ', impôt' : ''}) : ${total.toFixed(2).replace('.', ',')} €` + (banque.solde < 0 ? ' · compte à découvert' : '') });
    t = e;
    vie.prochaineEcheance = e + periode;
  }
  if (vie.changement && vie.changement.le <= t1) {
    Object.assign(profil, vie.changement.profil);
    evts.push({ t: vie.changement.le, texte: vie.changement.texte });
    vie.changement = null;
  }
  return evts;
}

// Barème de l'impôt sur le revenu (revenus 2025, loi de finances 2026), une part.
export const BAREME_IR = [[11600, 0], [29579, 0.11], [84577, 0.30], [181917, 0.41], [Infinity, 0.45]];
export const ABATTEMENT_FRAIS_PRO = 0.10;

/** Revenu imposable annuel tiré du salaire (apprentis et jobs étudiants exonérés jusqu'au SMIC annuel). */
export function revenuImposable(profil) {
  const annuel = salaireNet(profil) * 12;
  const exonere = profil.situation === 'alternant' || profil.situation === 'etudiant' ? SMIC.brut * 12 : 0;
  return Math.max(0, annuel - exonere) * (1 - ABATTEMENT_FRAIS_PRO);
}

/** Tranche marginale d'imposition d'une personne seule. */
export function tmi(profil) {
  const r = revenuImposable(profil);
  for (const [plafond, taux] of BAREME_IR) if (r <= plafond) return taux;
  return 0.45;
}

// Décote des petits impôts (personne seule, revenus 2025) : 897 € − 45,25 % de l'impôt brut, sous 1 982 €.
export const DECOTE = { seuil: 1982, forfait: 897, taux: 0.4525 };

/** Impôt annuel sur le salaire d'une personne seule (une part), décote comprise. */
export function impotRevenu(profil) {
  const r = revenuImposable(profil);
  let impot = 0, bas = 0;
  for (const [plafond, taux] of BAREME_IR) { if (r > bas) impot += (Math.min(r, plafond) - bas) * taux; bas = plafond; }
  if (impot < DECOTE.seuil) impot = Math.max(0, impot - Math.max(0, DECOTE.forfait - DECOTE.taux * impot));
  return Math.round(impot);
}
