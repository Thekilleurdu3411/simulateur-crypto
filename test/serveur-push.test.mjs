import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, generateKeyPairSync, createVerify } from 'node:crypto';
import { nettoyer, franchies, verifier, CLE } from '../serveur-push/logique.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const bougies = (haut, bas) => [[0, '100', String(haut), String(bas), '100', '1']];
const reponse = (data, status = 200) => ({ ok: status < 300, status, json: async () => data });

test('nettoyer : alertes mal formées rejetées', () => {
  const a = nettoyer([{ id: 'o1', s: 'BTCEUR', sens: 'bas', prix: 90000, texte: 'x' }, { s: 'btc', sens: 'bas', prix: 1, texte: 'x' }, { s: 'ETHEUR', sens: 'milieu', prix: 1, texte: 'x' }, null]);
  assert.equal(a.length, 1);
  assert.equal(a[0].groupe, 'o1');
  assert.deepEqual(nettoyer('n'), []);
});

test('franchies : plus haut et plus bas des bougies, décalage du rejeu', async () => {
  const urls = [];
  const f = async u => { urls.push(u); return reponse(bougies(105000, 95000)); };
  const ab = { decalage: 864e5, maj: Date.now() - 60000, alertes: [
    { id: 'a', groupe: 'a', s: 'BTCEUR', sens: 'bas', prix: 96000, texte: 'achat' },
    { id: 'b', groupe: 'b', s: 'BTCEUR', sens: 'haut', prix: 110000, texte: 'vente' }] };
  const r = await franchies(ab, Date.now(), f);
  assert.deepEqual(r.map(x => x.id), ['a']);
  assert.equal(urls.length, 1); // une seule requête par symbole
  const fin = Number(urls[0].match(/endTime=(\d+)/)[1]);
  assert.ok(Math.abs(Date.now() - 864e5 - fin) < 5000);
});

test('verifier : notification envoyée par Firebase, alerte (et son groupe) retirée', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = { project_id: 'proof', client_email: 'x@proof.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const stock = { [CLE]: JSON.stringify({ tok_0123456789abcdefghij: { decalage: 0, maj: Date.now() - 60000, alertes: [
    { id: 'o1-l', groupe: 'o1', s: 'BTCEUR', sens: 'bas', prix: 96000, texte: 'OCO : jambe limite' },
    { id: 'o1-s', groupe: 'o1', s: 'BTCEUR', sens: 'haut', prix: 120000, texte: 'OCO : stop' },
    { id: 'p1', groupe: 'p1', s: 'ETHEUR', sens: 'bas', prix: 1000, texte: 'liquidation' }] } }) };
  const env = { FIREBASE_SA: JSON.stringify(sa), ABONNES: { get: async k => stock[k] ?? null, put: async (k, v) => { stock[k] = v; } } };
  const envois = [];
  const f = async (u, o) => {
    if (u.includes('klines')) return reponse(u.includes('BTCEUR') ? bougies(100000, 95000) : bougies(4000, 3500));
    if (u.includes('oauth2')) {
      const jwt = new URLSearchParams(o.body).get('assertion').split('.');
      const v = createVerify('RSA-SHA256'); v.update(jwt[0] + '.' + jwt[1]);
      assert.ok(v.verify(publicKey, Buffer.from(jwt[2], 'base64url')));
      return reponse({ access_token: 'acces', expires_in: 3600 });
    }
    if (u.includes('fcm.googleapis.com')) { envois.push(JSON.parse(o.body)); assert.equal(o.headers.Authorization, 'Bearer acces'); return reponse({ name: 'ok' }); }
    return reponse({}, 404);
  };
  await verifier(env, f);
  assert.equal(envois.length, 1);
  assert.match(envois[0].message.notification.body, /jambe limite/);
  const reste = JSON.parse(stock[CLE]).tok_0123456789abcdefghij.alertes;
  assert.deepEqual(reste.map(a => a.id), ['p1']);
});

test('alertes de la partie : ordres limite, stop, OCO et positions à levier', async () => {
  const { alertesDe } = await import('../js/push.js');
  const partie = {
    plateforme: { ordres: [
      { id: 'a', s: 'BTCEUR', base: 'BTC', sens: 'achat', type: 'limite', qte: 0.01, prix: 90000 },
      { id: 'b', s: 'ETHEUR', base: 'ETH', sens: 'vente', type: 'oco', qte: 1, prix: 4500, stop: 3500, limiteStop: 3450, declenche: false },
      { id: 'c', s: 'BTCEUR', base: 'BTC', sens: 'vente', type: 'stop', qte: 0.01, stop: 80000, limiteStop: 79000, declenche: true }
    ] },
    futures: { positions: [{ id: 'p', s: 'BTCUSDT', sens: 'long', levier: 10, entree: 100000, liquidation: 90500, qte: 0.1, marge: 1000 }] }
  };
  const a = alertesDe(partie);
  const v = id => a.find(x => x.id === id);
  assert.deepEqual([v('oal').sens, v('oal').prix], ['bas', 90000]);
  assert.deepEqual([v('obl').sens, v('obs').sens, v('obs').prix, v('obl').groupe === v('obs').groupe], ['haut', 'bas', 3500, true]);
  assert.deepEqual([v('ocd').sens, v('ocd').prix], ['haut', 79000]);
  assert.equal(v('ppl').prix, 90500);
  assert.ok(Math.abs(v('ppa').prix - 92400) < 1e-6);
});
