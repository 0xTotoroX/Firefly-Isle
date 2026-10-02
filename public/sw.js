const CACHE_VERSION = 'firefly-pwa-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const APP_SHELL_URL = '/'

const CORE_ASSETS = [
  APP_SHELL_URL,
  '/manifest.webmanifest',
  '/icons/firefly-pwa-192.png',
  '/icons/firefly-pwa-512.png',
  '/icons/firefly-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/logo-island-lighthouse.ico',
]

const STATIC_PATH_PREFIXES = [
  '/assets/',
  '/icons/',
  '/login/',
]

const STATIC_EXACT_PATHS = new Set([
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/logo-island-lighthouse.ico',
  '/logo-island-lighthouse.png',
  '/logo-island-lighthouse.svg',
  '/logo-island-lighthouse.webp',
])

const SENSITIVE_SAME_ORIGIN_PREFIXES = [
  '/api/',
]

const SENSITIVE_REMOTE_HOST_SUFFIXES = [
  'supabase.ghibli1024.com',
  '.supabase.co',
  '.functions.supabase.co',
]

function isSensitiveRequestUrl(rawUrl) {
  const url = new URL(rawUrl)

  if (SENSITIVE_REMOTE_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))) {
    return true
  }

  if (url.origin !== self.location.origin) {
    return false
  }

  return SENSITIVE_SAME_ORIGIN_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

function isCacheableStaticRequest(request) {
  if (request.method !== 'GET') {
    return false
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return false
  }

  return STATIC_EXACT_PATHS.has(url.pathname) || STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

async function deleteOldCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.filter((name) => name.startsWith('firefly-pwa-') && name !== STATIC_CACHE).map((name) => caches.delete(name)))
}

async function cacheCoreAssets() {
  const cache = await caches.open(STATIC_CACHE)
  await cache.addAll(CORE_ASSETS)
}

function canCacheResponse(response) {
  return response && response.ok && response.type === 'basic'
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (canCacheResponse(response)) {
        cache.put(request, response.clone())
      }

      return response
    })
    .catch(() => cached)

  return cached ?? network
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)

    if (canCacheResponse(response)) {
      const cache = await caches.open(STATIC_CACHE)
      await cache.put(APP_SHELL_URL, response.clone())
    }

    return response
  } catch {
    const cache = await caches.open(STATIC_CACHE)
    const cachedShell = await cache.match(APP_SHELL_URL)

    if (cachedShell) {
      return cachedShell
    }

    return new Response('Firefly Isle is offline. Reconnect and try again.', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      status: 503,
    })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheCoreAssets().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET' || isSensitiveRequestUrl(request.url)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (isCacheableStaticRequest(request)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
