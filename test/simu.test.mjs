import test from 'node:test';
import assert from 'node:assert/strict';
import { creerSimulation, prixSimu, bougieSimu, bougiesSimu, actualitesSimu, reseauSimu, eurUsdSimu, stats24Simu, PAS } from '../js/simu.js';

const t0 = Date.parse('2026-10-06T10:07:00Z');
const base = () => creerSimulation({ debut: t0, seed: 42, prix: { BTCEUR: 95000, ETHEUR: 3800, DOGEEUR: 0.2 }, volumes: { BTCEUR: 5e7 }, eurUsd: 1.17, reseau: { difficulte: 1.5e14, hauteur: 960000, fraisMoyens: 0.03 } });

test('simulation : reproductible et continue au départ', () => {
  const a = base(), b = base();
  const t = t0 + 200 * 864e5;
  assert.equal(prixSimu(a, 'BTCEUR', t), prixSimu(b, 'BTCEUR', t));
  assert.equal(prixSimu(a, 'BTCEUR', a.debut), 95000);
  const autre = creerSimulation({ ...base(), seed: 7, prix: base().prix, debut: t0 });
  assert.notEqual(prixSimu(autre, 'BTCEUR', t), prixSimu(a, 'BTCEUR', t));
});

test('bougies cohérentes : plus haut et plus bas encadrent ouverture et clôture, enchaînement continu', () => {
  const s = base();
  const bs = bougiesSimu(s, 'ETHEUR', 3600e3, t0, t0 + 3 * 864e5);
  assert.ok(bs.length >= 70);
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    assert.ok(b.h >= Math.max(b.o, b.c) - 1e-9 && b.l <= Math.min(b.o, b.c) + 1e-9 && b.l > 0);
    if (i) assert.ok(Math.abs(b.o - bs[i - 1].c) < 1e-9);
  }
});

test('bougie en cours : rien du futur', () => {
  const s = base();
  const t = t0 + 5 * 864e5 + 7 * 60000;
  const b = bougieSimu(s, 'BTCEUR', t, 3600e3, t);
  assert.ok(Math.abs(b.c - prixSimu(s, 'BTCEUR', t)) < 1e-6);
});

test('volatilité annuelle du bitcoin réaliste et actualités régulières', () => {
  const s = base();
  const p = [];
  for (let d = 1; d <= 730; d++) p.push(prixSimu(s, 'BTCEUR', t0 + d * 864e5));
  const r = p.slice(1).map((x, i) => Math.log(x / p[i]));
  const vol = Math.sqrt(r.reduce((a, x) => a + x * x, 0) / r.length * 365);
  assert.ok(vol > 0.35 && vol < 0.9, 'vol ' + vol);
  const ev = actualitesSimu(s, t0, t0 + 730 * 864e5);
  assert.ok(ev.length > 8 && ev.length < 50, 'actualités ' + ev.length);
});

test('réseau, euro-dollar et statistiques 24 h', () => {
  const s = base();
  const t = t0 + 400 * 864e5;
  const r = reseauSimu(s, t);
  assert.ok(r.hauteur > 960000 + 50000 && r.difficulte > 0 && r.recompense > 3);
  const fx = eurUsdSimu(s, t);
  assert.ok(fx > 0.8 && fx < 1.6);
  const st = stats24Simu(s, 'BTCEUR', t);
  assert.ok(st.h >= st.l && st.q > 0);
  assert.equal(PAS, 900000);
});

test('machines fictives seulement dans le futur', async () => {
  const { CATALOGUE, disponible } = await import('../js/minage.js');
  const ajd = Date.parse('2026-10-06');
  assert.ok(CATALOGUE.filter(m => m.fictive).every(m => !disponible(m, ajd)));
  assert.ok(CATALOGUE.filter(m => m.fictive).some(m => disponible(m, Date.parse('2028-01-01'))));
});
