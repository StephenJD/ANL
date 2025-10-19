// Server-Side: /netlify/functions/secureStore_ClientAccess.js
const { getSecureItem, setSecureItem } = require("./secureStore");

exports.handler = async function (event) {
  try {
    const { token, value, ttl = null, list = false } = JSON.parse(event.body || "{}");

    if (list) {
      const { readStore } = require("./secureStore");
      const store = await readStore();
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, records: store }),
      };
    }

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing token" }),
      };
    }

    if (value !== undefined) {
      await setSecureItem(token, value, ttl);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const record = await getSecureItem(token);
    if (!record) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Not found" }) };

    return { statusCode: 200, body: JSON.stringify({ valid: true, token, ...record }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
