import test from 'node:test';
import assert from 'node:assert/strict';
import { avancer, temperaturePiece, facteurChaleur, valeurReventeUSD } from '../js/minage.js';

const reseau = { difficulte: 132.76e12, recompense: 3.1467 };
function parc(machines, extra = {}) {
  return { pool: 'braiins', machines, soldePool: 0, gainsTotal: 0, factureKWh: 0, factureEUR: 0, contrat: { type: 'base', kva: 6 }, ...extra };
}

test('température : un S21 Pro dans une chambre en été déclenche le bridage', () => {
  const T = temperaturePiece('appart', false, 30, 3.531);
  assert.ok(T > 40);
  assert.equal(facteurChaleur(T), 0.3);
  assert.ok(temperaturePiece('appart', true, 15, 3.531) < 30);
});

test('mode éco : moins de puissance, moins de consommation', () => {
  const a = parc([{ modele: 's19jpro', statut: 'marche', mode: 'eco' }]);
  const b = parc([{ modele: 's19jpro', statut: 'marche', mode: 'normal' }]);
  const t0 = Date.parse('2026-10-05T08:00:00Z');
  const ctx = { reseau, couleurs: {}, multMinage: 1, multElec: 1, payer: () => {}, logement: 'maison', temperature: () => 10 };
  avancer(a, t0, t0 + 36e5, ctx); avancer(b, t0, t0 + 36e5, ctx);
  assert.ok(a.factureKWh < b.factureKWh && a.gainsTotal < b.gainsTotal);
  assert.ok(a.gainsTotal / a.factureKWh > b.gainsTotal / b.factureKWh); // meilleure efficacité
});

test('panne forcée : la machine s\'arrête ou perd une carte', () => {
  const m = { modele: 's19jpro', statut: 'marche', mode: 'normal' };
  const p = parc([m]);
  const t0 = Date.parse('2026-10-05T08:00:00Z');
  let i = 0;
  const evts = avancer(p, t0, t0 + 15 * 6e4, { reseau, couleurs: {}, multMinage: 1, multElec: 1, payer: () => {}, logement: 'maison', pannes: 1e9, rng: () => (i++ === 0 ? 0 : 0.1) });
  assert.ok(evts.some(e => e.panne));
  assert.equal(m.statut, 'panne'); // tirage 0,1 : ventilateur
});

test('bruit : 3 plaintes mènent à la mise en demeure, puis plus de minage la nuit', () => {
  const p = parc([{ modele: 's19jpro', statut: 'marche', mode: 'normal' }]);
  const ctx = { reseau, couleurs: {}, multMinage: 1, multElec: 1, payer: () => {}, logement: 'appart', bruit: 'reel', pannes: 0, rng: () => 0 };
  const t0 = Date.parse('2026-10-05T18:00:00+02:00');
  avancer(p, t0, t0 + 3 * 864e5, ctx);
  assert.equal(p.plaintes, 3);
  assert.equal(p.restrictionNuit, true);
  const avant = p.gainsTotal;
  const nuit = Date.parse('2026-10-09T23:00:00+02:00');
  avancer(p, nuit, nuit + 36e5, ctx);
  assert.equal(p.gainsTotal, avant);
});

test('revente : une machine en panne vaut moins', () => {
  const ok = valeurReventeUSD({ modele: 's21pro', statut: 'arret', acheteLe: Date.now() });
  const hs = valeurReventeUSD({ modele: 's21pro', statut: 'panne', acheteLe: Date.now() });
  assert.ok(hs < ok);
  assert.equal(Math.round(ok), Math.round(1910 * 0.7));
});

test('hébergeur : pas de chaleur ni de bruit, électricité au prix de l\'hébergeur', async () => {
  const { prixHebergeurEUR, supplementAbonnementParSeconde } = await import('../js/minage.js');
  const m = { modele: 's21pro', statut: 'marche', mode: 'normal', lieu: 'saz' };
  const p = parc([m]);
  const t0 = Date.parse('2026-07-15T12:00:00Z');
  avancer(p, t0, t0 + 864e5, { reseau, couleurs: {}, multMinage: 1, multElec: 1, payer: () => {}, logement: 'appart', temperature: () => 35,
    prixHebergeur: id => prixHebergeurEUR(id, 1.17), bruit: 'reel', rng: () => 0, pannes: 0 });
  assert.equal(p.factureKWh, 0);
  assert.ok(Math.abs(p.factureHebKWh - 3.531 * 24) < 0.01);
  assert.ok(Math.abs(p.factureHebEUR - 3.531 * 24 * 0.067 / 1.17) < 0.01);
  assert.ok(!p.plaintes);
  // compteur passé de 6 à 9 kVA : 48,24 € de plus par an
  const s = supplementAbonnementParSeconde({ type: 'base', kva: 9 }, 6) * 365 * 86400;
  assert.ok(Math.abs(s - 48.24) < 0.01);
});
