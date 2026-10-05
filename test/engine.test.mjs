// Tests du moteur d'ordres : node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { acheterAuMarche, vendreAuMarche, arrondirPas, decimalesPas } from '../js/engine.js';

const carnet = {
  asks: [[100, 1], [101, 2], [105, 10]],
  bids: [[99, 1], [98, 2], [90, 10]]
};
const base = { carnet, pas: '0.001', minNotional: 5 };

test('pas de quantité', () => {
  assert.equal(decimalesPas('0.00001000'), 5);
  assert.equal(decimalesPas('1.00000000'), 0);
  assert.equal(arrondirPas(1.23456, '0.001'), 1.234);
});

test('achat en consommant le carnet : glissement réel', () => {
  const r = acheterAuMarche({ ...base, budget: 302, mode: 'carnet', tauxFrais: 0.001 });
  // 1 à 100 € puis 2 à 101 € = 302 € pour 3 unités
  assert.equal(r.qteBrute, 3);
  assert.equal(Math.round(r.cout * 100) / 100, 302);
  assert.ok(r.glissement > 0);
  assert.equal(r.qteNette, 3 - 0.003);
});

test('achat au meilleur prix : pas de glissement', () => {
  const r = acheterAuMarche({ ...base, budget: 302, mode: 'meilleur', tauxFrais: 0.0005 });
  assert.equal(r.prixMoyen, 100);
  assert.equal(r.glissement, 0);
});

test('achat au prix milieu sans frais', () => {
  const r = acheterAuMarche({ ...base, budget: 99.5, mode: 'milieu', tauxFrais: 0 });
  assert.equal(r.prixMoyen, 99.5);
  assert.equal(r.frais, 0);
  assert.equal(r.qteBrute, 1);
});

test('montant minimum refusé', () => {
  const r = acheterAuMarche({ ...base, budget: 3, mode: 'carnet', tauxFrais: 0.001 });
  assert.ok(r.erreur);
});

test('liquidité insuffisante refusée', () => {
  const r = acheterAuMarche({ ...base, budget: 100000, mode: 'carnet', tauxFrais: 0.001 });
  assert.ok(r.erreur);
});

test('vente en consommant le carnet', () => {
  const r = vendreAuMarche({ ...base, quantite: 2, mode: 'carnet', tauxFrais: 0.001 });
  assert.equal(r.recuBrut, 99 + 98);
  assert.ok(Math.abs(r.recuNet - 197 * 0.999) < 1e-9);
  assert.ok(r.glissement > 0);
});
