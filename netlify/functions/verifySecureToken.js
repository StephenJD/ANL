// netlify/functions/verifySecureToken.js
const { generateSecureToken } = require("./generateSecureToken"); // CommonJS

exports.handler = async function(event) {
  try {
    const { token, site_root, formPath, email } = JSON.parse(event.body);
    if (!token || !site_root || !formPath || !email) {
      console.log("Missing token, site_root, formPath, or email");
      return { statusCode: 400, body: JSON.stringify({ valid: false }) };
    }
    
    const tokenSeed = email + "|" + formPath;
    const expected = generateSecureToken(tokenSeed);
    const valid = token === expected;

    console.log(`verifySecureToken: token=${token}, expected=${expected}, valid=${valid}`);

    return { statusCode: 200, body: JSON.stringify({ valid }) };
  } catch (err) {
    console.error("verifySecureToken error:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};


