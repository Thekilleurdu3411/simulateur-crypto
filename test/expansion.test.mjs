import test from 'node:test';
import assert from 'node:assert/strict';
import { nouvelleEntreprise, avancerEntreprise, demanderAgrement, partEntreprise, valeurEntreprise, distribuer, resultat } from '../js/entreprise.js';
import { amorcer, encours, preparerBourse, conditionsBourse, vendreActions, cours, BOURSE, salariesPlateforme } from '../js/expansion.js';

const JOUR = 864e5;
const T0 = Date.UTC(2027, 2, 1);
const ctx = { prixBTC: 100000, prixETH: 4000, prixALT: 150, eurUsd: 1.15, reseau: { difficulte: 1.5e14, recompense: 3.15 }, reputation: 60 };

test('fonds : agrément, amorçage, souscriptions des clients, frais de gestion', () => {
  const e = nouvelleEntreprise('Gestion', 2e6, T0);
  const t1 = T0 + 8 * JOUR;
  assert.ok(demanderAgrement(e, 'fonds', t1, 100000).erreur); // fonds propres insuffisants
  assert.ok(demanderAgrement(e, 'fonds', t1, 2e6).ok);
  assert.ok(amorcer(e, 100000).erreur); // pas encore agréé
  e.jour = Math.floor(t1 / JOUR);
  avancerEntreprise(e, t1 + 181 * JOUR, ctx);
  assert.equal(e.fonds.statut, 'actif');
  assert.ok(amorcer(e, 500000).ok);
  e.fonds.marketing = 20000;
  avancerEntreprise(e, t1 + 400 * JOUR, ctx);
  assert.ok(e.fonds.partsClients > 0);
  assert.ok(encours(e.fonds) > 500000);
  assert.ok((e.exercice.gestion || 0) + (e.exercices[0]?.gestion || 0) > 0);
});

test('plateforme : clients, commissions, coûts et salariés', () => {
  const e = nouvelleEntreprise('Echange', 5e6, T0);
  const t1 = T0 + 8 * JOUR;
  assert.ok(demanderAgrement(e, 'plateforme', t1, 5e6).ok);
  e.jour = Math.floor(t1 / JOUR);
  avancerEntreprise(e, t1 + 271 * JOUR, ctx);
  assert.equal(e.plateforme.statut, 'actif');
  e.plateforme.marketing = 100000;
  avancerEntreprise(e, t1 + 271 * JOUR + 180 * JOUR, ctx);
  assert.ok(e.plateforme.clients > 3000, `clients ${e.plateforme.clients}`);
  assert.ok(salariesPlateforme(e.plateforme) >= 8);
  const x = e.exercice;
  assert.ok((x.plateforme || 0) > 0 && (x.activites || 0) > 0);
});

test('Bourse : conditions, introduction, cours, vente d\'actions et dividendes partagés', () => {
  const p = { banque: { solde: 0 }, entreprise: nouvelleEntreprise('Cotée', 30e6, T0) };
  const e = p.entreprise;
  const vn = () => valeurEntreprise(e, 100000, 1.15, T0) - e.compteCourant;
  assert.match(conditionsBourse(e, vn()), /années/);
  e.exercices = [{ an: 2027, net: 2e6 }, { an: 2026, net: 1e6 }];
  e.reserves = 3e6;
  assert.equal(conditionsBourse(e, vn()), null);
  assert.ok(preparerBourse(e, T0 + 8 * JOUR, vn()).ok);
  e.jour = Math.floor((T0 + 8 * JOUR) / JOUR);
  avancerEntreprise(e, T0 + 130 * JOUR, ctx);
  assert.ok(e.bourse.cotee);
  assert.equal(e.parts, 1 - BOURSE.flottant);
  assert.ok(cours(e) > 0);
  const part = partEntreprise(e, 100000, 1.15, T0 + 130 * JOUR);
  assert.ok(Math.abs(part - e.bourse.capi * 0.75) < 1);
  const r = vendreActions(p, 0.05, 0.314);
  assert.ok(r.net > 0 && r.impot >= 0);
  assert.ok(Math.abs(e.parts - 0.7) < 1e-9);
  const avant = p.banque.solde;
  const d = distribuer(p, 100000);
  assert.ok(Math.abs(p.banque.solde - avant - 100000 * 0.7 * (1 - 0.314)) < 1e-6 && d.brut === 70000);
  assert.ok(isFinite(resultat(e.exercice)));
});
