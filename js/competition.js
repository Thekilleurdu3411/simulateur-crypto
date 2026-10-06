// Compétition contre les personnalités (V0.19) : ligue trimestrielle, rival, défis avec mise, trophées.
// Calculs purs autant que possible (testés) ; les fortunes viennent du classement de jeusocial.js.
import { PERSONNALITES, perso, rng } from './personnalites.js';
import { socialDe, pseudoJoueur } from './jeusocial.js';
import { journal } from './state.js';

const JOUR = 864e5;
const jourDe = t => Math.floor(t / JOUR);
const borne = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1).replace('.', ',') + ' %';
const graine = partie => ((partie.creeLe || 0) / 1000) | 0;

// ---------- Ligue ----------
export const DIVISIONS = ['Bronze', 'Argent', 'Or', 'Platine', 'Diamant'];
export const PRIMES = [300, 1000, 3000, 10000, 30000]; // prime du 1er ; le 2e touche la moitié, le 3e le quart
export const MONTEE = 3;    // les 3 premiers montent
export const DESCENTE = 17; // à partir du 17e (sur 21), on descend
export const MIN_LIGUE = 100; // portefeuille minimal pour être classé (€)

// Écart-type du « talent » de chaque style sur un trimestre : les flambeurs font de grands écarts.
const STYLE = { hype: 0.3, degen: 0.22, arnaqueur: 0.2, trader: 0.14, rivale: 0.16, artiste: 0.12, mineur: 0.08, calme: 0.04, prudente: 0.07, sceptique: 0.05, boomer: 0.04, institutionnelle: 0.06, patronne: 0.06, opaque: 0.08, cypherpunk: 0.05 };
const TRIMESTRE = 91 * JOUR;

export function trimestreDe(t) { const d = new Date(t); return d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3); }
export const nomTrimestre = q => `${q % 4 + 1}${q % 4 ? 'e' : 'er'} trimestre ${Math.floor(q / 4)}`;
export const finTrimestre = q => Date.UTC(Math.floor(q / 4), (q % 4) * 3 + 3, 1);

function gauss(R) { let u = 0; while (!u) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); }

/**
 * Performance d'une personnalité sur une période : variation de sa fortune (le marché selon son exposition)
 * plus son talent propre sur la période, qui se dessine au fur et à mesure (frac de 0 à 1).
 */
export function perfPerso(p, f0, f, seed, cle, frac, duree = TRIMESTRE) {
  const sigma = (STYLE[p.humeur] ?? 0.08) * Math.sqrt(duree / TRIMESTRE);
  const z = gauss(rng(seed, cle, p.id.charCodeAt(0) * 7 + p.id.length));
  return (f0 > 0 ? f / f0 - 1 : 0) + z * sigma * frac;
}

// ---------- Indice de performance du joueur ----------
/** Valeur du portefeuille au comptant (plateforme, ordres en attente compris). null si un prix manque. */
export function composition(pl) {
  const qte = {}; let solde = pl.soldeEUR || 0;
  for (const [b, a] of Object.entries(pl.actifs || {})) if (a.qte > 0) qte[b] = (qte[b] || 0) + a.qte;
  for (const o of pl.ordres || []) {
    if (!o.reserve) continue;
    if (o.reserve.eur != null) solde += o.reserve.eur; else if (o.reserve.qte) qte[o.base] = (qte[o.base] || 0) + o.reserve.qte;
  }
  return { solde, qte };
}
export function valeurDe(comp, prix) {
  let v = comp.solde;
  for (const [b, q] of Object.entries(comp.qte)) { const p = prix(b); if (!p) return null; v += q * p; }
  return v;
}
/**
 * Indice pondéré dans le temps : on valorise le portefeuille de la photo précédente aux prix d'aujourd'hui.
 * Les virements entre banque et plateforme et les revenus du minage ne comptent donc pas : seul le trading compte.
 */
export function majIndice(c, pl, prix) {
  if (c.photo && c.photo.valeur > 1) {
    const v = valeurDe(c.photo, prix);
    if (v == null) return;
    const r = v / c.photo.valeur;
    if (isFinite(r) && r > 0) c.indice *= r;
  }
  const comp = composition(pl);
  const valeur = valeurDe(comp, prix);
  if (valeur == null) return;
  c.photo = { ...comp, valeur };
  c.valeur = valeur;
}

// ---------- Défis ----------
export const MISES = [50, 250, 1000, 5000];
export const DEFIS = [
  { id: 'duel14', type: 'duel', duree: 14, de: ['bastien', 'max', 'tom', 'zoe'], titre: 'Duel de trading sur 14 jours',
    texte: 'Duel ? Meilleure performance sur 14 jours, le perdant paie la mise. Les virements ne comptent pas, que le trading.' },
  { id: 'duel30', type: 'duel', duree: 30, de: ['sofia', 'hugo', 'clara', 'elena', 'ghost', 'yasmine'], titre: 'Duel de trading sur un mois',
    texte: 'Un mois, deux portefeuilles, une mise. On compare les performances à la fin.' },
  { id: 'objectif', type: 'objectif', duree: 30, cote: 4, de: ['paul', 'elena'], titre: 'Pari : +10 % en un mois',
    texte: 'Je parie que tu ne feras pas +10 % sur ton portefeuille ce mois-ci. Si tu y arrives, je te paie 4 fois ta mise.' },
  { id: 'abonnes', type: 'abonnes', duree: 30, cote: 2, de: ['lina', 'bastien', 'aiko'], titre: 'Pari : +20 % d\'abonnés en un mois',
    texte: 'Pari entre créateurs : tu gagnes 20 % d\'abonnés en un mois ? Si oui, je double ta mise.' },
  { id: 'direction', type: 'direction', duree: 7, de: ['sofia', 'bastien', 'max', 'renard'], titre: 'Le bitcoin dans 7 jours',
    texte: 'Chacun donne son pronostic sur le bitcoin dans 7 jours. Si un seul a raison, il prend la mise de l\'autre.' }
];
export const CHOIX_DIRECTION = [['hausse', 'Plus de 3 % de hausse'], ['stable', 'Entre −3 % et +3 %'], ['baisse', 'Plus de 3 % de baisse']];
const categorie = r => (r > 0.03 ? 'hausse' : r < -0.03 ? 'baisse' : 'stable');

// ---------- Trophées ----------
export const TROPHEES = [
  ['premier', 'Premier pas', 'Acheter ta première crypto', c => c.cryptos > 0],
  ['btc1', 'Un bitcoin entier', 'Posséder 1 BTC', c => c.btc >= 1],
  ['k100', 'Premiers 100 000 €', 'Patrimoine de 100 000 €', c => c.patrimoine >= 1e5],
  ['m1', 'Millionnaire', 'Patrimoine de 1 million d\'euros', c => c.patrimoine >= 1e6],
  ['m10', 'Multimillionnaire', 'Patrimoine de 10 millions d\'euros', c => c.patrimoine >= 1e7],
  ['m100', 'Baleine', 'Patrimoine de 100 millions d\'euros', c => c.patrimoine >= 1e8],
  ['top10', 'Top 10', 'Entrer dans le top 10 des fortunes', c => c.rang <= 10],
  ['top1', 'Numéro un', 'Première fortune de la crypto', c => c.rang === 1],
  ['or', 'Division Or', 'Atteindre la division Or de la ligue', c => c.division >= 2],
  ['diamant', 'Division Diamant', 'Atteindre la division Diamant', c => c.division >= 4],
  ['champion', 'Champion', 'Finir 1er d\'une ligue trimestrielle', c => c.titres > 0],
  ['rival', 'Ennemi juré', 'Battre ton rival trois trimestres', c => c.rivalV >= 3],
  ['defis5', 'Joueur', 'Gagner 5 défis', c => c.defisGagnes >= 5],
  ['prophete', 'Prophète', '10 pronostics justes', c => c.justes >= 10],
  ['influence', 'Influenceur', '10 000 abonnés', c => c.abonnes >= 1e4],
  ['star', 'Star des réseaux', '100 000 abonnés', c => c.abonnes >= 1e5],
  ['mineur', 'Petite ferme', '10 machines de minage', c => c.machines >= 10],
  ['proprio', 'Propriétaire', 'Acheter ton logement', c => c.proprietaire],
  ['integre', 'Intègre', 'Réputation de 90 sur 100', c => c.reputation >= 90]
];

// ---------- État ----------
export function competitionDe(partie) {
  return partie.competition || (partie.competition = { indice: 1, photo: null, valeur: 0, division: 0, ligue: null, rival: 'zoe', rivalV: 0, rivalD: 0, defi: null, offre: null, defisGagnes: 0, defisPerdus: 0, titres: 0, trophees: {}, depasses: {}, palmares: [], jour: null });
}

/** Classement de la ligue en cours. liste : classement des fortunes (jeusocial). */
export function classementLigue(partie, liste, t) {
  const c = competitionDe(partie), L = c.ligue;
  if (!L) return [];
  const fin = finTrimestre(L.trimestre), frac = borne((t - L.debut) / Math.max(1, fin - L.debut), 0, 1);
  const seed = graine(partie);
  const fortunes = Object.fromEntries(liste.map(x => [x.id, x.fortune]));
  const rangs = PERSONNALITES.map(p => ({ id: p.id, nom: p.nom, pseudo: p.pseudo, couleur: p.couleur, role: p.role,
    perf: perfPerso(p, L.fortunes0[p.id], fortunes[p.id] ?? L.fortunes0[p.id], seed, L.trimestre, frac) }));
  const inscrit = (c.valeur || 0) >= MIN_LIGUE;
  rangs.push({ id: 'moi', moi: true, inscrit, nom: [partie.profil.prenom, partie.profil.nom].filter(Boolean).join(' ') || 'Toi', pseudo: pseudoJoueur(partie), couleur: '#F3B33D', role: 'Toi', perf: inscrit ? c.indice / L.indice0 - 1 : null });
  return rangs.sort((a, b) => (b.perf ?? -Infinity) - (a.perf ?? -Infinity));
}

function nouvelleLigue(c, t, liste) {
  c.ligue = { trimestre: trimestreDe(t), debut: t, indice0: c.indice, fortunes0: Object.fromEntries(liste.filter(x => !x.moi).map(x => [x.id, x.fortune])) };
}

function publierFil(partie, de, texte, t) {
  const s = socialDe(partie);
  s.fil.unshift({ auteur: de, texte, t, likes: Math.round(20 + Math.random() * 400) });
  if (s.fil.length > 80) s.fil.length = 80;
}

/** Fin de trimestre : primes, montée ou descente, duel avec le rival. Renvoie les textes d'événements. */
function finirLigue(partie, c, t, liste) {
  const evts = [];
  const L = c.ligue, cl = classementLigue(partie, liste, finTrimestre(L.trimestre));
  const i = cl.findIndex(x => x.moi), moi = cl[i], s = socialDe(partie);
  const nom = nomTrimestre(L.trimestre), div = DIVISIONS[c.division];
  if (!moi.inscrit) {
    evts.push(`Ligue Kryptal (${nom}) : tu n'étais pas classé (il faut au moins ${MIN_LIGUE} € sur la plateforme).`);
    c.palmares.unshift({ trimestre: L.trimestre, division: c.division, rang: null, perf: null });
  } else {
    const rang = i + 1;
    const prime = rang <= 3 ? Math.round(PRIMES[c.division] / 2 ** (rang - 1)) : 0;
    if (prime) partie.banque.solde += prime;
    if (rang === 1) c.titres++;
    const avant = c.division;
    if (rang <= MONTEE && c.division < DIVISIONS.length - 1) c.division++;
    else if (rang >= DESCENTE && c.division > 0) c.division--;
    const gainAbonnes = Math.round(s.abonnes * (rang <= 3 ? 0.08 : rang <= 10 ? 0.02 : 0) + (rang <= 3 ? 50 * (avant + 1) : 0));
    s.abonnes += gainAbonnes;
    s.reputation = borne(s.reputation + (rang <= 3 ? 3 : rang >= DESCENTE ? -2 : 0));
    c.palmares.unshift({ trimestre: L.trimestre, division: avant, rang, perf: moi.perf });
    const mouvement = c.division > avant ? ` Montée en division ${DIVISIONS[c.division]} !` : c.division < avant ? ` Descente en division ${DIVISIONS[c.division]}.` : '';
    const texte = `Ligue Kryptal ${div} (${nom}) : tu finis ${rang}${rang === 1 ? 'er' : 'e'} sur ${cl.length} avec ${pct(moi.perf)}.${prime ? ` Prime : ${prime.toLocaleString('fr-FR')} €.` : ''}${mouvement}`;
    journal(partie, 'vie', texte);
    evts.push(texte);
    if (rang === 1) publierFil(partie, 'yasmine', `Bravo à @${pseudoJoueur(partie)}, champion de la ligue Kryptal ${div} ce trimestre avec ${pct(moi.perf)} 🏆`, t);
    // Rival
    const r = cl.find(x => x.id === c.rival);
    if (r) {
      const gagne = moi.perf > r.perf;
      if (gagne) c.rivalV++; else c.rivalD++;
      const p = perso(c.rival);
      evts.push(`Duel avec ton rival ${p.nom} : ${gagne ? 'tu gagnes' : 'tu perds'} (${pct(moi.perf)} contre ${pct(r.perf)}).`);
      publierFil(partie, c.rival, gagne ? `Ce trimestre, @${pseudoJoueur(partie)} m'a battu. Je prends note. Revanche au prochain.` : `Encore un trimestre devant @${pseudoJoueur(partie)}. Tranquille 😌`, t);
    }
  }
  if (c.palmares.length > 40) c.palmares.length = 40;
  return evts;
}

// Messages des personnalités que tu dépasses au classement des fortunes
const DEPASSE = {
  hype: '@{moi} m\'a doublé ?! Je prépare mon comeback 🚀', boomer: 'Un jeune, @{moi}, me passe devant avec ses bitcoins. Le monde change.',
  calme: '@{moi} me dépasse au classement. Le marché est long, on en reparle dans un an.', rivale: 'Ok @{moi}, tu m\'as dépassée. La revanche commence maintenant 😤',
  arnaqueur: '@{moi} me dépasse ? Il a sûrement suivi mes signaux 😉', opaque: '…', mineur: 'Respect @{moi}, tu me passes devant. Tu mines ou tu trades ?',
  patronne: 'Félicitations @{moi}. Si tu veux un jour lancer ta propre entreprise, on en parle.', defaut: 'Bien joué @{moi}, tu viens de me passer devant au classement.'
};
const PIQUES = {
  devant: ['Toujours devant toi ce trimestre, @{moi}. Courage 😏', '@{moi} regarde le classement de la ligue… et pleure 😂', 'Pendant que @{moi} hésite, moi j\'encaisse.'],
  derriere: ['@{moi} a de la chance en ce moment. Ça ne va pas durer.', 'Je laisse @{moi} mener… pour l\'instant.', 'Le trimestre n\'est pas fini, @{moi}. Je reviens.']
};

/**
 * Avance la compétition. ctx : { prix(base) → €, liste (classement des fortunes), patrimoine, prixFutur(t), enSimulation, machines }.
 * R : hasard (testable). Renvoie les textes d'événements.
 */
export function avancerCompetition(partie, t, ctx, R = Math.random) {
  const c = competitionDe(partie), s = socialDe(partie), evts = [];
  majIndice(c, partie.plateforme, ctx.prix);
  const liste = ctx.liste;
  if (!c.ligue) nouvelleLigue(c, t, liste);
  else if (trimestreDe(t) !== c.ligue.trimestre) { evts.push(...finirLigue(partie, c, t, liste)); nouvelleLigue(c, t, liste); }

  // Défi en cours
  const d = c.defi;
  if (d) {
    const ratio = c.indice / d.indice0;
    if (t < d.fin) d.min = Math.min(d.min ?? 1, ratio);
    else { const x = finirDefi(partie, c, s, d, ctx, liste); if (x) evts.push(x); }
  }
  if (c.offre && t > c.offre.expire) c.offre = null;

  // Une fois par jour : offres de défi, piques du rival, dépassements
  const j = jourDe(t);
  const jours = c.jour == null ? 1 : Math.min(30, j - c.jour);
  if (jours > 0) {
    c.jour = j;
    if (!c.defi && !c.offre && R() < 1 - 0.92 ** jours) {
      const o = nouvelleOffre(c, s, t, R);
      if (o) { c.offre = o; evts.push(`${perso(o.de).nom} te lance un défi : ${o.titre}.`); }
    }
    // Pique du rival, environ une fois par semaine
    if (c.ligue && R() < 1 - (6 / 7) ** jours) {
      const cl = classementLigue(partie, liste, t), moi = cl.find(x => x.moi), r = cl.find(x => x.id === c.rival);
      if (moi && r && moi.inscrit) {
        const l = r.perf >= moi.perf ? PIQUES.devant : PIQUES.derriere;
        publierFil(partie, c.rival, l[Math.floor(R() * l.length)].replace('{moi}', pseudoJoueur(partie)), t);
      }
    }
    // Dépassements au classement des fortunes (une seule fois par personnalité)
    const derriere = liste.slice(liste.findIndex(x => x.moi) + 1).map(x => x.id);
    if (c.derriere) {
      // Nouveaux dépassés : chacun ne réagit qu'une fois dans la partie
      for (const id of derriere.filter(x => !c.derriere.includes(x) && !c.depasses[x])) {
        c.depasses[id] = t;
        const p = perso(id);
        publierFil(partie, id, (DEPASSE[p.humeur] || DEPASSE.defaut).replace('{moi}', pseudoJoueur(partie)), t);
        evts.push(`Tu dépasses ${p.nom} au classement des fortunes.`);
      }
    }
    c.derriere = derriere;
  }

  // Trophées
  const rang = liste.findIndex(x => x.moi) + 1;
  const etat = {
    cryptos: Object.keys(partie.plateforme.actifs || {}).length, btc: partie.plateforme.actifs?.BTC?.qte || 0, patrimoine: ctx.patrimoine || 0,
    rang, division: c.division, titres: c.titres, rivalV: c.rivalV, defisGagnes: c.defisGagnes,
    justes: s.justes || 0, abonnes: s.abonnes, machines: ctx.machines || 0, proprietaire: !!partie.profil.proprietaire, reputation: s.reputation
  };
  for (const [id, nom, , test] of TROPHEES) {
    if (c.trophees[id] || !test(etat)) continue;
    c.trophees[id] = t;
    s.reputation = borne(s.reputation + 1);
    journal(partie, 'vie', `Trophée débloqué : ${nom}.`);
    evts.push(`🏆 Trophée débloqué : ${nom}`);
  }
  return evts;
}

function nouvelleOffre(c, s, t, R) {
  const possibles = DEFIS.filter(x => (x.type !== 'duel' && x.type !== 'objectif') || (c.valeur || 0) >= MIN_LIGUE)
    .filter(x => x.type !== 'abonnes' || s.abonnes >= 50);
  if (!possibles.length) return null;
  const d = possibles[Math.floor(R() * possibles.length)];
  return { id: d.id, type: d.type, de: d.de[Math.floor(R() * d.de.length)], titre: d.titre, texte: d.texte, duree: d.duree, cote: d.cote, t, expire: t + 3 * JOUR };
}

/** Accepter le défi proposé avec une mise (et un choix pour le pronostic). ctx : { prix, liste, prixFutur, enSimulation }. */
export function accepterDefi(partie, mise, choix, ctx, t, R = Math.random) {
  const c = competitionDe(partie), o = c.offre;
  if (!o) return { erreur: 'Plus de défi en attente.' };
  if (!MISES.includes(mise)) return { erreur: 'Mise invalide.' };
  if (partie.banque.solde < mise) return { erreur: 'Pas assez sur ton compte bancaire pour cette mise.' };
  if (o.type === 'direction' && !CHOIX_DIRECTION.some(x => x[0] === choix)) return { erreur: 'Choisis ton pronostic.' };
  const d = { ...o, mise, debut: t, fin: t + o.duree * JOUR, indice0: c.indice, min: 1, abonnes0: socialDe(partie).abonnes };
  if (o.type === 'duel') d.f0 = (ctx.liste.find(x => x.id === o.de) || {}).fortune;
  if (o.type === 'direction') {
    d.btc0 = ctx.prix('BTC');
    if (!d.btc0) return { erreur: 'Prix du bitcoin indisponible.' };
    d.choix = choix;
    // Le pronostic de l'adversaire : juste selon sa fiabilité quand l'avenir est simulé, au hasard sinon
    const futur = ctx.enSimulation && ctx.prixFutur ? ctx.prixFutur(d.fin) : null;
    const vrai = futur ? categorie(futur / d.btc0 - 1) : null;
    const autres = CHOIX_DIRECTION.map(x => x[0]);
    d.choixAdversaire = vrai && R() < perso(o.de).fiabilite ? vrai : autres.filter(x => x !== vrai)[Math.floor(R() * (vrai ? 2 : 3))];
  }
  partie.banque.solde -= mise;
  c.defi = d; c.offre = null;
  journal(partie, 'vie', `Défi accepté avec ${perso(o.de).nom} : ${o.titre} (mise ${mise.toLocaleString('fr-FR')} €).`);
  return { ok: true, adversaire: d.choixAdversaire };
}
export function refuserDefi(partie) { const c = competitionDe(partie); c.offre = null; }
export function changerRival(partie, id) {
  if (!perso(id)) return { erreur: 'Personnalité inconnue.' };
  competitionDe(partie).rival = id;
  return { ok: true };
}

/** Résultat d'un défi arrivé à échéance. Renvoie le texte. */
function finirDefi(partie, c, s, d, ctx, liste) {
  const p = perso(d.de), ratio = c.indice / d.indice0;
  let issue, detail = '';
  if (d.type === 'duel') {
    const f = (liste.find(x => x.id === d.de) || {}).fortune;
    const lui = perfPerso(p, d.f0, f ?? d.f0, graine(partie), Math.floor(d.debut / JOUR), 1, d.duree * JOUR);
    issue = ratio - 1 > lui ? 'gagne' : 'perdu';
    detail = ` (toi ${pct(ratio - 1)}, ${p.nom.split(' ')[0]} ${pct(lui)})`;
  } else if (d.type === 'objectif') {
    issue = ratio >= 1.1 ? 'gagne' : 'perdu'; detail = ` (${pct(ratio - 1)})`;
  } else if (d.type === 'abonnes') {
    issue = s.abonnes >= d.abonnes0 * 1.2 ? 'gagne' : 'perdu'; detail = ` (${pct(s.abonnes / Math.max(1, d.abonnes0) - 1)} d'abonnés)`;
  } else {
    const btc = ctx.prix('BTC');
    if (!btc) return ''; // on attend un prix
    const vrai = categorie(btc / d.btc0 - 1);
    const moi = d.choix === vrai, lui = d.choixAdversaire === vrai;
    issue = moi === lui ? 'nul' : moi ? 'gagne' : 'perdu';
    detail = ` (bitcoin ${pct(btc / d.btc0 - 1)})`;
  }
  const gain = issue === 'gagne' ? d.mise * (d.cote || 2) : issue === 'nul' ? d.mise : 0;
  partie.banque.solde += gain;
  if (issue === 'gagne') { c.defisGagnes++; s.reputation = borne(s.reputation + 2); s.abonnes += Math.round(10 + s.abonnes * 0.02); }
  else if (issue === 'perdu') c.defisPerdus++;
  c.defi = null;
  const texte = issue === 'gagne' ? `Défi gagné contre ${p.nom}${detail} : +${gain.toLocaleString('fr-FR')} €.`
    : issue === 'nul' ? `Défi nul avec ${p.nom}${detail} : mise rendue.` : `Défi perdu contre ${p.nom}${detail} : ta mise de ${d.mise.toLocaleString('fr-FR')} € est perdue.`;
  journal(partie, 'vie', texte);
  return texte;
}
