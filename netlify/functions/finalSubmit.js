// Server-Side: /.netlify/functions/finalSubmit.js
// - Retrieves stored form via token from secureStore
// - Handles final submission and emails
// - Validation mode determines whether client review is required

const { getSecureItem, setSecureItem } = require("./secureStore");
const getFormFrontMatter = require("./getFormFrontMatter").handler;
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
    const storedFormData = await getSecureItem(token);
    if (!storedFormData) {
      console.error("[ERROR] Invalid or expired token:", token);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const { formData: formattedForm, email: clientEmail, formPath, finalSubmitDone } = storedFormData;
    console.log("[DEBUG] Retrieved record:", {
      hasForm: !!formattedForm,
      formPath,
      clientEmail,
      finalSubmitDone
    });

    if (!formPath) throw new Error("Missing formPath in stored record");

    // --- 2. Load validation mode from frontmatter ---
    let frontmatter;
    try {
      frontmatter = await getFormFrontMatter({ formPath });
      console.log("[DEBUG] Loaded frontmatter keys:", Object.keys(frontmatter || {}));
    } catch (fmErr) {
      console.error("[ERROR] getFormFrontMatter failed:", fmErr.message, { formPath });
      throw new Error(`getFormFrontMatter error: ${fmErr.message}`);
    }

    const validationMode = frontmatter?.validation || ["none"];
    const requireFinalSubmit = validationMode.includes("submit");
    console.log("[DEBUG] Validation mode:", validationMode, "requireFinalSubmit:", requireFinalSubmit);

    // --- 3. Decide email routing ---
    const sendToAdmin = !requireFinalSubmit || finalSubmitDone;
    console.log("[DEBUG] Email routing:", {
      clientEmail,
      sendToAdmin,
      finalSubmitAlreadyDone: !!finalSubmitDone
    });

    // --- 4. Send email to client if required ---
    if (requireFinalSubmit && clientEmail && !finalSubmitDone) {
      console.log("[DEBUG] Sending final-submit email to client:", clientEmail);
      await sendEmail({
        to: clientEmail,
        subject: "Please review your submission",
        html: formattedForm,
        attachBodyAsFile: true
      });
      storedFormData.finalSubmitDone = true;
      await setSecureItem(token, storedFormData ); // update flag in secureStore
    }

    // --- 5. Send submission to admin if applicable ---
    if (sendToAdmin) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "form@anl.com";
      console.log("[DEBUG] Sending submission to admin:", adminEmail);
      await sendEmail({
        to: adminEmail,
        subject: "New Form Submission",
        html: formattedForm,
        attachBodyAsFile: false
      });
    }

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
