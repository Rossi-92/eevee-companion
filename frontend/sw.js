self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const APP_SHELL = ['/', '/manifest.json', '/icons/icon.svg', '/icons/icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('eevee-companion-v1').then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            const clone = response.clone();
            caches.open('eevee-companion-v1').then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
            return response;
          })
          .catch(() => caches.match('/')),
    ),
  );
});
