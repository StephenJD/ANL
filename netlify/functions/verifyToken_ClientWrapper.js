// Server-Side: netlify/functions/verifyToken_ClientWrapper.js

const verifySecureToken = require("./verifySecureToken");

exports.handler = async function(event) {
  try {
    const { token, email, formPath } = JSON.parse(event.body);
    if (!token || !email || !formPath) return { statusCode: 400, body: JSON.stringify({ valid: false }) };
    
    const valid = verifySecureToken(token, email + formPath);
    return { statusCode: 200, body: JSON.stringify({ valid }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};
