import test from 'node:test';
import assert from 'node:assert/strict';
import { PERSONNALITES, SCENARIOS, fortune, publicationsDuJour } from '../js/personnalites.js';
import { socialDe, avancerSocial, repondre, publier, classement, valeurFonds } from '../js/jeusocial.js';

const prixFixes = { BTC: 90000, ETH: 3500, SOL: 180, XRP: 2, ADA: 0.8, DOGE: 0.2, AVAX: 30, LINK: 20 };
const prix = b => prixFixes[b];
const partie = () => ({ difficulte: 'realite', creeLe: Date.now() - 100 * 864e5, profil: { prenom: 'Val' }, banque: { solde: 100000 }, plateforme: { soldeEUR: 1000, actifs: { BTC: { qte: 0.1, cout: 9000 } } }, historique: [] });

test('20 personnalités fictives et des scénarios bien formés', () => {
  assert.equal(PERSONNALITES.length, 20);
  for (const sc of SCENARIOS) { assert.ok(PERSONNALITES.some(p => p.id === sc.de)); assert.ok(sc.reponses.length >= 1); }
});

test('fortune : suit le marché selon son exposition', () => {
  const hugo = PERSONNALITES.find(p => p.id === 'hugo'), paul = PERSONNALITES.find(p => p.id === 'paul');
  const double = { BTC: 2, ETH: 2, ALT: 2 };
  assert.ok(fortune(hugo, double, 0) > hugo.fortune * 1.8);
  assert.ok(Math.abs(fortune(paul, double, 0) - paul.fortune) < 1);
});

test('publications : plus nombreuses quand ça bouge', () => {
  const calme = publicationsDuJour(100, 1, 0), krach = publicationsDuJour(100, 1, -0.12);
  assert.ok(krach.length >= calme.length);
  assert.ok(krach.some(p => /−|baisse|HOLD|Soldes|Liquid|vendent|saigne|Support|Stop|or\./i.test(p.texte)));
});

test('un mois sur le réseau : fil, messages, abonnés', () => {
  const p = partie();
  socialDe(p).jour = Math.floor((Date.now() - 30 * 864e5) / 864e5);
  avancerSocial(p, Date.now(), { prix, variation: 0.06, actus: [], patrimoine: 110000, cryptos: 9000, plateforme: 10000, machines: 0 });
  const s = p.social;
  assert.ok(s.fil.length > 20);
  assert.ok(s.messages.length >= 1);
});

test('réponses : arnaque à l\'airdrop, double authentification, pronostic', () => {
  const p = partie();
  const s = socialDe(p);
  s.messages.push({ id: 'a', scenario: 'airdrop', de: 'renard', texte: '', t: Date.now(), reponses: [['airdrop-connecter', 'x']] });
  repondre(p, 'a', 'airdrop-connecter', { prix });
  assert.ok(p.plateforme.actifs.BTC.qte < 0.1);
  s.messages.push({ id: 'b', scenario: 'a2f', de: 'ines', texte: '', t: Date.now(), reponses: [['a2f-activer', 'x']] });
  repondre(p, 'b', 'a2f-activer', { prix });
  assert.equal(s.a2f, true);
  const r = publier(p, 'avis', { base: 'BTC', sens: 'hausse' }, { prix });
  assert.ok(r.gain >= 0 && s.predictions.length === 1);
  s.predictions[0].t -= 8 * 864e5;
  prixFixes.BTC = 95000;
  avancerSocial(p, Date.now() + 864e5, { prix, variation: 0, actus: [] });
  assert.ok(s.predictions[0].fini && s.reputation > 50);
});

test('classement et fonds', () => {
  const p = partie();
  const c = classement(p, prix, 50000);
  assert.equal(c.length, 21);
  assert.ok(c.find(x => x.moi));
  socialDe(p).fonds = { parts: [{ montant: 50000, t: Date.now(), btc: 90000, eth: 3500 }] };
  assert.ok(Math.abs(valeurFonds(p, prix) - 50000 * (0.5 * prixFixes.BTC / 90000 + 0.5)) < 100);
});
