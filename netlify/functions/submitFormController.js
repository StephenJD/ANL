// Server-Side: /netlify/functions/submitFormController.js
// - Handles all form submission logic, including token, optionalEmail, and client email
// - Stores securely, returns token to client, sends client email if applicable
// Called by client: form_access_controller

const { setSecureItem, getSecureItem } = require("./multiSecureStore");
const { generateTempAccessToken } = require("./generateSecureToken");
const { formatFormData } = require("./formatFormData");
const { sendEmail } = require("./sendEmail");
const getFormFrontMatter = require("./getFormFrontMatter").getFormFrontMatter;

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formName, formData, formPath, optionalEmail, submittedBy, token } = JSON.parse(event.body || "{}");

    if (!formData || !formPath) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formData or formPath" }) };
    }

    // --- Derive validation modes from front-matter (trusted source) ---
    const parsed = await getFormFrontMatter({ formPath });
    const validation = Array.isArray(parsed.validation) ? parsed.validation : ["none"];
    const requireFinalSubmit = validation.includes("submit");
    const requireRequestLink = validation.includes("requestLink");
    const {include_unselected_options} = parsed;
    
    console.debug("[DEBUG] Parsed frontMatter validation:", parsed.validation, "Type:", typeof parsed.validation);

    // Determine effective submitter
    console.debug("[DEBUG] submitFormController: Token:", token ?? "null/undefined", "RequireSubmit:", requireFinalSubmit);

    let effectiveSubmittedBy = null;
    let existing = null;
    if (token) {
      existing = await getSecureItem(process.env.ACCESS_TOKEN_BIN, token);
      if (!existing) {
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
      }
      effectiveSubmittedBy = existing.email || null;
    } else if (submittedBy) {
      effectiveSubmittedBy = submittedBy;
    } else if (optionalEmail) {
      effectiveSubmittedBy = optionalEmail;
    }
    console.debug("[DEBUG] submitFormController: from Token:", existing?.email, "from post:", submittedBy, optionalEmail);
    console.debug("[DEBUG] submitFormController: effectiveSubmittedBy:", effectiveSubmittedBy);

    // Format HTML
    let formattedHTML = formatFormData({
      formData,
      ...(existing?.email && { effectiveSubmittedBy: existing.email }),
      includeUnselected: include_unselected_options
    });
    if (requireFinalSubmit) {
	 formattedHTML = formattedHTML.replace(/{@}/g, "{@V}"); 
    }
    
    // Generate token using the full value to store
    const valueToStore = {
	formName,
      formData: formattedHTML,
      formPath,
      email: effectiveSubmittedBy
    };
    const secureToken = generateTempAccessToken(valueToStore);
    const ONE_HOUR_MS = 60 * 60 * 1000;

    await setSecureItem(process.env.ACCESS_TOKEN_BIN, secureToken, valueToStore, ONE_HOUR_MS);

    // Send email to client if we have an address
    console.log("[DEBUG] submitFormController: send to ", effectiveSubmittedBy);
    if (effectiveSubmittedBy) {
      let finalHtml = formattedHTML.replace(/{@}/g, "").replace(/{@V}/g, "");
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
    // secureToken required by no-submit-validation form to redirect to send_submission_page.html
    const responseBody = { success: true };
    if (!requireFinalSubmit) responseBody.token = secureToken;
    
    return { statusCode: 200, body: JSON.stringify(responseBody) };
    
  } catch (err) {
    console.error("[ERROR] submitFormController exception:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
};
