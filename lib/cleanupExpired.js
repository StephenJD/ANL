// lib/cleanupExpired.js

import { readStore, writeStore } from "./secureStoreIO.js";

export async function cleanupExpired(BIN_ID) {
  const now = Date.now();
  const currentStore = await readStore(BIN_ID);
  let changed = false;

  for (const key of Object.keys(currentStore)) {
    const entry = currentStore[key];

    if (entry?.expires && entry.expires <= now) {
      delete currentStore[key];
      changed = true;
    }
  }

  if (changed) {
    await writeStore(BIN_ID, currentStore);
  }

  return currentStore;
}
