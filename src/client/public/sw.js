// Hestia offline shell.
//  - Navigations (HTML) + GET /api/*: network-first, cached fallback. So a new
//    deploy and fresh data always show when online, but the last plan + shell
//    still load through a wifi blip.
//  - Hashed static assets (/assets/*): cache-first (names change per build, so
//    this is always safe).
//  - Writes (POST) bypass the SW; the app's localStorage outbox handles offline.
const CACHE = 'hestia-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  const accept = e.request.headers.get('accept') || ''
  const isNav = e.request.mode === 'navigate' || accept.includes('text/html')

  if (url.pathname.startsWith('/api/') || isNav) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return r
        })
        .catch(() => caches.match(e.request).then((m) => m || caches.match('/index.html'))),
    )
    return
  }

  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return resp
        }),
    ),
  )
})
