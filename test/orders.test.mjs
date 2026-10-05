import test from 'node:test';
import assert from 'node:assert/strict';
import { preparerOrdre, evaluer, reserveAchat, arrondirPrix } from '../js/orders.js';

const regles = { pas: '0.0001', tick: '0.01', minNotional: 5 };
const marche = { bid: 99.99, ask: 100.01 };
const base = { s: 'BTCEUR', base: 'BTC', maintenant: 0 };

test('arrondi au pas de prix', () => {
  assert.equal(arrondirPrix(100.006, '0.01'), 100.01);
});

test('limite d\'achat au-dessus du marché refusée', () => {
  const r = preparerOrdre({ ...base, sens: 'achat', type: 'limite', qte: 1, prix: 101 }, marche, regles);
  assert.ok(r.erreur);
});

test('limite touchée sans être traversée : pas d\'exécution', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'achat', type: 'limite', qte: 1, prix: 95 }, marche, regles);
  assert.equal(evaluer(ordre, { haut: 100, bas: 95, cloture: 97 }), null);
  const r = evaluer(ordre, { haut: 100, bas: 94.99, cloture: 97 });
  assert.deepEqual(r, { execute: true, prix: 95, jambe: 'limite' });
});

test('période de création : seule la clôture compte', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'vente', type: 'limite', qte: 1, prix: 105 }, marche, regles);
  assert.equal(evaluer(ordre, { haut: 110, bas: 99, cloture: 101, partielle: true }), null);
});

test('stop-limit de vente : déclenchement puis exécution', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'vente', type: 'stop', qte: 1, stop: 95, limiteStop: 94 }, marche, regles);
  // Clôture sous la limite : déclenché mais pas encore exécuté.
  assert.deepEqual(evaluer(ordre, { haut: 100, bas: 93, cloture: 93.5 }), { declenche: true });
  assert.equal(ordre.declenche, true);
  assert.equal(evaluer(ordre, { haut: 94, bas: 93, cloture: 93.5 }), null);
  assert.deepEqual(evaluer(ordre, { haut: 94.5, bas: 93, cloture: 94.2 }), { execute: true, prix: 94, jambe: 'stop' });
});

test('OCO de vente : le stop prime en cas de doute', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'vente', type: 'oco', qte: 1, prix: 110, stop: 90, limiteStop: 89 }, marche, regles);
  const r = evaluer(ordre, { haut: 111, bas: 89.5, cloture: 95 });
  assert.equal(r.jambe, 'stop');
});

test('OCO de vente : jambe limite', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'vente', type: 'oco', qte: 1, prix: 110, stop: 90, limiteStop: 89 }, marche, regles);
  assert.deepEqual(evaluer(ordre, { haut: 110.5, bas: 101, cloture: 110.2 }), { execute: true, prix: 110, jambe: 'limite' });
});

test('réserve d\'un OCO d\'achat : la jambe la plus chère', () => {
  const { ordre } = preparerOrdre({ ...base, sens: 'achat', type: 'oco', qte: 2, prix: 90, stop: 110, limiteStop: 111 }, marche, regles);
  assert.equal(reserveAchat(ordre), 222);
});

test('montant minimum', () => {
  const r = preparerOrdre({ ...base, sens: 'achat', type: 'limite', qte: 0.01, prix: 95 }, marche, regles);
  assert.ok(r.erreur);
});
