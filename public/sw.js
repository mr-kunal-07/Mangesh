const CACHE_NAME = 'sainath-seva-v4'
const APP_SHELL = ['/', '/manifest.webmanifest', '/app-icon.svg', '/pwa-icon-192.png', '/pwa-icon-512.png', '/receipt-export-template.xlsx']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isGoogleFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

  if (isGoogleFont) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })),
    )
    return
  }

  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then((cached) => {
        const networkUpdate = fetch(request).then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()))
          return response
        }).catch(() => cached)
        return cached || networkUpdate
      }),
    )
    return
  }

  const isProductionAsset = url.pathname.startsWith('/assets/')
    || url.pathname.endsWith('.png')
    || url.pathname.endsWith('.svg')
    || url.pathname.endsWith('.xlsx')
    || url.pathname.endsWith('.webmanifest')

  if (isProductionAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })),
    )
  }
})
