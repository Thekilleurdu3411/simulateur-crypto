// Point d'entrée : état de l'interface, actions du joueur, mises à jour en direct.
import * as M from './market.js';
import { DIFFICULTES, INTERVALLES } from './config.js';
import { charger, sauver, effacer, nouvellePartie, demarrerKyc, verifierKyc, journal } from './state.js';
import { acheterAuMarche, vendreAuMarche } from './engine.js';
import { preparerOrdre, reserveAchat } from './orders.js';
import { appliquerAchat, appliquerVente, placerOrdre, annulerOrdre, ordresDe } from './portefeuille.js';
import { traiterPeriode, rattraper } from './suivi.js';
import { vueLancement, vueProfil, vueNouvellePartie, vueJeu, vueSuperpositions, valeurLive, nombre } from './views.js';
import { dessinerBougies } from './chart.js';
import * as D from './donnees.js';
import { minageDe, acheter as acheterMachine, demarrer as demarrerMachine, arreter as arreterMachine, avancerPartie, joursEntre } from './jeuminage.js';
import { modele, prixMachineEUR, LIVRAISON, jourTempo } from './minage.js';
import { eur, prix, qte, pct, duree } from './format.js';

const racine = document.getElementById('app');
const superpositions = document.getElementById('superpositions');

let partie = charger();
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
    profil: { prenom: '', nom: '', age: '', ville: '', situation: 'alternant', metier: 'Technicien de maintenance', logement: 'appart', modeVie: 'normal' },
    difficulte: 'expert',
    capital: DIFFICULTES.expert.capital
  },
  enCours: false,
  confirmation: null,
  toast: null,
  graph: null,
  graphErreur: false,
  absence: null,
  sousMinage: 'parc'
};

function ctx() {
  const cj = jourTempo(Date.now()), cd = jourTempo(Date.now() + 864e5);
  const cache = partie?.minage?.couleurs || {};
  return { app, partie, M, D, couleurAujourdhui: D.etat.couleurs[cj] || cache[cj], couleurDemain: D.etat.couleurs[cd] || cache[cd] };
}
function difficulte() { return DIFFICULTES[partie.difficulte]; }

// ---------- Affichage ----------

function rendre() {
  const c = ctx();
  const vues = { lancement: vueLancement, profil: vueProfil, partie: vueNouvellePartie, jeu: vueJeu };
  racine.innerHTML = vues[app.ecran](c);
  rendreSuperpositions();
  if (app.ecran === 'jeu' && app.onglet === 'marche' && app.crypto) preparerGraphique();
}

function rendreSuperpositions() { superpositions.innerHTML = vueSuperpositions(app); }

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
  if (Date.now() >= der.t + d && g.intervalle !== '1w') {
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
    journal(partie, 'achat', `Achat de ${qte(res.qteNette)} ${c.base} à ${prix(res.prixMoyen)} € (${eur(res.cout)}${res.frais ? ', frais ' + qte(res.frais) + ' ' + c.base : ''})`);
    toast(`Achat exécuté : ${qte(res.qteNette)} ${c.base} à ${prix(res.prixMoyen)} €${glisse}`, 'ok');
  } else {
    const pv = appliquerVente(partie, c.base, res.quantite, res.recuNet);
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
    prix: nombre(s.prix), stop: nombre(s.stop), limiteStop: nombre(s.limiteStop), maintenant: Date.now()
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
  else app.absence = { duree: duree(Date.now() - (depuis || Date.now())), evenements: [...evenements] };
}

// Minage : fait avancer gains, factures et livraisons jusqu'à maintenant.
function avancerMinage() {
  if (!partie || !partie.minage) return [];
  return avancerPartie(partie, Date.now(), { reseau: D.etat.reseau, couleurs: D.etat.couleurs, prixBTC: M.prixDeBase('BTC') });
}

async function rattraperMinage(depuis) {
  if (!partie || !partie.minage) return;
  const mn = partie.minage;
  if (mn.contrat.type === 'tempo') await D.chargerTempo(joursEntre(mn.dernierCalcul, Date.now())).catch(() => {});
  const evts = avancerMinage();
  if (evts.length) { sauver(partie); ajouterAbsence(depuis, evts); if (app.ecran === 'jeu') rendre(); }
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
  logement: v => { app.brouillon.profil.logement = v; rendre(); },
  'mode-vie': v => { app.brouillon.profil.modeVie = v; rendre(); },
  'vers-partie': () => {
    const p = app.brouillon.profil;
    if (!p.prenom.trim()) { toast('Indique au moins ton prénom.', 'erreur'); document.getElementById('f-prenom')?.focus(); return; }
    changerEcran('partie');
  },
  'vers-profil': () => changerEcran('profil'),
  capital: v => { app.brouillon.capital = Number(v); rendre(); },
  difficulte: v => { app.brouillon.difficulte = v; app.brouillon.capital = DIFFICULTES[v].capital; rendre(); },
  lancer: () => {
    const b = app.brouillon;
    const profil = { ...b.profil, prenom: b.profil.prenom.trim(), nom: b.profil.nom.trim(), ville: b.profil.ville.trim() };
    if (!(profil.situation === 'alternant' || profil.situation === 'salarie')) delete profil.metier;
    effacer();
    partie = nouvellePartie({ profil, difficulte: b.difficulte, capital: b.capital });
    sauver(partie);
    app.onglet = 'accueil'; app.crypto = null; app.graph = null; app.absence = null;
    changerEcran('jeu');
  },
  onglet: v => { app.onglet = v; app.crypto = null; if (v === 'minage' && partie) minageDe(partie); rendre(); window.scrollTo(0, 0); },
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
  'sous-minage': v => { app.sousMinage = v; rendre(); window.scrollTo(0, 0); },
  'acheter-machine': id => {
    const m = modele(id), d = DIFFICULTES[partie.difficulte];
    if (!D.etat.eurUsd) return toast('Taux euro-dollar indisponible pour le moment. Réessaie dans un instant.', 'erreur');
    const px = prixMachineEUR(m, D.etat.eurUsd);
    const h = LIVRAISON[m.etat].jours * 24 / d.temps;
    confirmer('Acheter ' + m.nom + ' ?', `${eur(px.total)} prélevés sur ton compte bancaire (TVA et livraison comprises). Livraison dans ${h >= 24 ? String(Math.round(h / 24 * 10) / 10).replace('.', ',') + ' jours' : Math.round(h) + ' h'}.`, 'Acheter', () => {
      const r = acheterMachine(partie, id, D.etat.eurUsd);
      if (r.erreur) return toast(r.erreur, 'erreur');
      sauver(partie); app.sousMinage = 'parc'; rendre(); toast('Commande passée : ' + m.nom + '.', 'ok');
    });
  },
  demarrer: id => { avancerMinage(); const r = demarrerMachine(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  arreter: id => { avancerMinage(); const r = arreterMachine(partie, id); if (r.erreur) return toast(r.erreur, 'erreur'); sauver(partie); rendre(); },
  pool: v => { avancerMinage(); const mn = minageDe(partie); if (mn.pool === v) return; mn.pool = v; journal(partie, 'machine', 'Changement de pool'); sauver(partie); rendre(); },
  contrat: v => {
    avancerMinage(); const mn = minageDe(partie); if (mn.contrat.type === v) return;
    mn.contrat.type = v; journal(partie, 'facture', 'Contrat d\'électricité : option ' + (v === 'tempo' ? 'Tempo' : 'Base'));
    if (v === 'tempo') D.chargerTempo([jourTempo(Date.now()), jourTempo(Date.now() + 864e5)]).then(() => { if (app.onglet === 'minage') rendre(); });
    sauver(partie); rendre();
  },
  kyc: () => { demarrerKyc(partie); sauver(partie); rendre(); },
  'vir-sens': v => { app.virement.sens = v; rendre(); },
  virer: () => virer(),
  exporter: () => exporter(),
  abandonner: () => confirmer('Abandonner la partie ?', 'Ta partie sera définitivement effacée de ce téléphone.', 'Abandonner', () => {
    effacer(); partie = null; changerEcran('lancement');
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
  if (k.startsWith('profil.')) app.brouillon.profil[k.slice(7)] = el.value;
  else if (k === 'capital') {
    app.brouillon.capital = Number(el.value);
    const t = racine.querySelector('[data-capital]');
    if (t) t.textContent = eur(app.brouillon.capital);
    racine.querySelectorAll('[data-action="capital"]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === app.brouillon.capital)));
  }
  else if (k in app.saisie) { app.saisie[k] = el.value; majLive(); }
  else if (k === 'virement') app.virement.montant = el.value;
});

// ---------- Démarrage ----------

let etaitDirect = false;
M.ecouter((type, symbole, donnees) => {
  if (type === 'tick') { planifierMaj(); if (symbole === app.crypto) { majBougie(symbole); planifierDessin(); } }
  else if (type === 'bougie') surBougie(symbole, donnees);
  else if (type === 'statut') {
    planifierMaj();
    const direct = M.etat.statut === 'direct';
    if (direct && !etaitDirect) lancerRattrapage(false); // reconnexion : on comble le trou
    etaitDirect = direct;
  }
  else if (type === 'liste' && app.ecran === 'jeu' && app.onglet === 'marche' && !app.crypto) rendre();
});

function marquerVu() { if (partie) { partie.vuLe = Date.now(); sauver(partie); } }
setInterval(marquerVu, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') marquerVu();
  else { const v = partie?.vuLe; lancerRattrapage(true).then(() => rattraperMinage(v)).then(marquerVu); }
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
D.chargerTempo([jourTempo(Date.now()), jourTempo(Date.now() + 864e5)]).catch(() => {});
setInterval(() => D.chargerTempo([jourTempo(Date.now()), jourTempo(Date.now() + 864e5)]).catch(() => {}), 36e5);
D.ecouter(() => { if (app.ecran === 'jeu' && app.onglet === 'minage') rendre(); });

let dernierSauvetage = Date.now();
setInterval(() => {
  const evts = avancerMinage();
  if (evts.length) { sauver(partie); toast(evts[evts.length - 1], 'ok'); if (app.ecran === 'jeu') rendre(); }
  else if (partie && Date.now() - dernierSauvetage > 60000) { sauver(partie); dernierSauvetage = Date.now(); }
}, 10000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
