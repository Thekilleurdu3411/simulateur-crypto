import test from 'node:test';
import assert from 'node:assert/strict';
import { preparerOrdre } from '../js/orders.js';
import { placerOrdre, annulerOrdre } from '../js/portefeuille.js';
import { traiterPeriode, rattraper } from '../js/suivi.js';
import { patrimoine } from '../js/engine.js';

function partieTest() {
  return { banque: { solde: 0 }, capitalDepart: 1000, historique: [],
    plateforme: { statut: 'ouvert', soldeEUR: 1000, actifs: { BTC: { qte: 1, cout: 90 } }, ordres: [] } };
}
const regles = { pas: '0.0001', tick: '0.01', minNotional: 5 };
const marche = { bid: 99.99, ask: 100.01 };

test('achat limite : réservation, exécution et reliquat rendu', () => {
  const p = partieTest();
  const { ordre } = preparerOrdre({ s: 'BTCEUR', base: 'BTC', sens: 'achat', type: 'limite', qte: 2, prix: 95, maintenant: 1000 }, marche, regles);
  placerOrdre(p, ordre);
  assert.equal(p.plateforme.soldeEUR, 810);
  assert.equal(patrimoine(p, () => 100).total, 1000 + 100);
  const evts = traiterPeriode(p, 'BTCEUR', { debut: 60000, fin: 120000, haut: 99, bas: 94, cloture: 96 }, 0.001);
  assert.equal(evts.length, 1);
  assert.equal(p.plateforme.ordres.length, 0);
  assert.equal(p.plateforme.soldeEUR, 810);
  assert.ok(Math.abs(p.plateforme.actifs.BTC.qte - (1 + 2 * 0.999)) < 1e-12);
  assert.equal(p.plateforme.actifs.BTC.cout, 90 + 190);
});

test('vente limite annulée : tout est rendu', () => {
  const p = partieTest();
  const { ordre } = preparerOrdre({ s: 'BTCEUR', base: 'BTC', sens: 'vente', type: 'limite', qte: 0.5, prix: 120, maintenant: 1000 }, marche, regles);
  placerOrdre(p, ordre);
  assert.equal(p.plateforme.actifs.BTC.qte, 0.5);
  annulerOrdre(p, ordre.id);
  assert.equal(p.plateforme.actifs.BTC.qte, 1);
  assert.equal(p.plateforme.actifs.BTC.cout, 90);
});

test('rattrapage hors ligne avec les bougies passées', async () => {
  const p = partieTest();
  const t0 = Date.now() - 10 * 60000;
  const { ordre } = preparerOrdre({ s: 'BTCEUR', base: 'BTC', sens: 'vente', type: 'limite', qte: 1, prix: 110, maintenant: t0 }, marche, regles);
  placerOrdre(p, ordre);
  const faux = { bougiesPeriode: async () => [
    { t: t0 + 60000, h: 105, l: 99, c: 104 },
    { t: t0 + 120000, h: 110.5, l: 103, c: 108 }
  ] };
  const r = await rattraper(p, faux, 0.001);
  assert.equal(r.evenements.length, 1);
  assert.ok(Math.abs(p.plateforme.soldeEUR - (1000 + 110 * 0.999)) < 1e-9);
  assert.equal(p.cessions[0].cout, 90);
});
