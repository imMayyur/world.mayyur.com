// Shared in-memory cache for the live-data API routes.
//
// Keeping it in one module means the admin panel can clear it, forcing the next
// request to re-fetch fresh data from the World Bank / FX upstreams.
//
// Note: this cache is per server instance. On serverless platforms each
// function instance has its own copy, so "clear cache" affects the instance
// that handles the request. For a guaranteed global refresh, use the
// build-time data scripts or a redeploy (see the admin panel).

const store = new Map();

export function cacheGet(key, ttlMs) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data;
  return null;
}

export function cacheSet(key, data) {
  store.set(key, { at: Date.now(), data });
}

export function cacheClear(prefix) {
  if (!prefix) {
    const n = store.size;
    store.clear();
    return n;
  }
  let n = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      n++;
    }
  }
  return n;
}

export function cacheStats() {
  return { entries: store.size, keys: [...store.keys()] };
}
