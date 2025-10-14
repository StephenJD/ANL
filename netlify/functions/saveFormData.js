// Server-Side: /netlify/functions/saveFormData.js
const { setSecureItem, getSecureItem } = require("./secureStore");
const { generateSecureToken } = require("./generateSecureToken");
const { formatFormEmail } = require("./formatFormData");

exports.handler = async function (event) {
  try {
    const { formData, formPath, optionalEmail, submittedBy, token, title } = JSON.parse(event.body || "{}");

    if (!formData || !formPath) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formData or formPath" }) };
    }

    // Determine effective submitter
    let effectiveSubmittedBy = submittedBy || null;
    if (token) {
      const existing = await getSecureItem(token);
      if (!existing) return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
      effectiveSubmittedBy = existing.email || null;
    }

    // Include title in formData for email formatting
    if (title) formData.title = title;

    // Construct the value to store first
    const formattedHTML = formatFormEmail({ formData });
    const valueObject = {
      formData: formattedHTML,
      formPath,
      email: effectiveSubmittedBy,
    };
    
    // Then generate the secure token using the full valueObject
    const secureToken = generateSecureToken(valueObject);
    const ONE_HOUR_MS = 60 * 60 * 1000;
    await setSecureItem(secureToken, valueObject, ONE_HOUR_MS);
    console.log("[DEBUG] Stored valueObject for token:", secureToken, valueObject);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token: secureToken,
      }),
    };
  } catch (err) {
    console.error("saveFormData error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Internal server error" }) };
  }
};
