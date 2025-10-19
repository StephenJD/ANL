// /netlify/functions/verifyAdmin.js
const { generateUserToken } = require("./generateSecureToken");
const { setSecureItem } = require("./multiSecureStore");
require('dotenv').config();

exports.handler = async function (event) {
  try {
    const { username, password } = JSON.parse(event.body || "{}");
    if (!username || !password)
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing credentials" }) };


    const submittedToken = generateUserToken(username, password);
    const validToken = process.env.ADMIN_SUPERUSER_HASH;
console.log("submittedToken:", submittedToken);
console.log("validToken:", validToken);
console.log("username:", username);
console.log("password:", password);
    if (submittedToken !== validToken)
      return { statusCode: 401, body: JSON.stringify({ success: false, error: "Invalid login" }) };

    const sessionKey = generateUserToken(username, Date.now().toString());
    const expires = Date.now() + 30 * 60 * 1000; // 30 min TTL
    await setSecureItem(process.env.USER_ACCESS_BIN, sessionKey, { username }, 30 * 60 * 1000);

    return { statusCode: 200, body: JSON.stringify({ success: true, sessionKey, expires }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
