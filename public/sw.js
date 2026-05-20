// Fresh Holds service worker.
//
// Goal: render the home page meaningfully when the user is offline (e.g.
// on the bus on the way to the gym). We do this with stale-while-revalidate
// caching of the home navigation response and same-origin static assets.
// Admin, login, auth, and API routes bypass the SW entirely so we never
// serve stale auth state.
//
// The Ranking cache rotates daily (see CONTEXT.md → Caching), so a one-day
// stale offline view is acceptable.

const CACHE_VERSION = "v1";
const RUNTIME_CACHE = `fresh-holds-runtime-${CACHE_VERSION}`;
const HOME_URL = "/";

const STATIC_EXTENSION = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|webp|gif|svg|ico|json|map)$/i;

function shouldBypass(url) {
  if (url.pathname.startsWith("/admin")) return true;
  if (url.pathname.startsWith("/login")) return true;
  if (url.pathname.startsWith("/auth/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  // Next.js per-route data fetches — these depend on cookies and shouldn't
  // be served stale across auth state changes.
  if (url.pathname.startsWith("/_next/data/")) return true;
  return false;
}

function isHomeNavigation(request, url) {
  return request.mode === "navigate" && url.pathname === "/" && url.search === "";
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  return STATIC_EXTENSION.test(url.pathname);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Warm the home page so a brand-new install can still serve it offline
      // if the user closes the tab before navigating again. If the warm fetch
      // fails (offline at install time), we just skip — runtime SWR will
      // populate later.
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.add(HOME_URL);
      } catch {
        // best-effort
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  // ignoreVary so a cookie-vary'd HTML response still serves when the user
  // is offline — for this app's anonymous-friendly home, the per-cookie
  // variance is small and "show last seen" beats "show nothing".
  const cached = await cache.match(request, { ignoreVary: true });

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === "basic") {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch((error) => {
      if (cached) return cached;
      throw error;
    });

  return cached || networkPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  if (isHomeNavigation(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // For any other navigation, try the network first; fall back to the
  // cached home page if we're offline so the user lands somewhere useful.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (error) {
          const cache = await caches.open(RUNTIME_CACHE);
          const homeFallback = await cache.match(HOME_URL, { ignoreVary: true });
          if (homeFallback) return homeFallback;
          throw error;
        }
      })(),
    );
  }
});

// Allow the page to nudge a waiting SW to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
