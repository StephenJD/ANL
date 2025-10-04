// netlify/functions/verifySecureToken.js
const { generateSecureToken } = require("./generateSecureToken");

exports.handler = async function(event) {
  try {
    console.log("verifySecureToken: raw event.body:", event.body);

    const { token, email, formPath } = JSON.parse(event.body);
    console.log("verifySecureToken: parsed body:", { token, email, formPath });

    if (!token || !email || !formPath) {
      console.log("Missing token, email, or formPath");
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
