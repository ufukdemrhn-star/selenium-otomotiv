// ============================================================
// sw.js v22 — Service Worker
// Statik dosyaları cache'ler, Firebase verilerini cache'lemez.
// ============================================================

const CACHE_VERSION = 'selenium-v22';
const CACHE_NAME = `selenium-cache-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=22',
  './js/app.js?v=22',
  './js/auth.js?v=15',
  './js/firebase.js?v=15',
  './js/firebase-config.js',
  './js/wizard.js?v=15',
  './js/vehicle-list.js?v=15',
  './js/vehicle-detail.js?v=15',
  './js/vehicles-db.js?v=15',
  './js/photo-gallery.js?v=15',
  './js/photo-utils.js?v=15',
  './js/damage-diagram.js?v=15',
  './js/damage-showcase.js?v=22',
  './js/expenses-section.js?v=15',
  './js/sell-modal.js?v=15',
  './js/ui-dialogs.js?v=15',
  './js/brands-db.js?v=15',
  './js/vehicle-search.js?v=15',
  './js/form-components.js?v=15',
  './js/home-stats.js?v=17',
  './js/theme-manager.js?v=17',
  './js/profile.js?v=20',
  './js/board.js?v=19',
  './js/auction-calc.js?v=21',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './images/showcase/background.jpg?v=22',
  './images/showcase/kaput.png?v=22',
  './images/showcase/tavan.png?v=22',
  './images/showcase/on-tampon.png?v=22',
  './images/showcase/arka-tampon.png?v=22',
  './images/showcase/bagaj.png?v=22',
  './images/showcase/sol-on-camurluk.png?v=22',
  './images/showcase/sag-on-camurluk.png?v=22',
  './images/showcase/sol-arka-camurluk.png?v=22',
  './images/showcase/sag-arka-camurluk.png?v=22',
  './images/showcase/sol-on-kapi.png?v=22',
  './images/showcase/sag-on-kapi.png?v=22',
  './images/showcase/sol-arka-kapi.png?v=22',
  './images/showcase/sag-arka-kapi.png?v=22'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Install v22');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Cache eklenemedi:', url, err.message);
          })
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v22');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('selenium-cache-') && k !== CACHE_NAME)
            .map(k => {
              console.log('[SW] Eski cache silindi:', k);
              return caches.delete(k);
            })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Firebase API'lerini cache'leme
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    (url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com'))
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] selenium-v22 yüklendi');
