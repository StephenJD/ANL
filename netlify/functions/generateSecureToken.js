// netlify/functions/generateSecureToken.js
const crypto = require("crypto");

function generateSecureToken(request_origin) {
  const secret = process.env.TOKEN_SECRET || "supersecret";
  const today = Date.now();
  return crypto
    .createHmac("sha256", secret)
    .update(request_origin + "|" + today)
    .digest("hex");
}

function generateUserToken(userName, password) {
  const secret = process.env.TOKEN_SECRET || "superusersecret";
  return crypto
    .createHmac("sha256", secret)
    .update(userName + "|" + password)
    .digest("hex");
}

module.exports = { generateSecureToken, generateUserToken };



