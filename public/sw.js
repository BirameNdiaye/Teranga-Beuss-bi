// Service worker Teranga Invit : la page invité, ses médias et le billet restent
// lisibles hors connexion une fois ouverts. Le tableau de bord n'est jamais mis en cache.
const VERSION = 'teranga-v1'
const PAGES = `${VERSION}-pages`
const ASSETS = `${VERSION}-assets`

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

const isGuestPage = (url) => /^\/i\/[^/]+(\/billet)?\/?$/.test(url.pathname)
const isAsset = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/_next/image') ||
  url.pathname.startsWith('/media/') ||
  /\.(?:woff2|svg|png|webp|ico)$/.test(url.pathname)

async function networkFirst(request) {
  const cache = await caches.open(PAGES)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // Les réponses partielles (vidéo, audio) ne sont pas mises en cache.
  if (response.ok && response.status === 200) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate' && isGuestPage(url)) event.respondWith(networkFirst(request))
  else if (isAsset(url)) event.respondWith(cacheFirst(request))
})
