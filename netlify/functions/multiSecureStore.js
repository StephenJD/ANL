// /.netlify/functions/multiSecureStore.js
import process from "process";

const API_KEY = process.env.JSONBIN_API_KEY;

async function apiRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
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

export async function readStore(BIN_ID) {
  try {
    const data = await apiRequest("GET", `https://api.jsonbin.io/v3/b/${BIN_ID}`);
    return data.record || {};
  } catch (err) {
    console.error("Error reading store:", err);
    return {};
  }
}

export async function writeStore(BIN_ID, store) {
  try {
    await apiRequest("PUT", `https://api.jsonbin.io/v3/b/${BIN_ID}?versioning=false`, store);
  } catch (err) {
    console.error("Error writing store:", err);
  }
}

export async function setSecureItem(BIN_ID, token, value, ttl = null) {
  const store = await readStore(BIN_ID);

  let newValue;
  if (Array.isArray(value)) {
    newValue = value.map(item => (ttl !== null ? { ...item, expires: Date.now() + ttl } : item));
  } else if (typeof value === "object" && value !== null) {
    newValue = ttl !== null ? { ...value, expires: Date.now() + ttl } : value;
  } else {
    newValue = value;
  }

  store[token] = newValue;
  await writeStore(BIN_ID, store);
}

export async function getSecureItem(BIN_ID, token) {
  const store = await readStore(BIN_ID);
  let entry = store[token];
  if (!entry) return null;

  const now = Date.now();

  if (Array.isArray(entry)) {
    entry = entry.filter(item => !item.expires || now <= item.expires);
    if (entry.length !== store[token].length) {
      store[token] = entry;
      await writeStore(BIN_ID, store);
    }
    return entry.length ? entry : null;
  }

  if (typeof entry === "object" && entry !== null && entry.expires && now > entry.expires) {
    await cleanupExpired(BIN_ID);
    return null;
  }

  return entry;
}

export async function cleanupExpired(BIN_ID) {
  const now = Date.now();
  const currentStore = await readStore(BIN_ID);
  let changed = false;

  Object.keys(currentStore).forEach(key => {
    if (currentStore[key].expires && currentStore[key].expires <= now) {
      delete currentStore[key];
      changed = true;
    }
  });

  if (changed) await writeStore(BIN_ID, currentStore);

  return currentStore;
}

export async function deleteRecords(BIN_ID, tokens = []) {
  const store = await cleanupExpired(BIN_ID);
  let changed = false;

  for (const token of tokens) {
    if (store[token]) {
      delete store[token];
      changed = true;
    }
  }

  if (changed) await writeStore(BIN_ID, store);
  return { success: true, deleted: tokens.length };
}
