// Service Worker: hält die App-Dateien vor, damit sie schnell und auch kurz offline startet.
// Bei jeder neuen Version VERSION erhöhen, dann lädt das iPhone die neuen Dateien.
const VERSION = 'v5';
const CACHE = 'steuer-app-' + VERSION;
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/data.js',
  './js/store.js',
  './js/files.js',
  './js/format.js',
  './js/route.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst das Netz fragen (immer die neueste Version), bei fehlender Verbindung den Zwischenspeicher nutzen.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Anfragen an andere Server (z. B. Routendienst) nicht anfassen
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    // cache: 'no-cache' fragt immer beim Server nach, ob es eine neuere Datei gibt
    fetch(event.request, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
  );
});
