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

const VERSION = 'sahn-v2';
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

  /**
   * Navigations only. Everything else - scripts, stylesheets, RSC payloads,
   * fonts - goes straight to the network untouched.
   *
   * The first version of this handled every same-origin GET and fell back to
   * cached HTML whenever the network failed. That is fine for a page and
   * catastrophic for a chunk: after a deploy the old chunk URLs 404, the
   * worker answered with an HTML document, and the browser tried to parse a
   * page as JavaScript. The site then appeared broken for exactly the people
   * who had visited before, which is the worst possible group to break for,
   * and it looked fine to anyone testing in a fresh browser.
   *
   * Static assets need no help from us in any case: they are content-hashed
   * and already immutable at the CDN.
   */
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(PAGES).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        // A cached copy of this same page, or the offline-capable prayer page.
        // Never a different document type: both of these are HTML, and the
        // request that got here is a navigation.
        const cached =
          (await caches.match(request)) ?? (await caches.match('/en/prayer'));
        if (cached) return cached;
        return new Response('Offline', {
          status: 503,
          headers: { 'content-type': 'text/html; charset=utf-8' }
        });
      })
  );
});
