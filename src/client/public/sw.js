// Hestia offline shell. Static assets: cache-first. GET /api/*: network-first with
// a cached fallback (so the last plan + check-offs load offline). Writes (POST) go
// straight to the network; the app's localStorage outbox handles offline taps.
const CACHE = 'hestia-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return r
        })
        .catch(() => caches.match(e.request)),
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request)
          .then((resp) => {
            const copy = resp.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
            return resp
          })
          .catch(() => caches.match('/index.html')),
    ),
  )
})
