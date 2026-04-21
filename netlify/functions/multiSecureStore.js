import { readStore, writeStore } from "../../lib/secureStoreIO.js";

const binCache = {};

async function cachedReadStore(key) {
  if (binCache[key]) return binCache[key];
  const store = await readStore(key);
  binCache[key] = store;
  return store;
}

export async function setSecureItem(key, token, value, ttl = null) {
  const store = await cachedReadStore(key);

  let newValue = value;

  if (ttl !== null && typeof value === "object") {
    newValue = { ...value, expires: Date.now() + ttl };
  }

  store[token] = newValue;

  await writeStore(key, store);
  binCache[key] = store;
}

export async function getSecureItem(key, token) {
  const store = await cachedReadStore(key);

  const entry = store[token];
  if (!entry) return null;

  const now = Date.now();

  if (typeof entry === "object" && entry.expires && now > entry.expires) {
    delete store[token];
    await writeStore(key, store);
    binCache[key] = store;
    return null;
  }

  return entry;
}

export function resetSecureStoreCache() {
  Object.keys(binCache).forEach(k => delete binCache[k]);
}

export async function deleteRecords(BIN_KEY, tokens = []) {
  const store = await cachedReadStore(BIN_KEY);
  let changed = false;

  for (const token of tokens) {
    if (store[token]) {
      delete store[token];
      changed = true;
    }
  }

  if (changed) {
    await writeStore(BIN_KEY, store);
    binCache[BIN_KEY] = store;
  }

  return { success: true, deleted: tokens.length };
}