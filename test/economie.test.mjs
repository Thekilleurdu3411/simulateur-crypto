import test from 'node:test';
import assert from 'node:assert/strict';
import { indiceVie, indiceElec, inflation } from '../js/economie.js';
import { avancerVie, salaireNet } from '../js/vie.js';

test('indice de la vie : 1 en 2026, plus bas dans le passé, inflation réelle', () => {
  assert.equal(indiceVie(Date.parse('2026-06-01')), 1);
  const k2021 = indiceVie(Date.parse('2021-06-01'));
  // 2022 à 2026 : 5,2 / 4,9 / 2,0 / 0,9 / 1,0 %
  assert.ok(Math.abs(k2021 - 1 / (1.052 * 1.049 * 1.02 * 1.009 * 1.01)) < 1e-9);
  assert.ok(indiceVie(Date.parse('2030-06-01'), 5) > 1);
  assert.equal(indiceVie(Date.parse('2030-06-01'), 5), indiceVie(Date.parse('2030-06-01'), 5));
  for (let a = 2027; a < 2060; a++) { const i = inflation(a, 3); assert.ok(i >= -0.5 && i <= 6); }
});

test("prix de l'électricité : hausses de 2023-2024, baisse de 2025", () => {
  assert.equal(indiceElec(Date.parse('2026-09-01')), 1);
  const avant2023 = indiceElec(Date.parse('2022-12-01'));
  const apres2024 = indiceElec(Date.parse('2024-03-01'));
  assert.ok(Math.abs(apres2024 / avant2023 - 1.15 * 1.10 * 1.086) < 1e-9);
  assert.ok(indiceElec(Date.parse('2025-03-01')) < apres2024);
});

test('vie : salaire indexé à la date de l\'échéance', () => {
  const vie = {}, banque = { solde: 0 };
  const profil = { situation: 'salarie', metier: 'Électricien', experience: 'debutant', logement: 'parents', modeVie: 'normal', age: 22 };
  const t0 = Date.parse('2021-03-01'), mois = 30.44 * 864e5;
  const evts = avancerVie(vie, banque, profil, t0, t0 + mois + 1, mois, 6, { indice: t => indiceVie(t) });
  const k = indiceVie(t0 + mois);
  assert.ok(evts[0].texte.includes((Math.round(salaireNet(profil) * k * 100) / 100).toFixed(2).replace('.', ',')));
});
