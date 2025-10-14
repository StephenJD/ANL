// Server-Side: /netlify/functions/submitFormController.js
// - Handles all form submission logic, including token, optionalEmail, and client email
// - Stores securely, returns token to client, sends client email if applicable

const { setSecureItem, getSecureItem } = require("./secureStore");
const { generateSecureToken } = require("./generateSecureToken");
const { formatFormEmail } = require("./formatFormData");
const { sendEmail } = require("./sendEmail");
const getFormFrontMatter = require("./getFormFrontMatter").handler;

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formData, formPath, optionalEmail, token } = JSON.parse(event.body || "{}");
    if (!formData || !formPath) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formData or formPath" }) };
    }

    // --- Derive validation modes from front-matter (trusted source) ---
    const meta = await getFormFrontMatter({
      httpMethod: "POST",
      body: JSON.stringify({ formPath }),
    });
    const parsed = JSON.parse(meta.body || "{}");
    const validation = Array.isArray(parsed.validation) ? parsed.validation : ["none"];
    const requireFinalSubmit = validation.includes("submit");
    const requireRequestLink = validation.includes("requestLink");
    const {include_unselected_options} = parsed;
    
    // Determine effective submitter
    let effectiveSubmittedBy = null;
    if (token) {
      const existing = await getSecureItem(token);

      if (!existing) {
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
      }
      effectiveSubmittedBy = existing.email || null;
    } else if (optionalEmail) {
      effectiveSubmittedBy = optionalEmail;
    }
    
    // Format HTML
    const formattedHTML = formatFormEmail({ formData, include_unselected_options });
    
    // Generate token using the full value to store
    const valueToStore = {
      formData: formattedHTML,
      formPath,
      email: effectiveSubmittedBy,
    };
    const secureToken = generateSecureToken(valueToStore);
    const ONE_HOUR_MS = 60 * 60 * 1000;

    await setSecureItem(secureToken, valueToStore, ONE_HOUR_MS);

    // Send email to client if we have an address
    if (effectiveSubmittedBy) {
      let finalHtml = formattedHTML;
      if (requireFinalSubmit) {
        const siteRoot =
          process.env.SITE_ROOT ||
          event.headers.origin ||
          "http://localhost:8888";

        const submitUrl = `${siteRoot}/send_submission_page.html?token=${encodeURIComponent(secureToken)}`;

        finalHtml += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
      }

      await sendEmail({
        to: effectiveSubmittedBy,
        subject: requireFinalSubmit ? "Final Form Submission" : "Your Form Copy",
        html: finalHtml,
        attachBodyAsFile: false
      });

      console.log("[DEBUG] Client email sent to:", effectiveSubmittedBy);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, token: secureToken }) };

  } catch (err) {
    console.error("[ERROR] submitFormController exception:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
};
