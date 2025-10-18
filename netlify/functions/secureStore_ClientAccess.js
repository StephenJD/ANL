// Server-Side: /netlify/functions/secureStore_ClientAccess.js
const { getSecureItem, setSecureItem } = require("./secureStore");

exports.handler = async function (event) {
  try {
    const { token, value, ttl = null } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] secureStore_ClientAccess called with:", { token, hasValue: !!value });

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing token" }),
      };
    }

    // === SET operation ===
    if (value !== undefined) {
      console.log("[DEBUG] Performing SET for token:", token);
      await setSecureItem(token, value, ttl);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    // === GET operation ===
    console.log("[DEBUG] Performing GET for token:", token);
    const record = await getSecureItem(token);

    if (!record) {
      return {
        statusCode: 404,
        body: JSON.stringify({ success: false, error: "Not found or expired" }),
      };
    }

    // === Legacy-compatible return ===
    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        token,
        ...record,
      }),
    };
  } catch (err) {
    console.error("[DEBUG] secureStore_ClientAccess exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Internal server error", details: err.message }),
    };
  }
};
