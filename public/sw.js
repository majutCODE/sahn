/**
 * Service worker.
 *
 * The point is the worship tools: prayer times, Qibla and the Hijri calendar
 * are computed on the device from a stored location and need no network at
 * all. Without a worker they still fail on a dead connection, because the HTML
 * shell cannot be fetched — the maths is offline but the page is not.
 *
 * Scope is deliberately narrow. This is not a general offline mode:
 *
 *   - Chat, counsel, search and every /api route are never cached. They need
 *     the network by definition, and a stale answer to a religious question is
 *     worse than an honest failure.
 *   - Auth is never cached. A cached sign-in page holding a stale session
 *     would be a security bug, not a convenience.
 *   - Qur'an pages and recitation audio are cached only after being visited,
 *     so someone who reads a surah can read it again on the Underground.
 */

const VERSION = 'sahn-v1';
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const AUDIO = `${VERSION}-audio`;

/** Fetched at install so the offline worship tools work on first flight. */
const PRECACHE = ['/en/prayer', '/ar/prayer', '/en/calendar', '/ar/calendar'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // Individually, not addAll: addAll rejects the whole install if a single
      // URL fails, which would leave the app with no worker at all over one
      // flaky request.
      .then((cache) =>
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Paths that must always hit the network, whatever the connection is doing. */
function neverCache(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('/sign-in') ||
    url.pathname.includes('/counsel') ||
    url.pathname.includes('/c/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Recitation audio, from a third-party host. Cache-first: an ayah's audio
  // never changes, and re-downloading it on every replay is the difference
  // between usable and not on a phone.
  if (/verses\.quran\.com|quranicaudio\.com/.test(url.hostname)) {
    event.respondWith(
      caches.open(AUDIO).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        // Opaque cross-origin responses are cacheable but unreadable; storing
        // them is still worth it because the browser can replay them.
        if (response.ok || response.type === 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin || neverCache(url)) return;

  // Everything else: network first, falling back to whatever was last seen.
  // Fresh when online, still there when not — and never stale while online,
  // which matters for a product whose content is edited daily.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.mode === 'navigate') {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached =
          (await caches.match(request)) ?? (await caches.match('/en/prayer'));
        if (cached) return cached;
        return new Response('Offline', {
          status: 503,
          headers: { 'content-type': 'text/plain' }
        });
      })
  );
});
