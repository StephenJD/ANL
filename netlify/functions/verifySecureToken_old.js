// Server-side: netlify/functions/verifySecureToken.js

const { generateSecureToken } = require("./generateSecureToken");

function verifySecureToken(token, seed) {
  const expected = generateSecureToken(seed);
  return token === expected;
}

module.exports = verifySecureToken;

