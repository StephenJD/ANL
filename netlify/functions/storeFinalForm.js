// Server-Side: /netlify/functions/storeFinalForm.js
const { storeFinalForm } = require("./tokenStore");
const { generateSecureToken } = require("./generateSecureToken");

exports.handler = async function (event) {
  try {
    const { formattedForm } = JSON.parse(event.body);
    if (!formattedForm) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing formattedForm" }),
      };
    }

    // Generate token securely on the server
    const token = generateSecureToken(formattedForm);

    // Store form and token securely
    await storeFinalForm(token, formattedForm);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token }),
    };
  } catch (err) {
    console.error("storeFinalForm error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Internal server error" }),
    };
  }
};
