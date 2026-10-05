import test from 'node:test';
import assert from 'node:assert/strict';
import { ouvrir, fermer, prixLiquidation, estLiquidee, financement, prochainFinancement } from '../js/futures.js';

const base = { s: 'BTCUSDT', bid: 99990, ask: 100010, pas: '0.001', minNotional: 100, solde: 1000, levierMax: 125, maintenant: 0 };

test('long ×10 : marge, frais et prix de liquidation', () => {
  const r = ouvrir({ ...base, sens: 'long', levier: 10, marge: 500 });
  const p = r.position;
  assert.equal(p.qte, 0.049); // 5 000 USDT / 100 010, arrondi au pas
  assert.ok(Math.abs(p.marge - 0.049 * 100010 / 10) < 1e-9);
  assert.ok(Math.abs(r.frais - 0.049 * 100010 * 0.0005) < 1e-9);
  // Une baisse d'environ 10 % moins la marge de maintien liquide la position
  assert.ok(p.liquidation > 90000 && p.liquidation < 90500, String(p.liquidation));
});

test('short : liquidation au-dessus du prix', () => {
  const l = prixLiquidation('short', 100000, 1, 10000, 0.004);
  assert.ok(l > 109000 && l < 110000);
  assert.ok(estLiquidee({ sens: 'short', liquidation: l }, 100000, l + 1));
});

test('levier limité par la difficulté', () => {
  assert.ok(ouvrir({ ...base, sens: 'long', levier: 10, marge: 100, levierMax: 5 }).erreur);
});

test('fermeture avec gain', () => {
  const { position } = ouvrir({ ...base, sens: 'long', levier: 5, marge: 200 });
  const r = fermer(position, 110000, 110020);
  assert.ok(r.brut > 0 && r.rendu > position.marge);
});

test('financement : un long paie quand le taux est positif', () => {
  assert.ok(financement({ sens: 'long', qte: 1 }, 100000, 0.0001) < 0);
  assert.ok(financement({ sens: 'short', qte: 1 }, 100000, 0.0001) > 0);
});

test('échéances de financement à 0 h, 8 h et 16 h UTC', () => {
  assert.equal(prochainFinancement(Date.parse('2026-10-05T03:00:00Z')), Date.parse('2026-10-05T08:00:00Z'));
  assert.equal(prochainFinancement(Date.parse('2026-10-05T17:00:00Z')), Date.parse('2026-10-06T00:00:00Z'));
});

test('partie : ouverture, financement échu et liquidation en direct', async () => {
  const { futuresDe, ouvrirPosition, surPrixMarque, rattraper } = await import('../js/jeufutures.js');
  const partie = { difficulte: 'expert', historique: [], plateforme: { soldeEUR: 0, actifs: {} } };
  futuresDe(partie).soldeUSDT = 1000;
  const r = ouvrirPosition(partie, { s: 'BTCUSDT', sens: 'long', levier: 20, marge: 500 }, { bid: 99990, ask: 100010 }, { pas: '0.001', minNotional: 100 });
  const pos = r.position;
  pos.prochainFinancement = Date.now() - 1; // échéance passée
  const avant = partie.futures.soldeUSDT;
  surPrixMarque(partie, 'BTCUSDT', { p: 100000, r: 0.0001 });
  assert.ok(partie.futures.soldeUSDT < avant); // le long a payé
  const evts = surPrixMarque(partie, 'BTCUSDT', { p: pos.liquidation - 1, r: 0.0001 });
  assert.equal(evts.length, 1);
  assert.equal(partie.futures.positions.length, 0);
});

test('Investisseur : pas de liquidation pendant l\'absence', async () => {
  const { futuresDe, ouvrirPosition, rattraper } = await import('../js/jeufutures.js');
  const partie = { difficulte: 'investisseur', historique: [], plateforme: { soldeEUR: 0, actifs: {} } };
  futuresDe(partie).soldeUSDT = 1000;
  const { position } = ouvrirPosition(partie, { s: 'BTCUSDT', sens: 'long', levier: 5, marge: 500 }, { bid: 99990, ask: 100010 }, { pas: '0.001', minNotional: 100 });
  position.ouverteLe = Date.now() - 36e5; partie.futures.suiviJusqua = Date.now() - 36e5;
  const F = { bougiesMarque: async () => [{ t: Date.now() - 18e5, h: 100000, l: 50000, c: 60000 }], historiqueFinancement: async () => [] };
  const evts = await rattraper(partie, F);
  assert.equal(evts.length, 0);
  assert.equal(partie.futures.positions.length, 1);
});
