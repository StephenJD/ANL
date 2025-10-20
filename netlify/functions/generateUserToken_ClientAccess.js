// netlify/functions/generateUserToken_ClientAccess.js
const { generateUserToken } = require("./generateSecureToken");

exports.handler = async (event) => {
  try {
    const { userName, password } = JSON.parse(event.body || "{}");
    if (!userName || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
    }
    const token = generateUserToken(userName, password);
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
