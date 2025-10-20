// Server-Side: /netlify/functions/finalSubmit.js
// - Retrieves stored form via token from secureStore
// - Inserts "Email-verified" and "Copy requested by"
// - Emails to form-recipient (website owner).
// Called by Client: send_submission_page

const { getSecureItem } = require("./multiSecureStore");
const { sendEmail } = require("./sendEmail");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    console.warn("[DEBUG] Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] Incoming finalSubmit request:", { tokenSnippet: token ? token.slice(0, 12) + "..." : null });

    if (!token) {
      console.error("[ERROR] Missing token in request body");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token" }) };
    }

    // --- 1. Retrieve stored form record ---
    const storedFormData = await getSecureItem(process.env.ACCESS_TOKEN_BIN, token);
    if (!storedFormData) {
      console.error("[ERROR] Invalid or expired token:", token);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const { formName, formData, formPath, email } = storedFormData;
    let formattedHTML = formData.replace(/{@V}/g, " (verified)").replace(/{@}/g, " (un-verified)");
    
    // --- 2. Send submission to admin ---

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "form@anl.com";
    console.log("[DEBUG] Sending submission to admin:", adminEmail);
    await sendEmail({
      to: adminEmail,
      subject: `Form Submission: ${formName}`,
      html: formattedHTML,
      attachBodyAsFile: true
    });


    console.log("[DEBUG] Final submission processed successfully for token:", token);
    return { statusCode: 200, body: JSON.stringify({ success: true, note: "Submission processed" }) };

  } catch (err) {
    console.error("[ERROR] finalSubmit failed:", {
      message: err.message,
      stack: err.stack
    });
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
};
