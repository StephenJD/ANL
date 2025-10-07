// netlify/functions/tokenStore.js
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BIN_ID = '68e43a3343b1c97be95cd728';
const API_KEY = '$2a$10$YwW//q5MO8157tszJVX53.pQXPzZn50nL6dmi4dWGEt56nmwFl4PS';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Helper for JSONBin API
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

// Read bin contents
async function readStore() {
  try {
    const data = await apiRequest('GET', `https://api.jsonbin.io/v3/b/${BIN_ID}`);
    return data.record || {};
  } catch (err) {
    console.error('Error reading store:', err);
    return {};
  }
}

// Write bin contents (disable versioning)
async function writeStore(store) {
  try {
    await apiRequest('PUT', `https://api.jsonbin.io/v3/b/${BIN_ID}?versioning=false`, store);
  } catch (err) {
    console.error('Error writing store:', err);
  }
}

// Store a short-lived form
async function storeFinalForm(token, formattedForm) {
  const store = await readStore();
  store[token] = { data: formattedForm, expires: Date.now() + TTL_MS };
  await writeStore(store);
}

// Retrieve a stored form
async function retrieveFinalForm(token) {
  const store = await readStore();
  const entry = store[token];
  if (!entry || Date.now() > entry.expires) return null;
  return entry.data;
}

module.exports = { storeFinalForm, retrieveFinalForm };
