/* AERIS Service Worker — v2 */

const CACHE_NAME = 'aeris-cache-v2';

/* Install — skip waiting immediately so new SW takes over */
self.addEventListener('install', (event) => {
  /* Do NOT pre-cache static assets during install — if any asset
     returns a non-OK response (e.g. dev server restart) the entire
     install fails and the SW never activates, breaking push.
     Instead, cache on first successful fetch. */
  self.skipWaiting();
});

/* Activate — clean old caches and claim all clients */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* Fetch — network-first strategy with cache fallback */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and API calls
  if (request.method !== 'GET' || request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

/* Push notification handling */
self.addEventListener('push', (event) => {
  console.log('[AERIS SW] Push event received');

  let data = { title: 'AERIS', body: 'Air quality update available.' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('[AERIS SW] Could not parse push data as JSON, using text:', e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'aeris-notification',
    renotify: true,
    requireInteraction: false,
    data: data.data || { url: '/' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'AERIS', options));
});

/* Notification click — open or focus the AERIS app */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing AERIS window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
