import test from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleEntreprise, construireSite, acheterMachines, avancerEntreprise, impotSocietes, prixLot, distribuer, apporter, rembourser,
  candidats, embaucher, allouer, valeurEntreprise, changerTechniciens, disponibilite, cloturer, resultat, CREATION } from '../js/entreprise.js';
import { modele } from '../js/minage.js';

const JOUR = 864e5;
const T0 = Date.UTC(2027, 0, 5);
const ctx = { prixBTC: 100000, eurUsd: 1.15, reseau: { difficulte: 1.5e14, recompense: 3.15 } };

test('impôt sur les sociétés : 15 % puis 25 %', () => {
  assert.equal(impotSocietes(-5), 0);
  assert.equal(impotSocietes(40000), 6000);
  assert.equal(impotSocietes(100000), 42500 * 0.15 + 57500 * 0.25);
});

test('remise sur les gros lots', () => {
  const m = modele('s21xp');
  assert.ok(prixLot(m, 100, 1.15).total / 100 < prixLot(m, 10, 1.15).total / 10);
});

test('ferme en Norvège : chantier, livraison, production, capacité', () => {
  const e = nouvelleEntreprise('Test Mining', 3e6, T0);
  assert.equal(e.tresorerie, 3e6 - CREATION.frais);
  assert.ok(construireSite(e, 'norvege', T0).erreur); // pas encore immatriculée
  const t1 = T0 + 8 * JOUR;
  const s = construireSite(e, 'norvege', t1).site;
  assert.ok(acheterMachines(e, s.id, 's21xp', 600, 1.15, t1).erreur); // 2 MW maximum
  const r = acheterMachines(e, s.id, 's21xp', 500, 1.15, t1);
  assert.ok(r.lot);
  changerTechniciens(e, 2);
  e.jour = Math.floor(t1 / JOUR);
  avancerEntreprise(e, t1 + 100 * JOUR, ctx);
  assert.equal(e.exercice.ca, 0); // site prêt au bout de 90 jours, livraison 21 jours après
  avancerEntreprise(e, t1 + 200 * JOUR, ctx);
  const caJour = e.exercice.ca / (200 - 111);
  assert.ok(caJour > 4000 && caJour < 8000, `CA ${caJour}`);
  assert.ok(e.exercice.elec > 0 && e.exercice.loyers > 0 && e.exercice.amort > 0);
  assert.ok(disponibilite(e) > 0.9);
  assert.ok(valeurEntreprise(e, 100000, 1.15, t1 + 200 * JOUR) > 0);
});

test('clôture : déficit reporté puis impôt, dividendes avec flat tax', () => {
  const p = { banque: { solde: 0 }, entreprise: nouvelleEntreprise('X', 100000, T0) };
  const e = p.entreprise;
  e.exercice.trading = -50000; e.exercice.fixes = 0;
  cloturer(e, Date.UTC(2028, 0, 1));
  assert.equal(e.exercices[0].is, 0);
  assert.equal(e.deficit, 50000);
  e.exercice.trading = 150000;
  cloturer(e, Date.UTC(2029, 0, 1));
  assert.equal(e.exercices[0].is, Math.round(impotSocietes(100000)));
  assert.ok(distribuer(p, 1e9).erreur);
  const d = distribuer(p, 10000);
  assert.ok(Math.abs(p.banque.solde - 10000 * (1 - 0.314)) < 1e-6 && d.impot > 0);
});

test('compte courant d\'associé : apport et remboursement sans impôt', () => {
  const p = { banque: { solde: 5000 }, entreprise: nouvelleEntreprise('X', 1000, T0) };
  assert.ok(apporter(p, 4000).ok);
  assert.equal(p.banque.solde, 1000);
  assert.ok(rembourser(p, 5000).erreur);
  assert.ok(rembourser(p, 4000).ok);
  assert.equal(p.banque.solde, 5000);
});

test('découvert prolongé : liquidation judiciaire', () => {
  const e = nouvelleEntreprise('X', 1000, T0);
  changerTechniciens(e, 3);
  e.tresorerie = -1000;
  const evts = avancerEntreprise(e, T0 + 80 * JOUR, ctx);
  assert.ok(e.liquidee);
  assert.ok(evts.some(x => /Liquidation/.test(x)));
});

test('traders : candidats variés, un fraudeur finit par être démasqué', () => {
  const c = candidats(1, 5);
  assert.equal(c.length, 3);
  assert.ok(c[2].salaire > c[0].salaire);
  const e = nouvelleEntreprise('X', 2e6, T0);
  const r = embaucher(e, { ...c[0], integrite: 0.1 }, 1e6, T0);
  assert.ok(r.trader);
  e.traders[0].fraude = true;
  let evts = [];
  for (let i = 1; i <= 400 && e.traders.length; i++) evts = evts.concat(avancerEntreprise(e, T0 + i * JOUR, ctx, 3));
  assert.equal(e.traders.length, 0);
  assert.ok(evts.some(x => /Scandale/.test(x)));
  assert.ok(allouer(e, 0, 10).erreur);
  assert.ok(resultat(e.exercice) < 0);
});
