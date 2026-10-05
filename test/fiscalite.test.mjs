import test from 'node:test';
import assert from 'node:assert/strict';
import { fiscDe, acquisition, cession, bilan, redressement, calendrier } from '../js/fiscalite.js';

test('exemple officiel du portefeuille global : 10 000 € investis, portefeuille à 50 000 €, vente de 5 000 €', () => {
  const f = fiscDe({});
  acquisition(f, 10000, Date.parse('2026-03-01'));
  const pv = cession(f, 5000, 50000, Date.parse('2026-06-01'));
  assert.equal(pv, 4000);
  assert.equal(f.pta, 9000); // 1 000 € de prix d'acquisition consommés
});

test('seuil de 305 € : rien à payer en dessous', () => {
  const f = fiscDe({});
  acquisition(f, 100, Date.parse('2026-01-10'));
  cession(f, 300, 600, Date.parse('2026-02-10'));
  const b = bilan(f, 2026, 'salarie');
  assert.equal(b.exonere, true);
  assert.equal(b.impotPV, 0);
});

test('flat tax de 31,4 % et compensation des moins-values de l\'année', () => {
  const f = fiscDe({});
  acquisition(f, 1000, Date.parse('2026-01-10'));
  cession(f, 1000, 2000, Date.parse('2026-02-10')); // +500
  cession(f, 100, 1000, Date.parse('2026-03-10'));  // 100 - 50 = +50
  const b = bilan(f, 2026, 'salarie');
  assert.ok(Math.abs(b.pvNette - 550) < 1e-9);
  assert.ok(Math.abs(b.impotPV - 550 * 0.314) < 1e-9);
});

test('minage : micro-BNC avec abattement de 34 %', () => {
  const f = fiscDe({});
  acquisition(f, 1000, Date.parse('2026-05-01'), 'minage');
  const b = bilan(f, 2026, 'salarie');
  assert.equal(b.recettesMinage, 1000);
  assert.ok(Math.abs(b.baseBNC - 660) < 1e-9);
  assert.ok(Math.abs(b.psMinage - 660 * 0.186) < 1e-9);
  assert.ok(Math.abs(b.irMinage - 660 * 0.11) < 1e-9);
});

test('déclaration absente : majoration de 10 %', () => {
  const r = redressement({ total: 1000, totalCessions: 5000 }, null, 'salarie', 3);
  assert.equal(r.du, 1100);
});

test('déclaration exacte : aucun redressement', () => {
  const f = fiscDe({});
  acquisition(f, 1000, Date.parse('2026-01-10'));
  cession(f, 1000, 2000, Date.parse('2026-02-10'));
  const b = bilan(f, 2026, 'salarie');
  const r = redressement(b, { pv: 500, recettes: 0 }, 'salarie', 3);
  assert.equal(r.motif, null);
  assert.ok(Math.abs(r.du - b.total) < 1e-9);
});

test('calendrier : déclaration au printemps, paiement en septembre', () => {
  const c = calendrier(2026);
  assert.equal(new Date(c.limite).getMonth(), 5);
  assert.equal(new Date(c.paiement).getMonth(), 8);
});

test('partie Expert : déclaration automatique en avril, paiement en septembre', async () => {
  const { noterAchat, noterCession, echeances } = await import('../js/jeufisc.js');
  const partie = { difficulte: 'expert', profil: { situation: 'salarie' }, banque: { solde: 1000 }, historique: [] };
  noterAchat(partie, 1000, Date.parse('2026-10-10'));
  noterCession(partie, 2000, Date.parse('2026-11-10')); // valeur globale = 0 + 2000 : tout le PTA consommé
  echeances(partie, Date.parse('2027-04-15'));
  assert.equal(partie.fisc.declarations[2026].statut, 'deposee');
  echeances(partie, Date.parse('2027-09-16'));
  assert.equal(partie.fisc.declarations[2026].statut, 'payee');
  assert.ok(Math.abs(partie.banque.solde - (1000 - 1000 * 0.314)) < 0.01);
});

test('partie Réalité : rien déclaré, majoration de 10 %', async () => {
  const { noterAchat, noterCession, echeances } = await import('../js/jeufisc.js');
  const partie = { difficulte: 'realite', profil: { situation: 'salarie' }, banque: { solde: 1000 }, historique: [] };
  noterAchat(partie, 1000, Date.parse('2026-10-10'));
  noterCession(partie, 2000, Date.parse('2026-11-10'));
  echeances(partie, Date.parse('2027-04-15'));
  assert.equal(partie.fisc.declarations[2026].statut, 'ouverte');
  echeances(partie, Date.parse('2027-06-10'));
  assert.equal(partie.fisc.declarations[2026].statut, 'retard');
  echeances(partie, Date.parse('2027-09-16'));
  assert.ok(Math.abs(partie.banque.solde - (1000 - 1000 * 0.314 * 1.1)) < 0.01);
});

test('partie Investisseur : flat tax prélevée dès la vente', async () => {
  const { noterAchat, noterCession } = await import('../js/jeufisc.js');
  const partie = { difficulte: 'investisseur', profil: { situation: 'salarie' }, banque: { solde: 1000 }, historique: [] };
  noterAchat(partie, 1000, Date.parse('2026-10-10'));
  noterCession(partie, 2000, Date.parse('2026-11-10'));
  assert.ok(Math.abs(partie.banque.solde - (1000 - 314)) < 0.01);
});
