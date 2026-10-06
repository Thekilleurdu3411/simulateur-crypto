import test from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../js/bienetre.js';
import * as I from '../js/biens.js';
import { avancerJauges, faireActivite, acheterLogement, simulationAchat, valeurBiens, vendreLogement, acheterVoiture, carriereDe, demenager } from '../js/jeuvie.js';
import { depenses } from '../js/vie.js';

const partie = profil => ({ difficulte: 'realite', creeLe: Date.now() - 200 * 864e5, profil: { age: 30, logement: 'appart', ville: 'Bordeaux', modeVie: 'normal', situation: 'salarie', metier: 'Développeur', experience: 'confirme', ...profil }, banque: { solde: 100000 }, historique: [] });

test('jauges : le travail fatigue, le week-end repose, le surmenage mène au burn-out', () => {
  const j = B.nouvellesJauges(0);
  const ctx = { travaille: true, secteur: 'BTP', heuresSup: 8, weekend: false };
  for (let i = 0; i < 5; i++) B.unJour(j, ctx, () => 0.9);
  assert.ok(j.energie < 75);
  const e = j.energie;
  B.unJour(j, { ...ctx, weekend: true }, () => 0.9);
  assert.ok(j.energie > e);
  j.stress = 95;
  let burnout = false;
  for (let i = 0; i < 20 && !burnout; i++) { j.stress = 95; burnout = B.unJour(j, { travaille: true, secteur: 'Droit', heuresSup: 8 }, () => 0.9).burnout; }
  assert.ok(burnout);
});

test('activités : effet, coût, effet réduit si répétée, congés pour les vacances', () => {
  const j = B.nouvellesJauges(0);
  j.stress = 60;
  const a = B.ACTIVITES.find(x => x.id === 'spa');
  const r = B.faireActivite(j, a, 1e9, { solde: 1000 });
  assert.equal(r.cout, 90);
  assert.equal(j.stress, 45);
  const r2 = B.faireActivite(j, a, 1e9 + 864e5, { solde: 1000 });
  assert.ok(r2.moitie);
  const v = B.ACTIVITES.find(x => x.id === 'vacances');
  assert.ok(B.faireActivite(j, v, 2e9, { solde: 5000, conges: 2 }).erreur);
});

test('jauges dans la partie : un mois passe, une activité coûte et repose', () => {
  const p = partie({});
  carriereDe(p);
  p.jauges = B.nouvellesJauges(Date.now() - 30 * 864e5);
  const solde = p.banque.solde;
  avancerJauges(p, Date.now(), { patrimoine: 100000 });
  assert.ok(Date.now() - p.jauges.maj < 864e5);
  const r = faireActivite(p, 'resto');
  assert.ok(!r.erreur);
  assert.ok(p.banque.solde < solde);
});

test('crédit immobilier : mensualité, taux d\'effort, propriétaire', () => {
  assert.ok(Math.abs(I.mensualite(200000, 0.033, 240) - 1139.6) < 1);
  assert.ok(Math.abs(I.capitalRestant(200000, 0.033, 240, 240)) < 1e-6);
  const p = partie({});
  const s = simulationAchat(p, 'appart', 40000);
  assert.ok(s.prix > 150000 && s.prix < 260000);
  assert.ok(!s.refus, s.refus);
  assert.ok(acheterLogement(p, 'appart', 40000).ok);
  assert.ok(p.profil.proprietaire);
  const noms = depenses(p.profil, 6).map(d => d.nom);
  assert.ok(noms.includes('Crédit immobilier') && !noms.includes('Loyer'));
  assert.ok(valeurBiens(p) > 0);
  assert.ok(demenager(p, 'Lyon', 'appart').erreur);
  const solde = p.banque.solde;
  assert.ok(vendreLogement(p).ok);
  assert.ok(p.banque.solde > solde);
  const pauvre = partie({ metier: 'Caissier', experience: 'debutant' });
  assert.match(simulationAchat(pauvre, 'maison', 90000).refus || '', /35 %/);
});

test('voiture à crédit', () => {
  const p = partie({ transport: 'commun' });
  assert.ok(acheterVoiture(p, 'neuve', true).ok);
  assert.equal(p.profil.transport, 'voiture');
  assert.ok(depenses(p.profil, 6).some(d => d.nom === 'Crédit auto'));
  assert.ok(I.valeurVoiture({ type: 'neuve', prix: 27000 }, 1) < 27000 * 0.81);
});
