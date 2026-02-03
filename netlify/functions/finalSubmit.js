// /.netlify/functions/finalSubmit.js
import { getSecureItem } from "./multiSecureStore.js";
import { sendEmail } from "./sendEmail.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    console.warn("[DEBUG] Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body || "{}");
    console.log("[finalSubmit] Incoming request:", { tokenSnippet: token ? token.slice(0, 12) + "..." : null });

    if (!token) {
      console.error("[ERROR finalSubmit] Missing token in request body");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token" }) };
    }

    const storedFormData = await getSecureItem(process.env.ACCESS_TOKEN_BIN, token);
    if (!storedFormData) {
      console.error("[ERROR finalSubmit] Invalid or expired token:", token);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const { formName, formData } = storedFormData;
    const formattedHTML = formData.replace(/{@V}/g, " (verified)").replace(/{@}/g, " (un-verified)");

    const adminEmail = process.env.SMTP_USER; // EMAIL_FROM does not work!!!
    console.log("[finalsubmit] sending submission to admin:", adminEmail, "for", formName);

    await sendEmail({
      to: adminemail,
      subject: `form submission: ${formname}`,
      html: formattedhtml,
      attachbodyasfile: true
    });

    console.log("[finalSubmit] Final submission processed successfully for token:", token);
    return { statusCode: 200, body: JSON.stringify({ success: true, note: "Submission processed" }) };

  } catch (err) {
    console.error("[ERROR finalSubmit] finalSubmit failed:", { message: err.message, stack: err.stack });
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}
