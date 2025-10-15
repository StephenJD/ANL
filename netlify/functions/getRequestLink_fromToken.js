// Server-Side: /netlify/functions/getRequestLink_fromToken.js
// called by client: form_access_controller

const { getSecureItem } = require("./secureStore");

exports.handler = async function (event) {
  try {
    const { token } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] getRequestLink_fromToken called with:", { token });

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

    console.log("[DEBUG] Token retieved successfully:", { token, record, email: record.email });

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        token,
        ...record
	}),
    };
  } catch (err) {
    console.error("[DEBUG] getRequestLink_fromToken exception:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ valid: false, error: "Internal server error", details: err.message }),
    };
  }
};
