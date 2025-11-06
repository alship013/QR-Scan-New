// Service Worker for QR Scanner App
const CACHE_NAME = 'qr-scanner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/favicon.png',
  '/manifest.json',
  // Libraries from CDN (will be cached when accessed)
  'https://cdnjs.cloudflare.com/ajax/libs/vue/2.7.14/vue.min.js',
  'https://unpkg.com/html5-qrcode@2.2.1/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
  'https://cdn.jsdelivr.net/npm/visibilityjs@1.2.4/visibility.js'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Don't cache API calls or dynamic content
                if (!event.request.url.includes('/api/') &&
                    !event.request.url.includes('zxing.js') &&
                    !event.request.url.includes('scanner-zxing.js') &&
                    !event.request.url.includes('camera-zxing.js')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(function() {
          // Network failed, try to serve from cache
          return caches.match(event.request);
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});