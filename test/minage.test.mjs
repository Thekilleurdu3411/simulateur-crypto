import test from 'node:test';
import assert from 'node:assert/strict';
import { btcParSeconde, subvention, avancer, prixKWh, jourTempo, heureCreuse, puissanceDispo } from '../js/minage.js';

test('gains : on retrouve le hashprice réel du 28/09/2026 (0,0004767 BTC par PH et par jour)', () => {
  const parJour = btcParSeconde(1000, 132.76e12, 3.125 + 0.0217, 0) * 86400;
  assert.ok(Math.abs(parJour - 0.0004767) / 0.0004767 < 0.005, String(parJour));
});

test('subvention par hauteur', () => {
  assert.equal(subvention(840000), 3.125);
  assert.equal(subvention(1050000), 1.5625);
});

test('heures creuses et jour Tempo (heure de Paris)', () => {
  const t = Date.parse('2026-10-05T03:00:00+02:00'); // 3 h du matin à Paris
  assert.equal(heureCreuse(t), true);
  assert.equal(jourTempo(t), '2026-10-04'); // le jour Tempo commence à 6 h
  assert.equal(heureCreuse(Date.parse('2026-10-05T12:00:00+02:00')), false);
});

test('prix Tempo rouge en heures pleines', () => {
  const t = Date.parse('2026-12-10T10:00:00+01:00');
  const r = prixKWh({ type: 'tempo', kva: 6 }, t, { '2026-12-10': 'rouge' });
  assert.equal(r.prix, 0.7295);
  assert.equal(prixKWh({ type: 'base', kva: 6 }, t, {}).prix, 0.2001);
});

test('une journée de minage : facture, solde du pool et versement à minuit', () => {
  const minage = { pool: 'braiins', machines: [{ modele: 's19jpro', statut: 'marche' }], soldePool: 0.00099, gainsTotal: 0,
    factureKWh: 0, factureEUR: 0, contrat: { type: 'base', kva: 6 } };
  const verses = [];
  const t0 = Date.parse('2026-10-05T00:00:00Z');
  const evts = avancer(minage, t0, t0 + 864e5 + 1, {
    reseau: { difficulte: 132.76e12, recompense: 3.1467 }, couleurs: {}, multMinage: 1, multElec: 1, peutRecevoir: true,
    payer: (b, q) => verses.push(q)
  });
  assert.ok(Math.abs(minage.factureKWh - 3.068 * 24) < 0.01);
  assert.ok(Math.abs(minage.factureEUR - 3.068 * 24 * 0.2001) < 0.01);
  assert.equal(verses.length, 1);
  assert.ok(verses[0] > 0.00099);
  assert.equal(evts.length, 1);
});

test('livraison : la machine arrive arrêtée', () => {
  const t0 = Date.now();
  const minage = { pool: 'braiins', machines: [{ modele: 's21pro', statut: 'livraison', livraisonLe: t0 + 6e5 }], soldePool: 0, gainsTotal: 0,
    factureKWh: 0, factureEUR: 0, contrat: { type: 'base', kva: 6 } };
  avancer(minage, t0, t0 + 36e5, { reseau: null, couleurs: {}, multMinage: 1, multElec: 1, payer: () => {} });
  assert.equal(minage.machines[0].statut, 'arret');
});

test('chez les parents : aucune puissance pour un ASIC', () => {
  assert.equal(puissanceDispo('parents', 6), 0);
  assert.equal(puissanceDispo('appart', 6), 4);
});
