// Service worker : met l'appli en cache pour qu'elle s'ouvre comme une vraie appli.
// Les données de marché ne sont jamais mises en cache : elles doivent rester réelles.
const CACHE = 'simcrypto-v0.3.0';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/config.js', './js/market.js', './js/engine.js', './js/state.js',
  './js/views.js', './js/chart.js', './js/format.js', './js/orders.js', './js/portefeuille.js', './js/suivi.js', './js/minage.js', './js/jeuminage.js', './js/views-minage.js', './js/donnees.js',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Fichiers de l'appli : réseau d'abord (pour récupérer les mises à jour), cache si hors ligne.
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== self.location.origin) return;
  ev.respondWith(
    fetch(ev.request)
      .then(rep => { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(ev.request, copie)); return rep; })
      .catch(() => caches.match(ev.request).then(r => r || caches.match('./index.html')))
  );
});
