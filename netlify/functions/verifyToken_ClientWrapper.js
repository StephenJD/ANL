// Server-Side: /netlify/functions/verifyToken_ClientWrapper.js
const { getSecureItem } = require("./secureStore");

exports.handler = async function (event) {
  try {
    const { token } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] verifyToken_ClientWrapper called with:", { token });

    if (!token) {
      console.warn("[DEBUG] Missing token");
      return {
        statusCode: 400,
        body: JSON.stringify({ valid: false, error: "Missing token" }),
      };
    }

    const record = await getSecureItem(token);

    if (!record) {
      console.warn("[DEBUG] Invalid or expired token:", token);
      return {
        statusCode: 403,
        body: JSON.stringify({ valid: false, error: "Invalid or expired token" }),
      };
    }

    console.log("[DEBUG] Token verified successfully:", { token, record, email: record.email });

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        email: record.email || null,
        token,
      }),
    };
  } catch (err) {
    console.error("[DEBUG] verifyToken_ClientWrapper exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, error: "Internal server error", details: err.message }),
    };
  }
};
