// Server-Side: /netlify/functions/secureStore_ClientAccess.js
const { getSecureItem, setSecureItem } = require("./multiSecureStore");

exports.handler = async function (event) {
  try {
    const {bin, token, value, ttl = null /*, list = false*/ } = JSON.parse(event.body || "{}");

    // if (list) {
      // const { readStore } = require("./multiSecureStore");
      // const store = await readStore();
      // return {
        // statusCode: 200,
        // body: JSON.stringify({ success: true, records: store }),
      // };
    // }

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing token" }),
      };
    }
    
// Validate bin against allowed environment variables
    const allowedBins = ["ACCESS_TOKEN_BIN", "USER_ACCESS_BIN"];
    if (!bin || !allowedBins.includes(bin)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Invalid or missing bin" }),
      };
    }

    const BIN_ID = process.env[bin]; // access env variable dynamically
    
    if (value !== undefined) {
      await setSecureItem(BIN_ID, token, value, ttl);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const record = await getSecureItem(BIN_ID, token);
    if (!record) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Not found" }) };

    return { statusCode: 200, body: JSON.stringify({ valid: true, token, ...record }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
