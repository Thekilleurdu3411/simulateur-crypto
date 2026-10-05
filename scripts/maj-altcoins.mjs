// Met à jour data/altcoins.json depuis WhatToMine (lancé chaque heure par GitHub Actions).
// Le navigateur lit ce fichier sur le même site, ce qui évite les blocages entre domaines.
import { writeFile } from 'node:fs/promises';

const VOULUS = {
  Ravencoin: 'RVN', EthereumClassic: 'ETC', Ergo: 'ERG',
  Litecoin: 'LTC', Dogecoin: 'DOGE', Monero: 'XMR', Kaspa: 'KAS'
};
const NOMS = { RVN: 'Ravencoin', ETC: 'Ethereum Classic', ERG: 'Ergo', LTC: 'Litecoin', DOGE: 'Dogecoin', XMR: 'Monero', KAS: 'Kaspa' };

async function lire(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'simulateur-crypto (jeu, mise a jour horaire)' } });
  if (!r.ok) throw new Error(url + ' : HTTP ' + r.status);
  return (await r.json()).coins;
}

const [gpu, asic] = await Promise.all([lire('https://whattomine.com/coins.json'), lire('https://whattomine.com/asic.json')]);
const tout = { ...gpu, ...asic };
const coins = {};
for (const [cle, tag] of Object.entries(VOULUS)) {
  const c = tout[cle];
  if (!c) continue;
  coins[tag] = { nom: NOMS[tag], algo: c.algorithm, blockTime: Number(c.block_time), reward: Number(c.block_reward), nethash: Number(c.nethash), btc: Number(c.exchange_rate) };
}
if (Object.keys(coins).length < 4) throw new Error('Données incomplètes, fichier non modifié');
await writeFile(new URL('../data/altcoins.json', import.meta.url), JSON.stringify({ source: 'whattomine.com (coins.json et asic.json)', maj: Date.now(), coins }, null, 2) + '\n');
console.log('altcoins.json mis à jour :', Object.keys(coins).join(', '));
