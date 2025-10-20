// netlify/functions/checkAllowableUserRequest.js
const { readStore } = require("./multiSecureStore");
const USER_ACCESS_BIN = process.env.USER_ACCESS_BIN;

function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, formTitle } = JSON.parse(event.body || "{}");
    if (!email || !formTitle) {
      return { statusCode: 400, body: JSON.stringify({ allowed: false, error: "Missing email or formTitle" }) };
    }

const bin = await readStore(USER_ACCESS_BIN);
const key = urlize(formTitle);

// Debug: log stored keys
console.log("[DEBUG] Available form keys in store:", Object.keys(bin));
console.log(`[DEBUG] Looking for key: "${key}"`);

const formRecord = bin[key];
if (!formRecord || !Array.isArray(formRecord)) {
  console.log(`[DEBUG] No permitted_users found for key: "${key}"`);
  return { statusCode: 200, body: JSON.stringify({ allowed: false }) };
}

// Debug: log permitted emails
const permittedEmails = formRecord.map(u => u.email?.toLowerCase() || "<no-email>");
console.log(`[DEBUG] Permitted emails for "${key}":`, permittedEmails);
console.log(`[DEBUG] Checking requested email:`, email.toLowerCase());

const allowed = permittedEmails.includes(email.toLowerCase());

    return { statusCode: 200, body: JSON.stringify({ allowed }) };
  } catch (err) {
    console.error("[ERROR] checkAllowableUserRequest failed:", err);
    return { statusCode: 500, body: JSON.stringify({ allowed: false, error: err.message }) };
  }
};

