import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../js/carriere.js';
import { carriereDe, moisCarriere, commencerFormation, demanderAugmentation, changerSituation } from '../js/jeuvie.js';
import { salaireNet, prestations, MOIS } from '../js/vie.js';

const partie = profil => ({ difficulte: 'realite', creeLe: Date.now(), profil: { age: 30, logement: 'appart', ville: 'Bordeaux', modeVie: 'normal', ...profil }, banque: { solde: 200000 }, historique: [] });

test('diplômes exigés et niveaux', () => {
  assert.equal(C.exigence('Radiologue libéral'), 'specialiste');
  assert.equal(C.exigence('Caissier'), 'aucun');
  assert.equal(C.exigence('Électricien'), 'cap');
  assert.ok(C.possede(['bac', 'medecin', 'specialiste'], 'medecin'));
  assert.ok(C.possede(['ingenieur'], 'bac+3'));
  assert.ok(!C.possede(['bac'], 'bac+2'));
  assert.deepEqual(C.diplomesDeDepart({ situation: 'salarie', metier: 'Infirmier' }).sort(), ['bac', 'bac+3', 'infirmier'].sort());
  assert.ok(C.debouches(C.formation('ifsi'), ['bac']).includes('Infirmier'));
});

test('changer de métier sans le diplôme : refusé, avec la formation à suivre', () => {
  const p = partie({ situation: 'salarie', metier: 'Caissier', experience: 'confirme' });
  const r = changerSituation(p, 'salarie', 'Pilote de ligne', 'experimente');
  assert.match(r.erreur, /pilote de ligne/i);
  assert.match(r.erreur, /ATPL/);
});

test('formation à temps plein : diplôme puis embauche dans le métier visé', () => {
  const p = partie({ situation: 'salarie', metier: 'Caissier' });
  carriereDe(p);
  const r = commencerFormation(p, 'ifsi', 'plein', 'Infirmier');
  assert.ok(r.ok, r.erreur);
  assert.equal(p.profil.situation, 'etudiant');
  assert.ok(p.banque.solde < 200000);
  const fin = p.carriere.formation.fin;
  const m = moisCarriere(p, fin + 1000, () => 0.99);
  assert.ok(m.evts.some(x => x.includes('Diplôme obtenu')));
  assert.equal(p.profil.situation, 'salarie');
  assert.equal(p.profil.metier, 'Infirmier');
  assert.ok(p.profil.diplomes.includes('infirmier'));
});

test('licenciement : indemnité et chômage, puis fin des droits', () => {
  const p = partie({ situation: 'salarie', metier: 'Électricien', experience: 'confirme' });
  const c = carriereDe(p);
  c.debutPoste = Date.now() - 6 * C.ANS;
  const m = moisCarriere(p, Date.now(), () => 0); // tous les événements se déclenchent, licenciement compris
  assert.equal(p.profil.situation, 'sans');
  assert.ok(m.evts.some(x => x.includes('Indemnité de licenciement')));
  assert.ok(m.ajustement > 0);
  assert.ok(Math.abs(C.indemniteLicenciement(2000, 6) - 3000) < 1e-9);
  assert.equal(prestations(p.profil)[0].nom, 'Allocation chômage (ARE)');
  moisCarriere(p, Date.now() + 19 * MOIS, () => 0.999);
  assert.equal(p.profil.are, undefined);
});

test('progression : confirmé après 3 ans, entretien annuel, augmentation demandée', () => {
  const p = partie({ situation: 'salarie', metier: 'Développeur', experience: 'debutant' });
  const c = carriereDe(p);
  const avant = salaireNet(p.profil);
  c.debutPoste = Date.now() - 3.1 * C.ANS; c.prochaineRevue = Date.now() - 1000;
  moisCarriere(p, Date.now(), () => 0.999);
  assert.equal(p.profil.experience, 'confirme');
  assert.ok(p.profil.majoration > 1);
  assert.ok(salaireNet(p.profil) > avant);
  const r = demanderAugmentation(p, () => 0.1);
  assert.equal(r.ok, true);
  assert.ok(demanderAugmentation(p, () => 0.1).erreur);
});
