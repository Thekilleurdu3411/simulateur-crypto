// Point d'entrée : état de l'interface, actions du joueur, mises à jour en direct.
import * as M from './market.js';
import { DIFFICULTES, INTERVALLES, REGLAGES, reglesDe, nettoyerReglages } from './config.js';
import { vueReglages, valeurTexte } from './views-reglages.js';
import { reglerHorloge, enRejeu } from './horloge.js';
import { charger, sauver, effacer, nouvellePartie, demarrerKyc, verifierKyc, journal, DATE_MIN_REJEU, dateDepart } from './state.js';
import { acheterAuMarche, vendreAuMarche } from './engine.js';
import { preparerOrdre, reserveAchat } from './orders.js';
import { appliquerAchat, appliquerVente, placerOrdre, annulerOrdre, ordresDe } from './portefeuille.js';
import { traiterPeriode, rattraper } from './suivi.js';
import { noterAchat, noterCession, definirEvaluateur, echeances, deposer } from './jeufisc.js';
import { valeurDerivesEUR } from './jeufutures.js';
import { avancerViePartie, changerSituation, annulerChangement } from './jeuvie.js';
import { TRANSPORTS } from './vie.js';
import { vueLancement, vueProfil, vueNouvellePartie, vueJeu, vueSuperpositions, valeurLive, nombre } from './views.js';
import { dessinerBougies } from './chart.js';
import * as D from './donnees.js';
import * as F from './marchefutures.js';
import { futuresDe, transferer, ouvrirPosition, fermerPosition, surPrixMarque, rattraper as rattraperFut } from './jeufutures.js';
import { acheterRig, changerCrypto, convertirEnBTC, envoyer, rapatrier, changerCompteur } from './jeuminage.js';
import { prixAltEUR, calculerRig } from './altcoins.js';
import { minageDe, acheter as acheterMachine, demarrer as demarrerMachine, arreter as arreterMachine, avancerPartie, joursEntre, changerMode, depoussierer, devisReparation, reparer, vendre, valeurReventeEUR, acheterVentilation } from './jeuminage.js';
import { marcheMachines, modele, prixMachineEUR, LIVRAISON, jourTempo, VENTILATION, MODES, HEBERGEURS, ENVOI, CHANGEMENT_PUISSANCE, hebergeur } from './minage.js';
import { eur, prix, qte, pct, duree } from './format.js';
import { maintenant as tJeu } from './horloge.js';

const racine = document.getElementById('app');
const superpositions = document.getElementById('superpositions');

let partie = charger();
reglerHorloge(partie);
const saisieVide = () => ({ montant: '', quantite: '', prix: '', stop: '', limiteStop: '' });
const app = {
  ecran: 'lancement',
  onglet: 'accueil',
  crypto: null,
  intervalle: '1h',
  sens: 'achat',
  typeOrdre: 'marche',
  saisie: saisieVide(),
  virement: { sens: 'plateforme', montant: '' },
  brouillon: {
    profil: { prenom: '', nom: '', age: '', ville: '', situation: 'alternant', metier: 'Technicien de maintenance', experience: 'debutant', anneeApprentissage: 1, logement: 'appart', modeVie: 'normal', transport: 'commun' },
    difficulte: 'expert',
    capital: DIFFICULTES.expert.capital,
    reglages: {},
    depart: { type: 'direct', jour: '' }
  },
  enCours: false,
  confirmation: null,
  toast: null,
  graph: null,
  graphErreur: false,
  absence: null,
  sousMinage: 'parc',
  rig: { carte: '3070', nb: 6, coin: 'RVN' },
  vueMarche: 'comptant',
  perp: { s: 'BTCUSDT', sens: 'long', levier: 2, marge: '', tr: '', trSens: 'vers-marge' }
};

// Prix en euros de toute crypto : cours de la plateforme, sinon cours WhatToMine converti.
function prixEUR(base) { return M.prixDeBase(base) ?? prixAltEUR(base, D.etat.alt, M.prixDeBase('BTC')); }
const marche = { ...M, prixDeBase: prixEUR };

// Valeur de tous les actifs numériques (pour la méthode du portefeuille global).
definirEvaluateur(p => {
  let v = 0;
  for (const [base, a] of Object.entries(p.plateforme.actifs)) v += a.qte * (prixEUR(base) || 0);
  for (const o of p.plateforme.ordres || []) if (o.reserve.qte) v += o.reserve.qte * (prixEUR(o.base) || 0);
  if (p.minage) {
    v += p.minage.soldePool * (prixEUR('BTC') || 0);
    for (const [tag, q] of Object.entries(p.minage.soldesAlt || {})) v += q * (prixEUR(tag) || 0);
  }
  v += valeurDerivesEUR(p, F.etat.marques, D.etat.eurUsd);
  return v;
});

function ctx() {
  const cj = jourTempo(tJeu()), cd = jourTempo(tJeu() + 864e5);
  const cache = partie?.minage?.couleurs || {};
  return { app, partie, M: marche, D, F, couleurAujourdhui: D.etat.couleurs[cj] || cache[cj], couleurDemain: D.etat.couleurs[cd] || cache[cd] };
}
function difficulte() { return reglesDe(partie); }

// ---------- Affichage ----------

function rendre() {
  const c = ctx();
  const vues = { lancement: vueLancement, profil: vueProfil, partie: vueNouvellePartie, reglages: vueReglages, jeu: vueJeu };
  racine.innerHTML = vues[app.ecran](c);
  rendreSuperpositions();
  if (app.ecran === 'jeu' && app.onglet === 'marche' && app.crypto) preparerGraphique();
}

function rendreSuperpositions() { superpositions.innerHTML = vueSuperpositions(app); }

// Date de départ d'une partie en rejeu : entre la première date jouable et la veille.
function verifierJour(jour) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour || '')) return 'Choisis une date de départ.';
  if (jour < DATE_MIN_REJEU) return 'Le rejeu commence au ' + new Date(DATE_MIN_REJEU).toLocaleDateString('fr-FR') + ' : pas de cotation en euros avant.';
  if (dateDepart(jour) > Date.now() - 864e5) return 'Choisis une date passée, au plus tard hier.';
  return null;
}

// L'horloge du jeu change (nouvelle partie à une date passée, abandon d'un rejeu) : on recharge les données.
function changerHorloge() {
  reglerHorloge(partie);
  M.changerMode();
  D.changerMode().then(() => preparerMeteo()).catch(() => {});
  D.chargerTempo([jourTempo(tJeu()), jourTempo(tJeu() + 864e5)]).catch(() => {});
  app.graph = null;
}

// Réglages avancés : fusionne, borne et garde seulement les écarts à la difficulté de base.
function regler(cle, val) {
  const b = app.brouillon;
  b.reglages = nettoyerReglages(b.difficulte, { ...DIFFICULTES[b.difficulte], ...b.reglages, [cle]: val });
}

function changerEcran(ecran) { app.ecran = ecran; rendre(); window.scrollTo(0, 0); }

let minuterieToast = null;
function toast(texte, type = '') {
  app.toast = { texte, type };
  rendreSuperpositions();
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { app.toast = null; rendreSuperpositions(); }, type === 'erreur' ? 5000 : 4000);
}

function confirmer(titre, texte, bouton, action, danger = false) {
  app.confirmation = { titre, texte, bouton, action, danger };
  rendreSuperpositions();
}

// Met à jour les chiffres en direct sans redessiner l'écran (les champs gardent le focus).
function majLive() {
  const c = ctx();
  racine.querySelectorAll('[data-live]').forEach(el => {
    const v = valeurLive(el.dataset.live, c);
    if (el.textContent !== v.t) el.textContent = v.t;
    const cls = [el.dataset.cls, v.cls].filter(Boolean).join(' ');
    if (el.className !== cls) el.className = cls;
  });
}
let majPrevue = false;
function planifierMaj() {
  if (majPrevue) return;
  majPrevue = true;
  setTimeout(() => { majPrevue = false; majLive(); }, 250);
}

// ---------- Graphique ----------

const dureeIntervalle = { '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 };

async function preparerGraphique() {
  const canvas = document.getElementById('graphique');
  const g = app.graph;
  if (g && g.s === app.crypto && g.intervalle === app.intervalle && g.bougies) { dessiner(); return; }
  const s = app.crypto, iv = app.intervalle;
  app.graph = { s, intervalle: iv, bougies: null };
  try {
    const lim = INTERVALLES.find(i => i.id === iv).limite;
    const b = await M.bougies(s, iv, lim);
    if (!app.graph || app.graph.s !== s || app.graph.intervalle !== iv) return;
    app.graph.bougies = b;
    app.graphErreur = false;
    dessiner();
  } catch (e) {
    app.graphErreur = true;
    const msg = document.getElementById('graph-msg');
    if (msg && canvas) msg.textContent = 'Graphique indisponible pour le moment.';
  }
}

function dessiner() {
  const canvas = document.getElementById('graphique');
  const msg = document.getElementById('graph-msg');
  if (!canvas || !app.graph || !app.graph.bougies) return;
  if (msg) msg.hidden = true;
  dessinerBougies(canvas, app.graph.bougies, prix);
}

// Fait vivre la dernière bougie avec le prix en direct.
function majBougie(symbole) {
  const g = app.graph;
  if (!g || !g.bougies || g.s !== symbole) return;
  const t = M.ticker(symbole);
  const der = g.bougies[g.bougies.length - 1];
  const d = dureeIntervalle[g.intervalle];
  if (tJeu() >= der.t + d && g.intervalle !== '1w') {
    g.bougies.push({ t: der.t + d, o: der.c, h: t.c, l: t.c, c: t.c });
    g.bougies.shift();
  } else {
    der.c = t.c; der.h = Math.max(der.h, t.c); der.l = Math.min(der.l, t.c);
  }
}
let dessinPrevu = false;
function planifierDessin() {
  if (dessinPrevu) return;
  dessinPrevu = true;
  setTimeout(() => { dessinPrevu = false; if (app.ecran === 'jeu' && app.onglet === 'marche' && app.crypto) dessiner(); }, 1000);
}
window.addEventListener('resize', () => planifierDessin());

// ---------- Ordres ----------

function cryptoActive() { return M.cryptosDisponibles().find(c => c.s === app.crypto); }

async function passerOrdre() {
  const c = cryptoActive();
  if (!c || app.enCours) return;
  if (app.typeOrdre !== 'marche') return placerOrdreEnAttente(c);
  const d = difficulte();
  const pl = partie.plateforme;
  const achat = app.sens === 'achat';
  let montant = 0, quantite = 0;
  if (achat) {
    montant = nombre(app.saisie.montant);
    if (montant <= 0) return toast('Indique un montant en euros.', 'erreur');
    if (montant > pl.soldeEUR + 1e-9) return toast('Solde insuffisant sur la plateforme : ' + eur(pl.soldeEUR) + '.', 'erreur');
  } else {
    quantite = nombre(app.saisie.quantite);
    const dispo = pl.actifs[c.base]?.qte || 0;
    if (quantite <= 0) return toast('Indique une quantité à vendre.', 'erreur');
    if (quantite > dispo + 1e-12) return toast('Tu ne possèdes que ' + qte(dispo) + ' ' + c.base + ' disponibles.', 'erreur');
  }

  app.enCours = true; rendre();
  let res;
  try {
    const [regles, livre] = await Promise.all([M.regles(c.s), M.carnet(c.s)]);
    const commun = { carnet: livre, mode: d.execution, tauxFrais: d.frais, pas: regles.pas, minNotional: regles.minNotional };
    res = achat ? acheterAuMarche({ ...commun, budget: montant }) : vendreAuMarche({ ...commun, quantite });
  } catch (e) {
    res = { erreur: 'Impossible de joindre la plateforme. Vérifie ta connexion et réessaie.' };
  }
  app.enCours = false;
  if (res.erreur) { rendre(); return toast(res.erreur, 'erreur'); }

  const glisse = res.glissement > 0.00005 ? ' · glissement ' + pct(res.glissement).replace('+', '') : '';
  if (achat) {
    appliquerAchat(partie, c.base, res.qteNette, res.cout);
    noterAchat(partie, res.cout);
    journal(partie, 'achat', `Achat de ${qte(res.qteNette)} ${c.base} à ${prix(res.prixMoyen)} € (${eur(res.cout)}${res.frais ? ', frais ' + qte(res.frais) + ' ' + c.base : ''})`);
    toast(`Achat exécuté : ${qte(res.qteNette)} ${c.base} à ${prix(res.prixMoyen)} €${glisse}`, 'ok');
  } else {
    const pv = appliquerVente(partie, c.base, res.quantite, res.recuNet);
    noterCession(partie, res.recuNet);
    journal(partie, 'vente', `Vente de ${qte(res.quantite)} ${c.base} à ${prix(res.prixMoyen)} € (${eur(res.recuNet)} reçus, ${pv >= 0 ? 'plus' : 'moins'}-value ${eur(Math.abs(pv))})`);
    toast(`Vente exécutée : ${eur(res.recuNet)} reçus${glisse}`, 'ok');
  }
  app.saisie = saisieVide();
  sauver(partie);
  rendre();
}

async function placerOrdreEnAttente(c) {
  const s = app.saisie;
  const params = {
    s: c.s, base: c.base, sens: app.sens, type: app.typeOrdre, qte: nombre(s.quantite),
    prix: nombre(s.prix), stop: nombre(s.stop), limiteStop: nombre(s.limiteStop), maintenant: tJeu()
  };
  if (!(params.qte > 0)) return toast('Indique une quantité de ' + c.base + '.', 'erreur');
  app.enCours = true; rendre();
  let res;
  try {
    const [regles, marche] = await Promise.all([M.regles(c.s), M.meilleursPrix(c.s)]);
    res = preparerOrdre(params, marche, regles);
    if (!res.erreur) res = placerOrdre(partie, res.ordre);
  } catch (e) {
    res = { erreur: 'Impossible de joindre la plateforme. Vérifie ta connexion et réessaie.' };
  }
  app.enCours = false;
  if (res.erreur) { rendre(); return toast(res.erreur, 'erreur'); }
  const pl = partie.plateforme;
  if (!pl.suiviJusqua || ordresDe(partie).length === 1) pl.suiviJusqua = res.ordre.creeLe;
  app.saisie = saisieVide();
  sauver(partie);
  rendre();
  toast('Ordre placé. Il s\'exécutera quand le marché réel atteindra ton prix.', 'ok');
}

// Bougie d'une minute en direct : on vérifie les ordres de cette paire.
function surBougie(s, k) {
  if (!partie || !ordresDe(partie).some(o => o.s === s)) return;
  const evts = traiterPeriode(partie, s, { debut: k.t, fin: k.t + 60000, haut: k.h, bas: k.l, cloture: k.c }, difficulte().frais);
  partie.plateforme.suiviJusqua = Math.max(partie.plateforme.suiviJusqua || 0, k.t);
  if (evts.length) {
    sauver(partie);
    if (app.ecran === 'jeu') rendre();
    toast(evts[evts.length - 1], 'ok');
  }
}

// Rejoue le marché réel pendant l'absence ou une coupure du flux.
let rattrapageEnCours = false;
async function lancerRattrapage(retour) {
  if (!partie || rattrapageEnCours || !ordresDe(partie).length) return;
  rattrapageEnCours = true;
  const depuis = partie.vuLe;
  const r = await rattraper(partie, M, difficulte().frais);
  rattrapageEnCours = false;
  if (r.erreur || !r.evenements.length) { sauver(partie); return; }
  partie.historique.sort((a, b) => b.t - a.t);
  sauver(partie);
  if (retour && depuis) ajouterAbsence(depuis, r.evenements);
  else toast(r.evenements[r.evenements.length - 1], 'ok');
  if (app.ecran === 'jeu') rendre();
}

function ajouterAbsence(depuis, evenements) {
  if (!evenements.length) return;
  if (app.absence) app.absence.evenements.push(...evenements);
  else app.absence = { duree: duree(tJeu() - (depuis || tJeu())), evenements: [...evenements] };
}

// Minage : fait avancer gains, factures et livraisons jusqu'à maintenant.
function avancerMinage(absence = false) {
  if (!partie || !partie.minage) return [];
  return avancerPartie(partie, tJeu(), { reseau: D.etat.reseau, couleurs: D.etat.couleurs, prixBTC: M.prixDeBase('BTC'), prixEUR, alt: D.etat.alt, eurUsd: D.etat.eurUsd, temperature: D.temperatureExterieure, absence });
}

// Météo réelle de la ville du joueur (pour la température de la pièce).
async function preparerMeteo() {
  if (!partie || !partie.minage) return;
  const mn = partie.minage;
  try {
    if (!mn.lieu) { mn.lieu = await D.localiser(partie.profil.ville || 'Paris') || await D.localiser('Paris'); sauver(partie); }
    await D.chargerMeteo(mn.lieu);
  } catch (e) { /* météo indisponible : la pièce est supposée à 20 °C hors machines */ }
}

async function rattraperMinage(depuis) {
  if (!partie || !partie.minage) return;
  const mn = partie.minage;
  if (mn.contrat.type === 'tempo') await D.chargerTempo(joursEntre(mn.dernierCalcul, tJeu())).catch(() => {});
  await preparerMeteo();
  const evts = avancerMinage(true);
  sauver(partie);
  if (evts.length) ajouterAbsence(depuis, evts);
  if (app.ecran === 'jeu') rendre();
}

function virer() {
  const m = nombre(app.virement.montant);
  const versPlat = app.virement.sens === 'plateforme';
  const dispo = versPlat ? partie.banque.solde : partie.plateforme.soldeEUR;
  if (m <= 0) return toast('Indique un montant à virer.', 'erreur');
  if (m > dispo + 1e-9) return toast('Solde insuffisant : ' + eur(dispo) + ' disponibles.', 'erreur');
  const v = Math.round(m * 100) / 100;
  if (versPlat) { partie.banque.solde -= v; partie.plateforme.soldeEUR += v; }
  else { partie.plateforme.soldeEUR -= v; partie.banque.solde += v; }
  journal(partie, 'virement', `Virement de ${eur(v)} vers ${versPlat ? 'la plateforme' : 'ta banque'}`);
  app.virement.montant = '';
  sauver(partie);
  rendre();
  toast('Virement reçu : ' + eur(v), 'ok');
}

function exporter() {
  const blob = new Blob([JSON.stringify(partie, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'simulateur-crypto-sauvegarde.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function carriere() {
  const p = partie.profil;
  return app.carriere || (app.carriere = { situation: p.situation, metier: p.metier || 'Technicien de maintenance', experience: p.experience || 'debutant', annee: p.anneeApprentissage || 1 });
}

function texteNombre(n, dec) { return String(Math.floor(n * 10 ** dec) / 10 ** dec).replace('.', ','); }

// ---------- Actions ----------

const actions = {
  continuer: () => { app.onglet = 'accueil'; changerEcran('jeu'); },
  nouvelle: () => {
    if (partie) confirmer('Nouvelle partie ?', 'Une seule sauvegarde existe : ta partie actuelle sera définitivement effacée.', 'Effacer et recommencer', () => changerEcran('profil'), true);
    else changerEcran('profil');
  },
  'accueil-app': () => changerEcran('lancement'),
  situation: v => { app.brouillon.profil.situation = v; rendre(); },
  experience: v => { app.brouillon.profil.experience = v; rendre(); },
  'annee-app': v => { app.brouillon.profil.anneeApprentissage = Number(v); rendre(); },
  'carriere-sit': v => { carriere().situation = v; rendre(); },
  'carriere-exp': v => { carriere().experience = v; rendre(); },
  'carriere-annee': v => { carriere().annee = Number(v); rendre(); },
  'carriere-valider': () => {
    const c = carriere();
    const r = changerSituation(partie, c.situation, c.metier, c.experience, c.annee);
    if (r.erreur) return toast(r.erreur, 'erreur');
    app.carriere = null; sauver(partie); rendre(); toast('C\'est noté : changement dans un mois.', 'ok');
  },
  'annuler-carriere': () => { annulerChangement(partie); sauver(partie); rendre(); },
  logement: v => { app.brouillon.profil.logement = v; rendre(); },
  transport: v => { app.brouillon.profil.transport = v; rendre(); },
  'transport-vie': v => { if (!partie) return; partie.profil.transport = v; journal(partie, 'vie', 'Transport : ' + (TRANSPORTS.find(t => t[0] === v) || [, v])[1]); sauver(partie); rendre(); },
  'mode-vie': v => { app.brouillon.profil.modeVie = v; rendre(); },
  'vers-partie': () => {
    const p = app.brouillon.profil;
    if (!p.prenom.trim()) { toast('Indique au moins ton prénom.', 'erreur'); document.getElementById('f-prenom')?.focus(); return; }
    changerEcran('partie');
  },
  'vers-profil': () => changerEcran('profil'),
  capital: v => { app.brouillon.capital = Number(v); rendre(); },
  difficulte: v => { const b = app.brouillon; b.difficulte = v; b.capital = DIFFICULTES[v].capital; b.reglages = nettoyerReglages(v, { ...DIFFICULTES[v], ...b.reglages }); rendre(); },
  'vers-reglages': () => changerEcran('reglages'),
  'fin-reglages': () => changerEcran('partie'),
  'reg-reset': () => { app.brouillon.reglages = {}; rendre(); },
  depart: v => { app.brouillon.depart.type = v; rendre(); },
  reg: v => {
    const i = v.indexOf(':'), cle = v.slice(0, i), brut = v.slice(i + 1);
    const g = REGLAGES.find(x => x.cle === cle); if (!g) return;
    const val = g.type === 'bool' ? brut === 'true' : g.options.find(o => String(o[0]) === brut)?.[0];
    regler(cle, val); rendre();
  },
  lancer: () => {
    const b = app.brouillon;
    const profil = { ...b.profil, prenom: b.profil.prenom.trim(), nom: b.profil.nom.trim(), ville: b.profil.ville.trim() };
    if (!(profil.situation === 'alternant' || profil.situation === 'salarie')) delete profil.metier;
    effacer();
    if (b.depart.type === 'passe') {
      const err = verifierJour(b.depart.jour);
      if (err) return toast(err, 'erreur');
    }
    partie = nouvellePartie({ profil, difficulte: b.difficulte, capital: b.capital, reglages: b.reglages, depart: b.depart });
    sauver(partie);
    changerHorloge();
    app.onglet = 'accueil'; app.crypto = null; app.graph = null; app.absence = null;
    changerEcran('jeu');
  },
  onglet: v => { app.onglet = v; app.crypto = null; if ((v === 'minage' || v === 'installations') && partie) { const neuf = !partie.minage; minageDe(partie); if (neuf) preparerMeteo().then(() => app.onglet === 'minage' && rendre()); } rendre(); window.scrollTo(0, 0); },
  crypto: s => { if (!s) return; app.onglet = 'marche'; app.crypto = s; app.saisie = saisieVide(); rendre(); window.scrollTo(0, 0); },
  liste: () => { app.crypto = null; rendre(); },
  intervalle: v => { app.intervalle = v; rendre(); },
  sens: v => { app.sens = v; rendre(); },
  'type-ordre': v => {
    app.typeOrdre = v;
    // Pré-remplit les prix avec le cours actuel pour gagner du temps.
    const t = M.ticker(app.crypto);
    if (t && v !== 'marche') {
      const p = prix(t.c).replace(/\s/g, '');
      if (!app.saisie.prix) app.saisie.prix = p;
      if (!app.saisie.stop) app.saisie.stop = p;
      if (!app.saisie.limiteStop) app.saisie.limiteStop = p;
    }
    rendre();
  },
  part: v => {
    const pl = partie.plateforme, c = cryptoActive();
    if (app.typeOrdre === 'marche' && app.sens === 'achat') app.saisie.montant = texteNombre(pl.soldeEUR * v / 100, 2);
    else if (app.sens === 'vente') app.saisie.quantite = texteNombre((pl.actifs[c.base]?.qte || 0) * v / 100, 8);
    else {
      const s = app.saisie;
      const parUnite = reserveAchat({ qte: 1, prix: app.typeOrdre === 'stop' ? 0 : nombre(s.prix), limiteStop: app.typeOrdre === 'limite' ? 0 : nombre(s.limiteStop) });
      if (!parUnite) return toast('Indique d\'abord le prix.', 'erreur');
      app.saisie.quantite = texteNombre(pl.soldeEUR * v / 100 / parUnite, 8);
    }
    rendre();
  },
  ordre: () => passerOrdre(),
  'annuler-ordre': id => {
    if (annulerOrdre(partie, id)) { sauver(partie); rendre(); toast('Ordre annulé, fonds débloqués.', 'ok'); }
  },
  'fermer-absence': () => { app.absence = null; rendre(); },
  'rig-carte': v => { app.rig.carte = v; rendre(); },
  'rig-coin': v => { app.rig.coin = v; rendre(); },
  'acheter-rig': () => {
    const b = app.rig, r = calculerRig(b.carte, b.nb, b.coin), d = reglesDe(partie);
    confirmer('Commander ce rig ?', `${b.nb} × ${r.carte.nom}, ${r.alims} alimentation${r.alims > 1 ? 's' : ''}, châssis et kit : ${eur(r.prix)} prélevés sur ta banque.`, 'Commander', () => {
      const res = acheterRig(partie, b.carte, b.nb, b.coin, D.etat.eurUsd);
      if (res.erreur) return toast(res.erreur, 'erreur');
      sauver(partie); app.sousMinage = 'parc'; rendre(); toast('Rig commandé.', 'ok');
    });
  },
  'rig-crypto': v => { const [id, coin] = v.split(':'); avancerMinage(); const r = changerCrypto(partie, id, coin); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  convertir: tag => {
    const r = convertirEnBTC(partie, tag, prixEUR(tag), M.prixDeBase('BTC'));
    if (r.erreur) return toast(r.erreur, 'erreur');
    sauver(partie); rendre(); toast('Échangé contre ' + qte(r.btc) + ' BTC', 'ok');
  },
  'lieu-achat': v => { app.lieuAchat = v; rendre(); },
  envoi: id => { app.envoi = id || null; rendre(); },
  envoyer: v => {
    const [id, hid] = v.split(':'); const h = hebergeur(hid);
    confirmer('Envoyer chez ' + h.nom + ' ?', `Transport ${eur(ENVOI.eur)}${h.installUSD ? ' et installation ' + h.installUSD + ' $' : ''}, engagement ${h.engagementMois} mois. Électricité facturée par l'hébergeur chaque mois.`, 'Envoyer', () => {
      avancerMinage(); const r = envoyer(partie, id, hid, D.etat.eurUsd); if (r.erreur) return toast(r.erreur, 'erreur'); app.envoi = null; sauver(partie); rendre();
    });
  },
  rapatrier: id => { avancerMinage(); const r = rapatrier(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  compteur: v => confirmer('Passer à ' + v + ' kVA ?', `Prestation Enedis de ${eur(CHANGEMENT_PUISSANCE)}. Le nouvel abonnement s'applique tout de suite.`, 'Changer', () => {
    avancerMinage(); const r = changerCompteur(partie, Number(v)); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); toast('Compteur passé à ' + v + ' kVA.', 'ok');
  }),
  'vue-marche': v => { app.vueMarche = v; if (v === 'perp') F.demarrer(); rendre(); },
  'perp-contrat': v => { app.perp.s = v; rendre(); },
  'perp-sens': v => { app.perp.sens = v; rendre(); },
  'perp-tr-sens': v => { app.perp.trSens = v; rendre(); },
  'perp-transferer': () => {
    const r = transferer(partie, app.perp.trSens, nombre(app.perp.tr), D.etat.eurUsd);
    if (r.erreur) return toast(r.erreur, 'erreur');
    app.perp.tr = ''; sauver(partie); rendre(); toast('Conversion effectuée.', 'ok');
  },
  'perp-ouvrir': async () => {
    const p = app.perp, marge = nombre(p.marge);
    if (!(marge > 0)) return toast('Indique une marge en USDT.', 'erreur');
    app.enCours = true; rendre();
    let r;
    try {
      const [prixF, regles] = await Promise.all([F.meilleursPrix(p.s), F.regles(p.s)]);
      r = ouvrirPosition(partie, { s: p.s, sens: p.sens, levier: p.levier, marge }, prixF, regles);
    } catch (e) { r = { erreur: 'Impossible de joindre le marché des dérivés. Réessaie.' }; }
    app.enCours = false;
    if (r.erreur) { rendre(); return toast(r.erreur, 'erreur'); }
    p.marge = ''; sauver(partie); rendre(); toast('Position ouverte. Liquidation à ' + Math.round(r.position.liquidation).toLocaleString('fr-FR') + ' USDT.', 'ok');
  },
  'perp-fermer': async id => {
    const pos = partie.futures.positions.find(x => x.id === id); if (!pos) return;
    app.enCours = true; rendre();
    let r;
    try { const prixF = await F.meilleursPrix(pos.s); r = fermerPosition(partie, id, prixF.bid, prixF.ask); }
    catch (e) { r = { erreur: 'Impossible de joindre le marché des dérivés. Réessaie.' }; }
    app.enCours = false;
    if (r.erreur) { rendre(); return toast(r.erreur, 'erreur'); }
    sauver(partie); rendre(); toast('Position fermée : ' + (r.net >= 0 ? '+' : '') + r.net.toFixed(2).replace('.', ',') + ' USDT', r.net >= 0 ? 'ok' : '');
  },
  declarer: an => {
    const r = deposer(partie, Number(an), nombre(app.decl?.pv), nombre(app.decl?.recettes));
    if (r.erreur) return toast(r.erreur, 'erreur');
    app.decl = null; sauver(partie); rendre(); toast('Déclaration déposée.', 'ok');
  },
  'sous-minage': v => { app.sousMinage = v; rendre(); window.scrollTo(0, 0); },
  'acheter-machine': id => {
    const m = modele(id), d = reglesDe(partie);
    if (!D.etat.eurUsd) return toast('Taux euro-dollar indisponible pour le moment. Réessaie dans un instant.', 'erreur');
    const px = prixMachineEUR(m, D.etat.eurUsd);
    const lieu = app.lieuAchat || 'maison';
    const hl = lieu !== 'maison' ? HEBERGEURS.find(x => x.id === lieu) : null;
    if (hl) px.total += hl.installUSD / D.etat.eurUsd;
    const h = LIVRAISON[m.etat].jours * 24 / d.temps;
    confirmer('Acheter ' + m.nom + ' ?', `${eur(px.total)} prélevés sur ton compte bancaire (TVA, livraison${hl ? ' et installation chez ' + hl.nom : ''} comprises). Livraison dans ${h >= 24 ? String(Math.round(h / 24 * 10) / 10).replace('.', ',') + ' jours' : Math.round(h) + ' h'}.`, 'Acheter', () => {
      const r = acheterMachine(partie, id, D.etat.eurUsd, app.lieuAchat || 'maison');
      if (r.erreur) return toast(r.erreur, 'erreur');
      sauver(partie); app.sousMinage = 'parc'; rendre(); toast('Commande passée : ' + m.nom + '.', 'ok');
    });
  },
  demarrer: id => { avancerMinage(); const r = demarrerMachine(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  arreter: id => { avancerMinage(); const r = arreterMachine(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  mode: v => { const [id, mode] = v.split(':'); avancerMinage(); const r = changerMode(partie, id, mode); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  depoussierer: id => { avancerMinage(); depoussierer(partie, id); sauver(partie); rendre(); toast('Machine dépoussiérée : moins de risques de panne.', 'ok'); },
  reparer: id => {
    const m = partie.minage.machines.find(x => x.id === id); const dv = m && devisReparation(partie, m); if (!dv) return;
    confirmer('Faire réparer ?', `${dv.panne.nom} : ${eur(dv.cout)} prélevés sur ta banque${dv.garantie ? ' (sous garantie, frais d\'envoi seulement)' : ''}. La machine sera absente pendant la réparation.`, 'Réparer', () => {
      avancerMinage(); const r = reparer(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre();
    });
  },
  vendre: id => {
    const m = partie.minage.machines.find(x => x.id === id); if (!m) return;
    const v = valeurReventeEUR(m, D.etat.eurUsd);
    confirmer('Vendre ' + modele(m.modele).nom + ' ?', `Vente sur le marché de l'occasion pour environ ${eur(v)} (frais de vente déduits), versés sur ta banque.`, 'Vendre', () => {
      avancerMinage(); const r = vendre(partie, id, D.etat.eurUsd); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); toast('Machine vendue : ' + eur(r.montant), 'ok');
    });
  },
  ventilation: () => confirmer('Installer un extracteur ?', `${VENTILATION.nom} : ${eur(VENTILATION.prix)} prélevés sur ta banque. La pièce chauffera beaucoup moins.`, 'Installer', () => {
    avancerMinage(); const r = acheterVentilation(partie); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre();
  }),
  pool: v => { avancerMinage(); const mn = minageDe(partie); if (mn.pool === v) return; mn.pool = v; journal(partie, 'machine', 'Changement de pool'); sauver(partie); rendre(); },
  contrat: v => {
    avancerMinage(); const mn = minageDe(partie); if (mn.contrat.type === v) return;
    mn.contrat.type = v; journal(partie, 'facture', 'Contrat d\'électricité : option ' + (v === 'tempo' ? 'Tempo' : 'Base'));
    if (v === 'tempo') D.chargerTempo([jourTempo(tJeu()), jourTempo(tJeu() + 864e5)]).then(() => { if (app.onglet === 'minage') rendre(); });
    sauver(partie); rendre();
  },
  kyc: () => { demarrerKyc(partie); sauver(partie); rendre(); },
  'vir-sens': v => { app.virement.sens = v; rendre(); },
  virer: () => virer(),
  exporter: () => exporter(),
  abandonner: () => confirmer('Abandonner la partie ?', 'Ta partie sera définitivement effacée de ce téléphone.', 'Abandonner', () => {
    const etaitRejeu = enRejeu();
    effacer(); partie = null; if (etaitRejeu) changerHorloge(); changerEcran('lancement');
  }, true),
  annuler: () => { app.confirmation = null; rendreSuperpositions(); },
  confirmer: () => { const f = app.confirmation?.action; app.confirmation = null; rendreSuperpositions(); f && f(); }
};

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const f = actions[el.dataset.action];
  if (f) f(el.dataset.v ?? el.dataset.s);
});

document.addEventListener('input', ev => {
  const el = ev.target.closest('[data-input]');
  if (!el) return;
  const k = el.dataset.input;
  if (k.startsWith('profil.')) { app.brouillon.profil[k.slice(7)] = el.value; if (k === 'profil.metier') rendre(); }
  else if (k === 'depart-jour') app.brouillon.depart.jour = el.value;
  else if (k.startsWith('reg:')) {
    const g = REGLAGES.find(x => x.cle === k.slice(4)); if (!g) return;
    regler(g.cle, Number(el.value) / (g.echelle || 1));
    const t = racine.querySelector(`[data-reg-val="${g.cle}"]`);
    if (t) t.textContent = valeurTexte(g, g.cle in app.brouillon.reglages ? app.brouillon.reglages[g.cle] : DIFFICULTES[app.brouillon.difficulte][g.cle]);
  }
  else if (k === 'car-metier') { carriere().metier = el.value; rendre(); }
  else if (k === 'capital') {
    app.brouillon.capital = Number(el.value);
    const t = racine.querySelector('[data-capital]');
    if (t) t.textContent = eur(app.brouillon.capital);
    racine.querySelectorAll('[data-action="capital"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === app.brouillon.capital)));
  }
  else if (k in app.saisie) { app.saisie[k] = el.value; majLive(); }
  else if (k === 'virement') app.virement.montant = el.value;
  else if (k === 'decl-pv' || k === 'decl-recettes') { app.decl = app.decl || { pv: '', recettes: '' }; app.decl[k === 'decl-pv' ? 'pv' : 'recettes'] = el.value; }
  else if (k === 'perp-tr') app.perp.tr = el.value;
  else if (k === 'perp-marge') { app.perp.marge = el.value; majLive(); }
  else if (k === 'perp-levier') { app.perp.levier = Number(el.value); const t = racine.querySelector('[data-perp-levier]'); if (t) t.textContent = '×' + el.value; majLive(); }
  else if (k === 'rig-nb') { app.rig.nb = Number(el.value); const t = racine.querySelector('[data-rig-nb]'); if (t) t.textContent = el.value; }
});

document.addEventListener('change', ev => { const k = ev.target.dataset && ev.target.dataset.input; if (k && (['rig-nb', 'perp-levier'].includes(k) || k.startsWith('reg:'))) rendre(); });

// ---------- Démarrage ----------

let etaitDirect = false;
M.ecouter((type, symbole, donnees) => {
  if (type === 'tick') { planifierMaj(); if (symbole === app.crypto) { majBougie(symbole); planifierDessin(); } }
  else if (type === 'bougie') surBougie(symbole, donnees);
  else if (type === 'statut') {
    planifierMaj();
    const direct = M.etat.statut === 'direct' || M.etat.statut === 'rejeu';
    if (direct && !etaitDirect) lancerRattrapage(false); // reconnexion : on comble le trou
    etaitDirect = direct;
  }
  else if (type === 'liste' && app.ecran === 'jeu' && app.onglet === 'marche' && !app.crypto) rendre();
});

function marquerVu() { if (partie) { partie.vuLe = tJeu(); sauver(partie); } }
setInterval(marquerVu, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') marquerVu();
  else { const v = partie?.vuLe; lancerRattrapage(true).then(() => rattraperMinage(v)).then(() => rattraperDerives(v)).then(marquerVu); }
});

setInterval(() => {
  if (partie && verifierKyc(partie)) {
    sauver(partie);
    if (app.ecran === 'jeu') rendre();
    toast('Identité vérifiée : ton compte plateforme est ouvert.', 'ok');
  }
  if (app.ecran === 'jeu') majLive();
}, 1000);

if (partie) verifierKyc(partie) && sauver(partie);
rendre();
M.demarrer();
const vuAuDemarrage = partie?.vuLe;
lancerRattrapage(true).then(marquerVu);
D.demarrer().then(() => rattraperMinage(vuAuDemarrage));
D.chargerTempo([jourTempo(tJeu()), jourTempo(tJeu() + 864e5)]).catch(() => {});
setInterval(() => D.chargerTempo([jourTempo(tJeu()), jourTempo(tJeu() + 864e5)]).catch(() => {}), 36e5);
D.ecouter(() => { marcheMachines.facteur = enRejeu() ? D.etat.prixMachines : 1; if (app.ecran === 'jeu' && app.onglet === 'minage') rendre(); });

// Perpétuels : prix de marque en direct, financement et liquidations.
F.ecouter((type, s) => {
  if (type === 'marque' && s && partie && partie.futures) {
    const evts = surPrixMarque(partie, s, F.etat.marques[s]);
    if (evts.length) { sauver(partie); toast(evts[evts.length - 1], evts[0].startsWith('Liquidation') ? 'erreur' : ''); if (app.ecran === 'jeu') rendre(); }
  }
  planifierMaj();
});
async function rattraperDerives(depuis) {
  if (!partie || !partie.futures || !partie.futures.positions.length) return;
  F.demarrer();
  const evts = await rattraperFut(partie, F);
  sauver(partie);
  if (evts.length) { ajouterAbsence(depuis, evts); if (app.ecran === 'jeu') rendre(); }
}
rattraperDerives(vuAuDemarrage);
setInterval(() => preparerMeteo(), 36e5);

let dernierSauvetage = Date.now();
function avancerVieJeu(depuis) {
  if (!partie) return;
  const evts = avancerViePartie(partie);
  if (evts.length) {
    sauver(partie);
    if (depuis) ajouterAbsence(depuis, evts); else toast(evts[evts.length - 1], '');
    if (app.ecran === 'jeu') rendre();
  }
}
setTimeout(() => avancerVieJeu(vuAuDemarrage), 2500);
setInterval(() => avancerVieJeu(null), 30000);

function verifierImpots() {
  if (!partie) return;
  const evts = echeances(partie);
  if (evts.length) { sauver(partie); toast(evts[evts.length - 1], ''); if (app.ecran === 'jeu') rendre(); }
}
setTimeout(verifierImpots, 3000);
setInterval(verifierImpots, 60000);

setInterval(() => {
  const evts = avancerMinage();
  if (evts.length) { sauver(partie); toast(evts[evts.length - 1], 'ok'); if (app.ecran === 'jeu') rendre(); }
  else if (partie && Date.now() - dernierSauvetage > 60000) { sauver(partie); dernierSauvetage = Date.now(); }
}, 10000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
