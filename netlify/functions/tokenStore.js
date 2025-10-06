// netlify/functions/tokenStore.js
const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "finalForms.json");
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function readStore() {
  try {
    const data = fs.readFileSync(FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return {}; // empty store if file doesn't exist
  }
}

function writeStore(store) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(store), "utf8");
}

// Clean up expired entries
function cleanup(store) {
  const now = Date.now();
  for (const token in store) {
    if (store[token].expires < now) delete store[token];
  }
}

// Store a form
function storeFinalForm(token, formattedForm) {
  const store = readStore();
  store[token] = { data: formattedForm, expires: Date.now() + TTL_MS };
  cleanup(store);
  writeStore(store);
}

// Retrieve a form
function retrieveFinalForm(token) {
  const store = readStore();
  const entry = store[token];
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    delete store[token];
    writeStore(store);
    return null;
  }
  return entry.data;
}

module.exports = { storeFinalForm, retrieveFinalForm };
