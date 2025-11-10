// /.netlify/functions/submitFormController.js
import { setSecureItem, getSecureItem } from "./multiSecureStore.js";
import { generateTempAccessToken } from "./generateSecureToken.js";
import { formatFormData } from "./formatFormData.js";
import { sendEmail } from "./sendEmail.js";
import { getFormFrontMatter } from "./getFormFrontMatter.js";
import { getFormRecord } from "./getRecordFromForm.js";
import { parseHTML } from "linkedom";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    console.debug("[DEBUG] Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    let { formName, formData, formPath, optionalEmail, submittedBy, token } = JSON.parse(event.body || "{}");
    console.debug("[submitFormController] Received POST data:", { formName, formPath, submittedBy, optionalEmail, token });

    if (!formData || !formPath) {
      console.debug("[submitFormController] Missing formData or formPath");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formData or formPath" }) };
    }

    const parsed = await getFormFrontMatter({ formPath });
    console.debug("[submitFormController] Parsed frontMatter:", parsed);

    const validation = Array.isArray(parsed.validation) ? parsed.validation : ["none"];
    const requireFinalSubmit = validation.includes("submit");
    const { include_unselected_options } = parsed;

    let effectiveSubmittedBy = null;
    let existing = null;
    if (token) {
      existing = await getSecureItem(process.env.ACCESS_TOKEN_BIN, token);
      console.debug("[submitFormController] Existing token data:", existing);
      if (!existing) {
        console.debug("[submitFormController] Invalid or expired token");
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
      }
      effectiveSubmittedBy = existing.email || null;
      console.debug("[submitFormController] SubmittedBy from server:", effectiveSubmittedBy);
    } else if (submittedBy) {
      effectiveSubmittedBy = submittedBy;
      console.debug("[submitFormController] submittedBy from client:", effectiveSubmittedBy);
    } else if (optionalEmail) {
      effectiveSubmittedBy = optionalEmail;
      console.debug("[submitFormController] submittedBy from optional email:", effectiveSubmittedBy);
    }
    //console.debug("[submitFormController] raw HTML:", formData);

    // --- Replace {@S} marker in raw HTML ---
    if (formData.includes("{@S}")) {
      formData = formData.replace(
        /{@S}(.*?){\/@}/,
        (_, originalValue) => effectiveSubmittedBy
          ? `${effectiveSubmittedBy}{@V}`
          : "{@}"
      );
      console.debug("[submitFormController] Updated submitted_by:", formData);
    }
    
    formData = formData.replace(
      'Email (optional) if you would like a copy of your form',
      'Copy requested by'
    );
    //console.debug("[submitFormController] Updated optionalEmail:", formData);


    const record = getFormRecord(formData);
    console.debug("[submitFormController] Generated record:", record);

    // --- Format record ---
    let formattedHTML = formatFormData({
      record,
      includeUnselected: include_unselected_options
    });
    //console.debug("[submitFormController] Formatted HTML before title prepend:", formattedHTML);

    formattedHTML = `<h2>${formName}</h2>` + formattedHTML;
    //console.debug("[submitFormController] Formatted HTML after title prepend:", formattedHTML);

    if (requireFinalSubmit) {
      formattedHTML = formattedHTML.replace(/{@}/g, "{@V}");
      //console.debug("[submitFormController] Formatted HTML after final submit replacement:", formattedHTML);
    }

    const valueToStore = {
      formName,
      formData: formattedHTML,
      formPath,
      email: effectiveSubmittedBy
    };
    const secureToken = generateTempAccessToken(valueToStore);
    const ONE_HOUR_MS = 60 * 60 * 1000;
    await setSecureItem(process.env.ACCESS_TOKEN_BIN, secureToken, valueToStore, ONE_HOUR_MS);
    console.debug("[submitFormController] Stored secure item in ACCESS_TOKEN_BIN");

    if (effectiveSubmittedBy) {
      let finalHtml = formattedHTML.replace(/{@}/g, "").replace(/{@V}/g, "");
      if (requireFinalSubmit) {
        const siteRoot = process.env.SITE_ROOT || event.headers.origin || "http://localhost:8888";
        const submitUrl = `${siteRoot}/send_submission_page.html?token=${encodeURIComponent(secureToken)}`;
        finalHtml += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
      }

      await sendEmail({
        to: effectiveSubmittedBy,
        subject: requireFinalSubmit ? "Final Form Submission" : "Your Form Copy",
        html: finalHtml,
        attachBodyAsFile: false
      });

      console.debug("[submitFormController] Client email sent to:", effectiveSubmittedBy);
    }

    const responseBody = { success: true };
    if (!requireFinalSubmit) responseBody.token = secureToken;

    console.debug("[submitFormController] Returning success response");
    return { statusCode: 200, body: JSON.stringify(responseBody) };

  } catch (err) {
    console.error("[ERROR] submitFormController exception:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}
