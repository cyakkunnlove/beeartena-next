const CACHE_NAME = 'beeartena-v3';
const OFFLINE_URL = '/offline.html';
const urlsToCache = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/images/topimageafter.png',
  '/icons/icon-192x192.png',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event with network-first strategy for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const isHttpRequest = request.url.startsWith('http');

  if (!isHttpRequest) {
    return;
  }

  if (request.url.includes('/api/')) {
    // Network first for API calls
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (request.method === 'GET' && response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache).catch((error) => {
                console.warn('SW cache.put failed for API GET', error);
              });
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
            return response;
          }
          // Clone the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((error) => {
              console.warn('SW cache.put failed for asset', error);
            });
          });
          return response;
        }).catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
    );
  }
});

// Background sync for form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncForms());
  }
});

async function syncForms() {
  try {
    const cache = await caches.open('form-submissions');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Failed to sync form:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'BEE ART ENAからの新着情報',
    icon: '/images/logo-192.png',
    badge: '/images/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '詳細を見る',
      },
      {
        action: 'close',
        title: '閉じる',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('BEE ART ENA', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});