// netlify/functions/finalSubmit.js

const { generateSecureToken } = require("./generateSecureToken");

exports.handler = async function(event) {
  try {
    const { token, email, formName, formattedForm } = JSON.parse(event.body || "{}");

    if (!token || !email || !formName || !formattedForm) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing fields" }) };
    }

    const valid = generateSecureToken(formattedForm) === token;

    if (!valid) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid token" }) };
    }

    // Here you can do whatever final submission action is needed:
    // e.g., save to DB, send notification, etc.

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
