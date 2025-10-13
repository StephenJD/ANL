// netlify/functions/verifyToken_ClientWrapper.js
const { retrieveFinalForm } = require("./tokenStore");
const { generateSecureToken } = require("./generateSecureToken"); // used for comparison if needed

exports.handler = async function(event) {
  console.log("[DEBUG] verifyToken_ClientWrapper invoked, method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ valid: false, error: "Method Not Allowed" }) };
  }

  let token = null;
  let formPath = null;
  try {
    const body = JSON.parse(event.body || "{}");
    token = body.token;
    formPath = body.formPath;
  } catch (err) {
    console.error("[ERROR] Invalid JSON body:", err);
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: "Invalid JSON" }) };
  }

  console.log("[DEBUG] Incoming verifyToken request:", { tokenSnippet: token ? token.slice(0,12)+"..." : null, formPath });

  if (!token || !formPath) {
    console.warn("[WARN] Missing token or formPath in request", { tokenExists: !!token, formPath });
    return { statusCode: 400, body: JSON.stringify({ valid: false, error: "Missing token or formPath" }) };
  }

  // Normalize formPath (remove trailing slash)
  formPath = String(formPath).replace(/\/+$/, "");
  try {
    // retrieveFinalForm returns the stored record (we modified tokenStore to return full record)
    const stored = await retrieveFinalForm(token);
    console.log("[DEBUG] retrieveFinalForm result:", !!stored);

    // If nothing stored for token -> invalid
    if (!stored) {
      return { statusCode: 200, body: JSON.stringify({ valid: false }) };
    }

    // If stored has a formPath we saved at store time, compare normalized paths
    const storedPath = (stored.formPath || "").replace(/\/+$/, "");
    const pathsMatch = storedPath ? (storedPath === formPath) : true;

    // Optionally, if you generate link tokens differently (e.g. using email+formPath),
    // you could also recompute the expected token here and compare. For now we
    // accept token if it exists and formPath matches (defence-in-depth).
    const valid = !!stored && pathsMatch;

    const payload = { valid };
    if (stored.email) payload.email = stored.email;

    console.log("[DEBUG] Token verification result:", { tokenSnippet: token.slice(0,12)+"...", formPath, storedPath, valid });

    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (err) {
    console.error("[ERROR] verifyToken handler failed:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false, error: "Server error" }) };
  }
};
