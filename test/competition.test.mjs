import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONNALITES } from '../js/personnalites.js';
import { competitionDe, majIndice, avancerCompetition, classementLigue, accepterDefi, perfPerso, trimestreDe, finTrimestre, DIVISIONS, TROPHEES } from '../js/competition.js';

const JOUR = 864e5;
const T0 = Date.UTC(2027, 1, 10); // 10 février 2027 : 1er trimestre
let cours = { BTC: 100000, ETH: 4000 };
const prix = b => cours[b];
const liste = (moi = 50000) => [...PERSONNALITES.map(p => ({ id: p.id, fortune: p.fortune })), { id: 'moi', moi: true, fortune: moi }].sort((a, b) => b.fortune - a.fortune);
const partie = () => ({ creeLe: T0, profil: { prenom: 'Val' }, banque: { solde: 20000 }, plateforme: { soldeEUR: 5000, actifs: { BTC: { qte: 0.5, cout: 40000 } } }, historique: [], social: { abonnes: 100, reputation: 50, fil: [], messages: [], jour: 0, predictions: [], derniers: {}, publies: {} } });
const ctx = (extra = {}) => ({ prix, liste: liste(), patrimoine: 75000, machines: 0, ...extra });
const R0 = () => 0.99; // aucun événement aléatoire

test('trimestres', () => {
  assert.equal(trimestreDe(T0) % 4, 0);
  assert.equal(new Date(finTrimestre(trimestreDe(T0))).getUTCMonth(), 3);
});

test('indice : seul le trading compte, pas les virements', () => {
  cours = { BTC: 100000, ETH: 4000 };
  const p = partie(), c = competitionDe(p);
  majIndice(c, p.plateforme, prix);
  assert.equal(c.valeur, 55000);
  p.plateforme.soldeEUR += 10000; // virement depuis la banque
  majIndice(c, p.plateforme, prix);
  assert.ok(Math.abs(c.indice - 1) < 1e-9);
  cours = { BTC: 120000, ETH: 4000 }; // +20 % sur 50 000 de BTC dans 65 000
  majIndice(c, p.plateforme, prix);
  assert.ok(Math.abs(c.indice - 75000 / 65000) < 1e-9);
});

test('performance d\'une personnalité : marché plus talent qui se dessine', () => {
  const max = PERSONNALITES.find(p => p.id === 'max');
  assert.ok(Math.abs(perfPerso(max, 100, 110, 1, 5, 0) - 0.1) < 1e-12);
  assert.ok(Math.abs(perfPerso(max, 100, 110, 1, 5, 1) - 0.1) > 0); // le talent joue en fin de période
});

test('ligue : classement, puis fin de trimestre avec prime et montée', () => {
  cours = { BTC: 100000, ETH: 4000 };
  const p = partie();
  avancerCompetition(p, T0, ctx(), R0);
  const c = p.competition;
  assert.equal(classementLigue(p, liste(), T0).length, 21);
  // Le joueur fait +300 % : il finit premier
  cours = { BTC: 400000, ETH: 4000 };
  avancerCompetition(p, T0 + 30 * JOUR, ctx(), R0);
  const solde = p.banque.solde;
  const evts = avancerCompetition(p, finTrimestre(trimestreDe(T0)) + JOUR, ctx(), R0);
  assert.ok(evts.some(x => /Ligue Kryptal/.test(x)));
  assert.equal(c.palmares[0].rang, 1);
  assert.equal(c.division, 1);
  assert.equal(DIVISIONS[c.division], 'Argent');
  assert.ok(p.banque.solde > solde);
  assert.ok(c.trophees.champion);
  assert.equal(c.ligue.trimestre, trimestreDe(T0) + 1);
});

test('défi : pronostic sur le bitcoin, mise prélevée puis gagnée', () => {
  cours = { BTC: 100000, ETH: 4000 };
  const p = partie();
  avancerCompetition(p, T0, ctx(), R0);
  const c = p.competition;
  c.offre = { id: 'direction', type: 'direction', de: 'sofia', titre: 'x', duree: 7, t: T0, expire: T0 + 3 * JOUR };
  // Avenir simulé : +10 % ; Sofia se trompe (tirage au-delà de sa fiabilité)
  const r = accepterDefi(p, 250, 'hausse', { ...ctx(), enSimulation: true, prixFutur: () => 110000 }, T0, () => 0.9);
  assert.ok(r.ok);
  assert.notEqual(r.adversaire, 'hausse');
  assert.equal(p.banque.solde, 19750);
  cours = { BTC: 110000, ETH: 4000 };
  const evts = avancerCompetition(p, T0 + 8 * JOUR, ctx(), R0);
  assert.ok(evts.some(x => /Défi gagné/.test(x)));
  assert.equal(p.banque.solde, 20250);
  assert.equal(c.defisGagnes, 1);
});

test('défi : mise impossible sans argent', () => {
  const p = partie();
  avancerCompetition(p, T0, ctx(), R0);
  p.competition.offre = { id: 'duel14', type: 'duel', de: 'max', titre: 'x', duree: 14, t: T0, expire: T0 + 3 * JOUR };
  assert.ok(accepterDefi(p, 5000, null, ctx(), T0).ok);
  p.competition.offre = { id: 'duel14', type: 'duel', de: 'max', titre: 'x', duree: 14, t: T0, expire: T0 + 3 * JOUR };
  p.competition.defi = null;
  p.banque.solde = 10;
  assert.ok(accepterDefi(p, 50, null, ctx(), T0).erreur);
});

test('dépassement au classement : la personnalité réagit une seule fois', () => {
  const p = partie();
  avancerCompetition(p, T0, ctx({ liste: liste(1000) }), R0);
  const avant = p.social.fil.length;
  avancerCompetition(p, T0 + JOUR, ctx({ liste: liste(5000) }), R0); // dépasse Zoé (3 200 €)
  assert.equal(p.social.fil.length, avant + 1);
  assert.equal(p.social.fil[0].auteur, 'zoe');
  avancerCompetition(p, T0 + 2 * JOUR, ctx({ liste: liste(1000) }), R0);
  avancerCompetition(p, T0 + 3 * JOUR, ctx({ liste: liste(5000) }), R0);
  assert.equal(p.social.fil.length, avant + 1);
});

test('trophées bien formés', () => {
  const ids = new Set(TROPHEES.map(x => x[0]));
  assert.equal(ids.size, TROPHEES.length);
});
