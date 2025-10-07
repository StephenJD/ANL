// netlify/functions/tokenStore.js
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const BIN_ID = '68e43a3343b1c97be95cd728 '; // Replace with your actual bin ID
const API_KEY = '$2a$10$YwW//q5MO8157tszJVX53.pQXPzZn50nL6dmi4dWGEt56nmwFl4PS'; // Replace with your actual master key
const TTL_MS = 10 * 60 * 1000; // 10 minutes

// Helper function to make API requests
const apiRequest = async (method, url, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : null,
  };
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
};

// Store form data in JSONBin
const storeFinalForm = async (token, formattedForm) => {
  const store = await readStore();
  store[token] = { data: formattedForm, expires: Date.now() + TTL_MS };
  await writeStore(store);
};

// Retrieve form data from JSONBin
const retrieveFinalForm = async (token) => {
  const store = await readStore();
  const entry = store[token];
  if (!entry || Date.now() > entry.expires) {
    return null;
  }
  return entry.data;
};

// Read the current store from JSONBin
const readStore = async () => {
  try {
    const data = await apiRequest('GET', `https://api.jsonbin.io/v3/b/${BIN_ID}`);
    return data.record || {};
  } catch (error) {
    console.error('Error reading store:', error);
    return {};
  }
};

// Write the updated store to JSONBin
const writeStore = async (store) => {
  try {
    await apiRequest('PUT', `https://api.jsonbin.io/v3/b/${BIN_ID}`, { record: store });
  } catch (error) {
    console.error('Error writing store:', error);
  }
};

module.exports = { storeFinalForm, retrieveFinalForm };
