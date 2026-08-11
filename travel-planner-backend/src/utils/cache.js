// Tiny in-memory promise cache. Caches the in-flight promise (not just the
// resolved value) so concurrent callers for the same key share one request
// instead of firing duplicates, and failures aren't cached (so a transient
// error, e.g. a rate limit, doesn't get "stuck" for the whole TTL).
const store = new Map();

export const cached = (key, ttlMs, fn) => {
  const entry = store.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    return entry.promise;
  }

  const promise = fn().catch((error) => {
    store.delete(key);
    throw error;
  });

  store.set(key, { promise, expiresAt: Date.now() + ttlMs });

  return promise;
};
