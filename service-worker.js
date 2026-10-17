const APP_VERSION = 'work-tracker-v3';
const STATIC_CACHE = `${APP_VERSION}-static`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/',
  '/index.html',

  // Pages
  '/pages/dashboard/dashboard-page.html',
  '/pages/reports/reports-page.html',
  '/pages/settings/settings-page.html',
  '/pages/more-apps/more-apps-page.html',
  '/pages/offline/offline-page.html',

  // Shared styles
  '/css/main.css',

  // Page styles
  '/pages/dashboard/styles/dashboard-page.css',
  '/pages/reports/styles/reports-page.css',
  '/pages/settings/styles/settings-page.css',
  '/pages/more-apps/styles/more-apps-page.css',
  '/pages/offline/styles/offline-page.css',

  // Shared scripts and components
  '/scripts/site-config.js',
  '/scripts/storage-manager.js',
  '/scripts/ui-manager.js',
  '/scripts/wheel-time-picker.js',
  '/scripts/salary-manager.js',
  '/scripts/deductions-manager.js',
  '/scripts/attendance-manager.js',
  '/scripts/report-manager.js',
  '/scripts/service-worker-registration.js',
  '/scripts/app-bootstrap.js',
  '/components/shared/svg-icons.js',
  '/components/page-header/page-header.js',
  '/components/bottom-navigation/bottom-navigation.js',

  // Page scripts
  '/pages/dashboard/dashboard-page.js',
  '/pages/reports/reports-page.js',
  '/pages/settings/settings-page.js',
  '/pages/more-apps/more-apps-page.js',
  '/pages/offline/offline-page.js',

  '/manifest.json',
  '/assets/icons/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (event.request.url.includes('chrome-extension')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match('/pages/offline/offline-page.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            if (event.request.mode === 'navigate') {
              return caches.match('/pages/offline/offline-page.html');
            }
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(Promise.all([
      caches.delete(STATIC_CACHE),
      caches.delete(DYNAMIC_CACHE)
    ]));
  }
});
