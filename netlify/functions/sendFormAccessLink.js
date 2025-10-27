// /.netlify/functions/sendFormAccessLink.js
import { setSecureItem } from "./multiSecureStore.js";
import { generateTempAccessToken } from "./generateSecureToken.js";
import { sendEmail } from "./sendEmail.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { email, formPath, formName, site_root } = JSON.parse(event.body || "{}");

    if (!email || !formPath || !formName || !site_root) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing required parameters" }) };
    }

    const valueObject = { email, formPath, formName };
    const token = generateTempAccessToken(valueObject);

    console.log("[DEBUG] Storing request-link token:", token, valueObject);

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    await setSecureItem(process.env.ACCESS_TOKEN_BIN, token, valueObject, ONE_DAY_MS);

    const accessLink = `${site_root}${formPath}?token=${encodeURIComponent(token)}`;

    const emailText = `Delete this email if you did not just request a Form-Link from Ascend Next Level.
Form link: ${accessLink}`;

    const emailHtml = `
      <p>Delete this email if you did not just request a Form-Link from <strong>Ascend Next Level</strong>.</p>
      <p>The link is valid for today only, and only for this form.</p>
      <p><a href="${accessLink}" style="padding:10px 15px;background:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">${formName}</a></p>
    `;

    try {
      await sendEmail({ to: email, subject: `Access Link for ${formName}`, html: emailHtml, text: emailText });
      console.log("[DEBUG] Access link email sent to:", email);
    } catch (emailErr) {
      console.error("[ERROR] Failed to send access link email:", emailErr);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, token }) };
  } catch (err) {
    console.error("[ERROR] sendFormAccessLink failed:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}
