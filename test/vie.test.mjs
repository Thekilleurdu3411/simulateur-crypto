import test from 'node:test';
import assert from 'node:assert/strict';
import { salaireNet, loyer, depenses, avancerVie, prestations, SMIC } from '../js/vie.js';

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
  const aides = prestations(profil).reduce((s, d) => s + d.montant, 0);
  assert.ok(aides > 0);
  assert.ok(Math.abs(banque.solde - (1570 + aides - dep)) < 0.02);
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

test('impôt sur le revenu : barème et décote', async () => {
  const { impotRevenu, depenses } = await import('../js/vie.js');
  // Électricien débutant : 1 570 € net, 16 956 € imposables -> 589 € avant décote, effacés par la décote
  assert.equal(impotRevenu({ situation: 'salarie', metier: 'Électricien', experience: 'debutant' }), 0);
  // Infirmier confirmé : 2 150 € net, 23 220 € imposables -> 1 278 € avant décote, 897 − 578 = 319 € de décote
  const brut = (23220 - 11600) * 0.11;
  assert.equal(impotRevenu({ situation: 'salarie', metier: 'Infirmier', experience: 'confirme' }), Math.round(brut - (897 - 0.4525 * brut)));
  // Développeur confirmé : 3 600 € net, 38 880 € imposables
  const dev = impotRevenu({ situation: 'salarie', metier: 'Développeur', experience: 'confirme' });
  assert.equal(dev, Math.round((29579 - 11600) * 0.11 + (38880 - 29579) * 0.30));
  assert.equal(impotRevenu({ situation: 'sans' }), 0);
  const p = { situation: 'salarie', metier: 'Développeur', experience: 'confirme', logement: 'parents', modeVie: 'normal' };
  assert.ok(depenses(p, 6).some(d => d.nom.startsWith('Impôt')));
  assert.ok(!depenses(p, 6, { impot: false }).some(d => d.nom.startsWith('Impôt')));
});

test('prestations : RSA à partir de 25 ans, prime d\'activité au SMIC', async () => {
  const { prestations, RSA } = await import('../js/vie.js');
  assert.deepEqual(prestations({ situation: 'sans', age: 30 }), [{ nom: 'RSA', montant: RSA.forfait }]);
  assert.deepEqual(prestations({ situation: 'sans', age: 22 }), []);
  const pa = prestations({ situation: 'salarie', age: 30, metier: 'Caissier' });
  assert.equal(pa[0].nom, "Prime d'activité");
  assert.ok(pa[0].montant > 200 && pa[0].montant < 300);
  assert.deepEqual(prestations({ situation: 'salarie', age: 30, metier: 'Développeur', experience: 'confirme' }), []);
});

test('transports : abonnement remboursé à moitié, voiture', async () => {
  const { coutTransport, NAVIGO, VOITURE_MOIS } = await import('../js/vie.js');
  assert.equal(coutTransport({ situation: 'salarie', ville: 'Paris', transport: 'commun' }), NAVIGO / 2);
  assert.equal(coutTransport({ situation: 'sans', ville: 'Paris', transport: 'commun' }), NAVIGO);
  assert.equal(coutTransport({ situation: 'salarie', transport: 'voiture' }), VOITURE_MOIS);
});
