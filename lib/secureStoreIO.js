// lib/secureStoreIO.js

const API_KEY = process.env.JSONBIN_API_KEY;

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

async function apiRequest(method, url, body = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": API_KEY,
    },
  };
  if (body) options.body = JSON.stringify(body);

  // Add timeout (e.g., 8000ms)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
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
    return res.json();
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[secureStoreIO] Fetch error after ${duration}ms:`, err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}