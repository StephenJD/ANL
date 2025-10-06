// netlify/functions/tokenStore.js
// Simple in-memory, time-limited store shared by other functions in same process

const cache = new Map(); // token → { data, expires }

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function storeFinalForm(token, formattedForm) {
  cache.set(token, { data: formattedForm, expires: Date.now() + TTL_MS });
  cleanup();
}

function retrieveFinalForm(token) {
  const entry = cache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(token);
    return null;
  }
  return entry.data;
}

function cleanup() {
  const now = Date.now();
  for (const [t, v] of cache.entries()) {
    if (v.expires < now) cache.delete(t);
  }
}

module.exports = { storeFinalForm, retrieveFinalForm };
