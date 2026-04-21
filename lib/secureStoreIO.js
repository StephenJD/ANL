// lib/secureStoreIO.js

const BASE_URL = "https://d1-store.anl-db.workers.dev/store";
const binCache = {};

async function cachedReadStore(key) {
  if (binCache[key]) return binCache[key];

  const store = await readStore(key);
  binCache[key] = store;
  return store;
}

async function apiRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-db-token": process.env.DB_ACCESS_TOKEN
    }
  };

  if (body !== null) {
    options.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  options.signal = controller.signal;

  const start = Date.now();

  try {
    console.log(`[secureStoreIO] Fetch start: ${method} ${url}`);

    const res = await fetch(url, options);

    const duration = Date.now() - start;
    console.log(`[secureStoreIO] Fetch complete: ${method} ${url} (${duration}ms)`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API request failed: ${res.status} ${res.statusText} - ${text}`);
    }

    return await res.json();
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[secureStoreIO] Fetch error after ${duration}ms:`, err);

    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readStore(key) {
  if (!key) throw new Error("Missing store key");

  return await apiRequest(
    "GET",
    `${BASE_URL}/${key}`
  );
}

export async function writeStore(key, data) {
  if (!key) throw new Error("Missing store key");

  return await apiRequest(
    "PUT",
    `${BASE_URL}/${key}`,
    data
  );
}

// Optional helper accessors (recommended for your app)
export function store() {
  return {
    readVisits: () => readStore(STORE_KEYS.visits),
    writeVisits: (data) => writeStore(STORE_KEYS.visits, data),

    readSessions: () => readStore(STORE_KEYS.sessions),
    writeSessions: (data) => writeStore(STORE_KEYS.sessions, data),

    readHelpers: () => readStore(STORE_KEYS.helpers),
    writeHelpers: (data) => writeStore(STORE_KEYS.helpers, data),

    readTokens: () => readStore(STORE_KEYS.tokens),
    writeTokens: (data) => writeStore(STORE_KEYS.tokens, data),

    readUsers: () => readStore(STORE_KEYS.users),
    writeUsers: (data) => writeStore(STORE_KEYS.users, data),

    readPermitted: () => readStore(STORE_KEYS.permitted),
    writePermitted: (data) => writeStore(STORE_KEYS.permitted, data)
  };
}