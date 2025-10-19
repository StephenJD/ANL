// Server-Side: netlify/functions/sendFormAccessLink.js
// called by client: form_access_controller

const { setSecureItem } = require("./secureStore");
const { generateSecureToken } = require("./generateSecureToken");
const { sendEmail } = require("./sendEmail");
const { getAdminUsers } = require("./adminUsers"); // fetch current admin-user list
const { getFormFrontMatter } = require("./getFormFrontMatter"); // read YAML front-matter

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, formPath, formName, site_root } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] sendFormAccessLink called with:", { email, formPath, formName, site_root });

    if (!email || !formPath || !formName || !site_root) {
      console.error("[ERROR] Missing required parameters");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing email, formPath, or formName" }) };
    }

    // --- 1. Load front-matter and check restrictUsers ---
    const frontMatter = await getFormFrontMatter(formPath);
    const restrictUsers = Array.isArray(frontMatter.validation) && frontMatter.validation.includes("restrictUsers");

    if (restrictUsers) {
      const adminUsers = await getAdminUsers(); // must return array of { email, role, ... }
      const allowed = adminUsers.some(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!allowed) {
        console.warn("[WARN] Email not allowed by admin-user list:", email);
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Your email is not authorized for this form." }) };
      }
    }

    // --- 2. Store request link token ---
    const valueObject = { email, formPath, formName };
    const token = generateSecureToken(valueObject);

    console.log("[DEBUG] Storing request-link token:", token, valueObject);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    await setSecureItem(token, valueObject, ONE_DAY_MS);

    // --- 3. Construct access link ---
    const accessLink = `${site_root}${formPath}?token=${encodeURIComponent(token)}`;

    const emailText = `Delete this email if you did not just request a Form-Link from Ascend Next Level.
    
The link can only be used today, from this email address and only for this form.

If you are not ready to complete and submit the form, you can request another link when you are ready.

Form link: ${accessLink}`;

    const emailHtml = `
<p>Delete this email if you did not just request a Form-Link from <strong>Ascend Next Level</strong>.</p>
<p>The link can only be used <strong>today</strong>, from this email address and only for this form.</p>
<p>If you are not ready to complete and submit the form, you can request another link when you are ready.</p>
<p><a href="${accessLink}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">${formName}</a></p>
`;

    try {
      await sendEmail({
        to: email,
        subject: `Access Link for ${formName}`,
        html: emailHtml,
        text: emailText,
        attachBodyAsFile: false
      });
      console.log("[DEBUG] Access link email sent to:", email);
    } catch (emailErr) {
      console.error("[ERROR] Failed to send access link email:", emailErr);
      // Continue: the token was already stored
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };

  } catch (err) {
    console.error("[ERROR] sendFormAccessLink failed:", { message: err.message, stack: err.stack });
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
};
