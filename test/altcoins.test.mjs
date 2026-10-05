import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coinsParSeconde, calculerRig } from '../js/altcoins.js';
import { avancer } from '../js/minage.js';

const alt = JSON.parse(readFileSync(new URL('../data/altcoins.json', import.meta.url)));

test('Ravencoin : on retrouve l\'estimation de WhatToMine (241,24 RVN par jour pour 3 × RTX 3070)', () => {
  const parJour = coinsParSeconde(3 * 27.6e6, alt.coins.RVN, 0) * 86400;
  assert.ok(Math.abs(parJour - 241.24) / 241.24 < 0.01, String(parJour));
});

test('Ethereum Classic : 0,01084 ETC par jour pour 3 × 60 MH/s', () => {
  const parJour = coinsParSeconde(180e6, alt.coins.ETC, 0) * 86400;
  assert.ok(Math.abs(parJour - 0.01084) / 0.01084 < 0.01, String(parJour));
});

test('rig de 6 RTX 3070 sur Ravencoin : alimentations et consommation au mur', () => {
  const r = calculerRig('3070', 6, 'RVN');
  assert.equal(r.w, Math.round(6 * 180 / 0.92 + 60));
  assert.equal(r.alims, 2); // 1 234 W > 960 W utiles par alimentation
  assert.equal(r.prix, 6 * 406 + 60 + 150 + 60 + 2 * 220);
});

test('Antminer L9 : minage fusionné Litecoin + Dogecoin versé à minuit', () => {
  const minage = { pool: 'braiins', machines: [{ modele: 'l9', statut: 'marche' }], soldePool: 0, gainsTotal: 0, factureKWh: 0, factureEUR: 0, contrat: { type: 'base', kva: 6 } };
  const verses = {};
  const t0 = Date.parse('2026-10-05T00:00:00Z');
  avancer(minage, t0, t0 + 864e5, { reseau: null, alt, couleurs: {}, multMinage: 1, multElec: 1, peutRecevoir: true, logement: 'maison', temperature: () => 10,
    payer: (tag, q) => { verses[tag] = q; } });
  assert.ok(verses.LTC > 0.0200 && verses.LTC < 0.0210, String(verses.LTC)); // ≈ 0,0205 LTC/jour à 16 GH/s, 1 % de commission
  assert.ok(verses.DOGE > 50 && verses.DOGE < 60, String(verses.DOGE)); // ≈ 55,7 DOGE/jour
  assert.ok(Math.abs(minage.factureKWh - 3.26 * 24) < 0.01);
});
