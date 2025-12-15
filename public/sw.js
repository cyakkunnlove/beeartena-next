const isLocalhost = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

if (isLocalhost) {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key).catch(() => undefined))))
        .catch(() => undefined),
    )
    self.skipWaiting()
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      Promise.all([
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key).catch(() => undefined))))
          .catch(() => undefined),
        self.registration.unregister().catch(() => undefined),
      ]).then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url))
        }),
      ),
    )
    self.clients.claim()
  })

  self.addEventListener('fetch', () => {})
  self.addEventListener('sync', () => {})
  self.addEventListener('push', () => {})
  self.addEventListener('notificationclick', () => {})
} else {
  const CACHE_NAME = 'beeartena-v6'
  const OFFLINE_URL = '/offline.html'
  const CORE_ASSETS = [
    '/',
    OFFLINE_URL,
    '/manifest.json',
    '/icons/icon-192x192.png',
  ]

  // Install event
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.addAll(CORE_ASSETS))
        .catch((error) => console.error('Failed to pre-cache core assets', error)),
    )
    self.skipWaiting()
  })

  // Activate event
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
            return undefined
          }),
        )
      }),
    )
    self.clients.claim()
  })

  // Fetch event with network-first strategy for API calls
  self.addEventListener('fetch', (event) => {
    const { request } = event

    if (!request.url.startsWith('http')) {
      return
    }

    // Always bypass SW for Next.js build assets to avoid stale caches
    if (request.url.includes('/_next/')) {
      return
    }

    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy).catch((error) => {
                console.warn('SW cache.put failed for navigation response', error)
              })
            })
            return response
          })
          .catch(async () => (await caches.match(request)) || caches.match(OFFLINE_URL)),
      )
      return
    }

    if (request.url.includes('/api/')) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (request.method === 'GET' && response && response.status === 200) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache).catch((error) => {
                  console.warn('SW cache.put failed for API GET', error)
                })
              })
            }
            return response
          })
          .catch(() => caches.match(request)),
      )
      return
    }

    if (request.method === 'GET' && request.url.startsWith(self.location.origin)) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) {
            return cached
          }
          return fetch(request)
            .then((response) => {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response
              }
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, copy).catch((error) => {
                  console.warn('SW cache.put failed for asset', error)
                })
              })
              return response
            })
            .catch(() => caches.match(OFFLINE_URL))
        }),
      )
    }
  })

  // Background sync for form submissions
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-forms') {
      event.waitUntil(syncForms())
    }
  })

  async function syncForms() {
    try {
      const cache = await caches.open('form-submissions')
      const requests = await cache.keys()

      for (const request of requests) {
        try {
          const response = await fetch(request)
          if (response.ok) {
            await cache.delete(request)
          }
        } catch (error) {
          console.error('Failed to sync form:', error)
        }
      }
    } catch (error) {
      console.error('Sync failed:', error)
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
        primaryKey: 1,
      },
      actions: [
        {
          action: 'explore',
          title: '詳細を見る',
        },
        {
          action: 'close',
          title: '閉じる',
        },
      ],
    }

    event.waitUntil(self.registration.showNotification('BEE ART ENA', options))
  })

  self.addEventListener('notificationclick', (event) => {
    event.notification.close()

    if (event.action === 'explore') {
      event.waitUntil(clients.openWindow('/'))
    }
  })
}
