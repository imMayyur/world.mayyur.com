/* Atlas service worker — conservative offline support.
 * - Never caches /api/ or /admin (dynamic/private).
 * - Network-first for navigations (so content stays fresh), falling back to
 *   cache when offline — lets recently-viewed country pages work offline.
 * - Cache-first for static build assets and flags.
 */
const CACHE = "atlas-v1";
const STATIC_HOSTS = ["flagcdn.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API or admin.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    STATIC_HOSTS.includes(url.hostname) ||
    /\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  // Navigations & same-origin docs: network-first, fall back to cache.
  if (request.mode === "navigate" || url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const hit = await cache.match(request);
          return hit || cache.match("/");
        }
      })(),
    );
  }
});
