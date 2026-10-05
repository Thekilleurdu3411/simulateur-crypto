import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenant, reglerHorloge, enRejeu } from '../js/horloge.js';
import { nouvellePartie, dateDepart } from '../js/state.js';
import { rapportHashprice } from '../js/donnees.js';
import { carnetSynthetique, DEMI_ECART_REJEU } from '../js/market.js';
import { CATALOGUE, disponible, subvention } from '../js/minage.js';

test('horloge : direct par défaut, décalée pour une partie à une date passée', () => {
  reglerHorloge(null);
  assert.equal(enRejeu(), false);
  assert.ok(Math.abs(maintenant() - Date.now()) < 5);
  const p = nouvellePartie({ profil: { situation: 'sans' }, difficulte: 'expert', capital: 1000, depart: { type: 'passe', jour: '2021-04-14' } });
  reglerHorloge(p);
  assert.equal(enRejeu(), true);
  assert.equal(new Date(maintenant()).toISOString().slice(0, 7), '2021-04');
  assert.ok(Math.abs(maintenant() - p.creeLe) < 50);
  reglerHorloge(null);
});

test('date de départ : le jour choisi, à l\'heure actuelle', () => {
  const reel = new Date(2026, 9, 5, 14, 30).getTime();
  const d = new Date(dateDepart('2021-11-10', reel));
  assert.equal(d.getFullYear(), 2021); assert.equal(d.getMonth(), 10); assert.equal(d.getDate(), 10);
  assert.equal(d.getHours(), 14); assert.equal(d.getMinutes(), 30);
});

test('prix des machines en rejeu : suivent le hashprice, bornés', () => {
  const actuel = { recompense: 3.15, difficulte: 1.3e14, btcUsd: 110000 };
  const passe2021 = { recompense: 6.5, difficulte: 2.3e13, btcUsd: 60000 };
  const x = rapportHashprice(passe2021, actuel);
  assert.ok(x > 5 && x <= 10);
  assert.equal(rapportHashprice(actuel, actuel), 1);
  assert.equal(rapportHashprice({ ...actuel, btcUsd: 1 }, actuel), 0.5);
});

test('carnet reconstitué : écart et profondeur', () => {
  const c = carnetSynthetique(50000, 4);
  assert.equal(c.bids.length, 100);
  assert.ok(Math.abs(c.asks[0][0] - 50000 * (1 + DEMI_ECART_REJEU)) < 1e-6);
  assert.ok(c.bids[0][0] < 50000 && c.asks[0][0] > 50000);
  assert.ok(c.asks[1][0] > c.asks[0][0] && c.bids[1][0] < c.bids[0][0]);
  assert.equal(c.asks[0][1], 0.1);
});

test('catalogue : machines selon la date, récompense selon les halvings', () => {
  const t2021 = Date.parse('2021-01-01');
  const dispo = CATALOGUE.filter(m => disponible(m, t2021)).map(m => m.id);
  assert.deepEqual(dispo.sort(), ['s19', 's19pro']);
  assert.equal(subvention(640000), 6.25);
  assert.equal(subvention(840000), 3.125);
});
