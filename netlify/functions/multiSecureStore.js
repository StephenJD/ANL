// /netlify/functions/multiSecureStore.js
import process from "process";
import { cleanupExpired } from "../../lib/cleanupExpired.js";
import { readStore, writeStore } from "../../lib/secureStoreIO.js";

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
