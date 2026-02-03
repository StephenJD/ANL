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

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API request failed: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}