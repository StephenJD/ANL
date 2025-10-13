// Server-Side: /.netlify/functions/finalSubmit.js
const { retrieveFinalForm } = require("./tokenStore");
const getFormFrontMatter = require("./getFormFrontMatter");
const sendEmail = require("./sendEmail");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] Incoming request:", { tokenSnippet: token ? token.slice(0, 12) + "..." : null });

    if (!token) {
      console.error("[ERROR] Missing token in request body");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token" }) };
    }

    const storedFormData = await retrieveFinalForm(token);
    console.log("[DEBUG] Retrieved storedFormData:", storedFormData);

    if (!storedFormData) {
      console.error("[ERROR] Invalid or expired token:", token);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const { formattedForm, email: initialEmail, formPath } = storedFormData;
    console.log("[DEBUG] Stored data summary:", {
      hasForm: !!formattedForm,
      formPath,
      initialEmail,
    });

    if (!formPath) throw new Error("Missing formPath in storedFormData");

    let frontmatter;
    try {
      frontmatter = await getFormFrontMatter({ formPath });
      console.log("[DEBUG] Loaded frontmatter keys:", Object.keys(frontmatter || {}));
    } catch (fmErr) {
      console.error("[ERROR] getFormFrontMatter failed:", fmErr.message, { formPath });
      throw new Error(`getFormFrontMatter error: ${fmErr.message}`);
    }

    const validationMode = frontmatter?.validation?.split(/[\s,;|]+/).filter(Boolean) || ["none"];
    const requireFinalSubmit = validationMode.includes("submit");
    console.log("[DEBUG] Validation mode:", validationMode, "requireFinalSubmit:", requireFinalSubmit);

    const clientEmail = initialEmail || null;
    const sendToANL = !requireFinalSubmit || storedFormData.finalSubmitDone;
    console.log("[DEBUG] Email routing:", {
      clientEmail,
      sendToANL,
      alreadyFinalSubmitted: !!storedFormData.finalSubmitDone,
    });

    if (requireFinalSubmit && clientEmail && !storedFormData.finalSubmitDone) {
      console.log("[DEBUG] Sending validation email to client:", clientEmail);
      await sendEmail({
        to: clientEmail,
        subject: "Please review your submission",
        html: formattedForm,
        attachBodyAsFile: true
      });
      storedFormData.finalSubmitDone = true;
    }

    if (sendToANL) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "form@anl.com";
      console.log("[DEBUG] Sending submission to admin:", adminEmail);
      await sendEmail({
        to: adminEmail,
        subject: "New Form Submission",
        html: formattedForm,
        attachBodyAsFile: false
      });
    }

    console.log("[DEBUG] Final submission completed successfully");
    return { statusCode: 200, body: JSON.stringify({ success: true, note: "Submission processed" }) };

  } catch (err) {
    console.error("[ERROR] finalSubmit failed:", {
      message: err.message,
      stack: err.stack,
    });
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
};
