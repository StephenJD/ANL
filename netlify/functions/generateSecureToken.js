// netlify/functions/generateSecureToken.js
const crypto = require("crypto");

function generateSecureToken(request_origin) {
  const secret = process.env.TOKEN_SECRET || "supersecret";
  const today = new Date().toISOString().split("T")[0];
  return crypto
    .createHmac("sha256", secret)
    .update(request_origin + "|" + today)
    .digest("hex");
}

module.exports = { generateSecureToken };


