// netlify/functions/verifySecureToken.js
const { generateSecureToken } = require("./generateSecureToken");

/**
 * verifySecureToken
 * Pure function that validates a token based on email and formPath.
 * Returns true if valid, false otherwise.
 */
function verifySecureToken(token, email, formPath) {
  try {
    if (!token || !email || !formPath) {
      console.warn("verifySecureToken: missing token, email, or formPath");
      return false;
    }

    const tokenSeed = email + formPath;
    const expected = generateSecureToken(tokenSeed);
    const valid = token === expected;

    console.log(`verifySecureToken: token=${token}, expected=${expected}, valid=${valid}`);
    return valid;
  } catch (err) {
    console.error("verifySecureToken error:", err);
    return false;
  }
}

module.exports = { verifySecureToken };
