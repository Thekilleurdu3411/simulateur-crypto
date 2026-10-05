// Service worker : met l'appli en cache pour qu'elle s'ouvre comme une vraie appli.
// Les données de marché ne sont jamais mises en cache : elles doivent rester réelles.
const CACHE = 'simcrypto-v0.13.0';
const FICHIERS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/main.js', './js/config.js', './js/market.js', './js/engine.js', './js/state.js',
  './js/views.js', './js/chart.js', './js/format.js', './js/orders.js', './js/portefeuille.js', './js/suivi.js', './js/minage.js', './js/jeuminage.js', './js/views-minage.js', './js/donnees.js', './js/altcoins.js', './js/futures.js', './js/jeufutures.js', './js/marchefutures.js', './js/views-futures.js', './js/fiscalite.js', './js/jeufisc.js', './js/views-fisc.js', './js/vie.js', './js/jeuvie.js', './js/views-vie.js', './js/views-reglages.js', './js/horloge.js', './js/notifs.js',
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

// Toucher une notification ramène dans l'appli.
self.addEventListener('notificationclick', ev => {
  ev.notification.close();
  ev.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
    const c = cl.find(x => 'focus' in x);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
