import test from 'node:test';
import assert from 'node:assert/strict';
import { nettoyerReglages, reglesDe, DIFFICULTES } from '../js/config.js';
import { mode } from '../js/jeufisc.js';

test('réglages identiques à la difficulté : partie non personnalisée', () => {
  assert.deepEqual(nettoyerReglages('expert', { vitesseMax: 1440, minage: 1.25, impots: 'auto' }), {});
  assert.equal(reglesDe({ difficulte: 'expert', reglages: {} }), DIFFICULTES.expert);
});

test('réglages bornés et validés', () => {
  const r = nettoyerReglages('realite', { vitesseMax: 1440, elec: -1, levierMax: 33, bruit: 'off', aides: 1, inconnu: 3 });
  assert.deepEqual(r, { vitesseMax: 1440, elec: 0, bruit: 'off', aides: true });
});

test('partie personnalisée : règles fusionnées et impôts suivis', () => {
  const partie = { difficulte: 'realite', reglages: nettoyerReglages('realite', { minage: 3, impots: 'preleve' }) };
  const d = reglesDe(partie);
  assert.equal(d.nom, 'Personnalisée');
  assert.equal(d.base, 'Réalité');
  assert.equal(d.minage, 3);
  assert.equal(d.temps, 1);
  assert.equal(mode(partie), 'preleve');
});
