// Server-Side: /netlify/functions/storeFinalForm.js
const { storeFinalForm } = require("./tokenStore");
const { generateSecureToken } = require("./generateSecureToken");

exports.handler = async function (event) {
  try {
    const { formattedForm, formPath, email } = JSON.parse(event.body);
    if (!formattedForm || !formPath) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formattedForm or formPath" }) };
    }

    const token = generateSecureToken(formattedForm);
    await storeFinalForm(token, formattedForm, formPath, email);

    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  } catch (err) {
    console.error("storeFinalForm error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Internal server error" }) };
  }
};

