// ============================================================
// sw.js — Service Worker (Faz 10)
// Statik dosyaları cache'ler, internet yoksa ön bellekten servis eder.
// Firebase API çağrılarını cache'lemez (her zaman canlı veri).
// ============================================================

const CACHE_VERSION = 'selenium-v20';
const CACHE_NAME = `selenium-cache-${CACHE_VERSION}`;

// İlk yüklemede pre-cache yapılacak statik dosyalar
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css?v=20',
  './js/app.js?v=20',
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
  './js/damage-showcase.js?v=15',
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
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// İnstall: cache'i hazırla
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Tek tek ekle (biri başarısız olsa diğerleri devam etsin)
        return Promise.all(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => {
              console.warn('[SW] Cache eklenemedi:', url, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
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

// Fetch: Network-first, cache-fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Sadece GET istekleri için cache
  if (event.request.method !== 'GET') return;

  // Firebase / Firestore / gstatic API'lerini cache'leme - her zaman canlı
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('googleapis.com') && !url.hostname.includes('fonts.googleapis.com')
  ) {
    return; // Browser default fetch
  }

  // Aynı origin veya Google Fonts: network-first, cache-fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Başarılı yanıtı cache'e ekle (sadece basic veya cors-clean)
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone))
            .catch(() => {/* sessizce ignore */});
        }
        return response;
      })
      .catch(() => {
        // Network başarısız - cache'den döndür
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            // index.html için fallback (SPA route)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
      })
  );
});

// Skip waiting message (uygulama tarafından gönderilir)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] selenium-v20 yüklendi');
