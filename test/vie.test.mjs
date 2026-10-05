import test from 'node:test';
import assert from 'node:assert/strict';
import { salaireNet, loyer, depenses, avancerVie, SMIC } from '../js/vie.js';

test('alternant de 20 ans en 1re année : 43 % du SMIC, sans cotisations sous 50 %', () => {
  const s = salaireNet({ situation: 'alternant', age: 20, anneeApprentissage: 1 });
  assert.ok(Math.abs(s - SMIC.brut * 0.43) < 0.01);
});

test('alternant de 21 ans en 3e année : cotisations au-delà de 50 % du SMIC', () => {
  const brut = SMIC.brut * 0.78;
  const s = salaireNet({ situation: 'alternant', age: 21, anneeApprentissage: 3 });
  assert.ok(s < brut && s > SMIC.brut * 0.5);
});

test('salarié : milieu de la fourchette selon l\'expérience', () => {
  assert.equal(salaireNet({ situation: 'salarie', metier: 'Électricien', experience: 'debutant' }), 1570);
  assert.equal(salaireNet({ situation: 'salarie', metier: 'Développeur', experience: 'confirme' }), 3600);
});

test('loyers : ville connue, ville inconnue, parents', () => {
  assert.equal(loyer({ logement: 'appart', ville: 'Bordeaux' }), 869);
  assert.equal(loyer({ logement: 'appart', ville: 'Périgueux' }), 480);
  assert.equal(loyer({ logement: 'appart', ville: 'Trifouilly' }), 480);
  assert.equal(loyer({ logement: 'parents', ville: 'Paris' }), 0);
});

test('un mois de vie : salaire puis dépenses', () => {
  const vie = {}, banque = { solde: 0 };
  const profil = { situation: 'salarie', metier: 'Électricien', experience: 'debutant', logement: 'appart', ville: 'Bordeaux', modeVie: 'normal' };
  const t0 = Date.now(), mois = 30.44 * 864e5;
  avancerVie(vie, banque, profil, t0, t0 + mois + 1, mois, 6);
  const dep = depenses(profil, 6).reduce((s, d) => s + d.montant, 0);
  assert.ok(Math.abs(banque.solde - (1570 - dep)) < 0.02);
});

test('étudiant : job de 10 h par semaine au SMIC ; sans emploi : rien', () => {
  assert.ok(Math.abs(salaireNet({ situation: 'etudiant' }) - SMIC.net * 10 / 35) < 1e-9);
  assert.equal(salaireNet({ situation: 'sans' }), 0);
});

test('tranche d\'imposition selon le salaire', async () => {
  const { tmi } = await import('../js/vie.js');
  assert.equal(tmi({ situation: 'salarie', metier: 'Électricien', experience: 'debutant' }), 0.11);
  assert.equal(tmi({ situation: 'salarie', metier: 'Développeur', experience: 'confirme' }), 0.30);
  assert.equal(tmi({ situation: 'alternant', age: 20, anneeApprentissage: 1 }), 0);
  assert.equal(tmi({ situation: 'sans' }), 0);
});
