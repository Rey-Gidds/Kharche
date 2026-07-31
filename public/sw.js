self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Minimal fetch handler to satisfy PWA installation requirements
  // No caching is performed to ensure new updates are reflected immediately
});

// ── Web Push ──────────────────────────────────────────────────────────────────

self.addEventListener('push', (e) => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    console.error('[SW] push: failed to parse payload', e.data.text());
    return;
  }

  const {
    title = 'Kharche',
    body = '',
    icon = '/logo.png',
    badge = '/logo.png',
    tag,
    data = {},
    timestamp,
  } = payload;

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,           // browser deduplication: same tag replaces existing notification
      data,
      timestamp,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  const targetUrl = e.notification.data?.url || '/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to focus an existing window already on that URL
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
