// Server-Side: /netlify/functions/secureStore.js
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BIN_ID = '68e43a3343b1c97be95cd728';
const API_KEY = '$2a$10$Hl3M2PrOLZHxxqzxAgUzSOlGAKoGI2Zd/JtcIucdBCCxVV4aefriW';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

async function apiRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': API_KEY,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

async function readStore() {
  try {
    const data = await apiRequest('GET', `https://api.jsonbin.io/v3/b/${BIN_ID}`);
    return data.record || {};
  } catch (err) {
    console.error('Error reading store:', err);
    return {};
  }
}

async function writeStore(store) {
  try {
    await apiRequest('PUT', `https://api.jsonbin.io/v3/b/${BIN_ID}?versioning=false`, store);
  } catch (err) {
    console.error('Error writing store:', err);
  }
}

// --- General secure storage ---
async function setSecureItem(token, value, ttl = null) {
  const store = await cleanupExpired(); // clean expired tokens first
  const entry = { ...value };
  if (ttl !== null) entry.expires = Date.now() + ttl;
  store[token] = entry;
  await writeStore(store);
}

async function getSecureItem(token) {
  const store = await cleanupExpired(); // clean expired tokens first
  const entry = store[token];
  if (!entry) return null;
  if (entry.expires && Date.now() > entry.expires) return null;
  return entry;
}

async function cleanupExpired() {
  const now = Date.now();
  const currentStore = await readStore();
  let changed = false;

  Object.keys(currentStore).forEach((key) => {
    if (currentStore[key].expires && currentStore[key].expires <= now) {
      delete currentStore[key];
      changed = true;
    }
  });

  if (changed) {
    await writeStore(currentStore);
  }

  return currentStore;
}

module.exports = { setSecureItem, getSecureItem, readStore, cleanupExpired };
