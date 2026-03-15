// /.netlify/functions/sendClientEmail.js
import { getSecureItem } from "./multiSecureStore.js";
import { sendEmail } from "./sendEmail.js";
import { requireAuth } from "./authHelper.js";

const ACCESS_TOKEN_BIN = process.env.ACCESS_TOKEN_BIN;

export async function handler(event) {
  console.log("[DEBUG] Raw event.body:", event.body);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const auth = await requireAuth(event, []);
  if (auth.unauthorized) return auth.response;

  try {
    const { token, email, includeSubmissionLink = false } = JSON.parse(event.body || "{}");

    if (!token || !email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token or email" }) };
    }

    const storedData = await getSecureItem(ACCESS_TOKEN_BIN, token);
    console.log("[DEBUG] Retrieved storedData from store:", storedData);

    if (!storedData || !storedData.formattedHTML) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formatted form data" }) };
    }

    // Non-admin callers may only send to the email bound into the token.
    if (auth.user.role !== "admin") {
      const tokenEmail = String(storedData.email || "").toLowerCase();
      const requestedEmail = String(email || "").toLowerCase();
      if (tokenEmail && tokenEmail !== requestedEmail) {
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Forbidden" }) };
      }
    }

    let htmlContent = storedData.formattedHTML;

    if (includeSubmissionLink) {
      const submitUrl = `${process.env.SITE_ROOT || "https://example.com"}/send_submission_page.html?token=${encodeURIComponent(token)}`;
      htmlContent += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
    }

    await sendEmail({
      to: email,
      subject: includeSubmissionLink ? "Final Form Submission" : "Your Form Copy",
      html: htmlContent
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("[ERROR] sendClientEmail exception:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}
