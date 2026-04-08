const CACHE_NAME = 'eevee-companion-v2';
const APP_SHELL = ['/', '/manifest.json', '/icons/icon.svg', '/icons/icon-maskable.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(networkFirst(event.request, '/'));
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function networkFirst(request, fallbackPath) {
  try {
    const response = await fetch(request);
    cacheResponse(request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(fallbackPath);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  cacheResponse(request, response);
  return response;
}

function cacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return;
  }

  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, clone).catch(() => {});
  });
}
