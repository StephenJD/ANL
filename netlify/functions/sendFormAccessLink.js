// Server-Side: netlify/functions/sendFormAccessLink.js
const { setSecureItem } = require("./secureStore");
const { generateSecureToken } = require("./generateSecureToken");
const { sendEmail } = require("./sendEmail");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, formPath, formName, site_root } = JSON.parse(event.body || "{}");
    console.log("[DEBUG] sendFormAccessLink called with:", { email, formPath, formName, site_root });

    if (!email || !formPath || !formName) {
      console.error("[ERROR] Missing required parameters");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing email, formPath, or formName" }) };
    }

    // Generate token and store it
    const token = generateSecureToken(email + "|" + formPath);
    
    const valueObject = {
      email,         // client email
      formPath,
      formName
    };

    console.log("[DEBUG] Storing request-link token:", token, valueObject);
    
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    await setSecureItem(token, valueObject, ONE_DAY_MS);
    console.log("[DEBUG] Token stored successfully:", token);

    // Construct access link
    const accessLink = `${site_root || "http://localhost:8888"}${formPath}?token=${encodeURIComponent(token)}`;
    console.log("[DEBUG] Access link constructed:", accessLink);

    // Send email
    const emailSubject = `Access Link for ${formName}`;
    const emailHtml = `<p>Click the link below to access your form:</p>
                       <p><a href="${accessLink}">${accessLink}</a></p>`;

    try {
      await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
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
