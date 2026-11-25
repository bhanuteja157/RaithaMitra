// RaithaMitra AD-31 Service Worker (Next.js 14 Production Compatible)
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `rm-static-${CACHE_VERSION}`;
const PAGE_CACHE = `rm-pages-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL_URLS).catch(() => undefined);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('rm-') && k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSensitiveOrApiRequest(url, request) {
  if (request.method !== 'GET') return true;
  if (request.headers.has('authorization')) return true;
  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.includes('/auth') || url.pathname.includes('/otp')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (isSensitiveOrApiRequest(url, request)) return;

  // 1. Immutable versioned Next.js static assets & icons: Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 2. Application navigation: Network-first with cached page -> /offline.html fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
  }
});
