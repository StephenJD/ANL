// Server-Side: netlify/functions/sendFormAccessLink.js
const nodemailer = require("nodemailer");
const { generateSecureToken } = require("./generateSecureToken");
const { storeFinalForm } = require("./tokenStore");

exports.handler = async (event) => {
  console.log("[DEBUG] sendFormAccessLink invoked, method:", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formPath = null;
  let formName = null;
  let site_root = null;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formPath = data.formPath;
    formName = data.formName;
    site_root = data.site_root;

    console.log("[DEBUG] Parsed request body:", { email, formPath, formName, site_root });
  } catch (err) {
    console.error("[ERROR] Invalid JSON in request body:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formPath || !site_root) {
    console.warn("[WARN] Missing required parameters:", { email, formPath, site_root });
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email, formPath or site_root" }),
    };
  }

  try {
    const token = generateSecureToken(email + formPath);
    console.log("[DEBUG] Generated token:", token);
    console.log("[DEBUG] Stored access-link token in tokenStore:", token);

    const formTitle = (formName || "").replace(/^"|"$/g, "");
    const normalizedFormPath = formPath.replace(/\/+$/, "");
    console.log("[DEBUG] Normalized formPath for token generation:", normalizedFormPath);
    const link = `${site_root}${normalizedFormPath}?token=${token}`;
    console.log("[DEBUG] Generated secure link:", link);
    
    await storeFinalForm(token, "", normalizedFormPath, email);

    if (process.env.NETLIFY_DEV || process.env.LOCAL_TEST) {
      console.log("[DEBUG] Local/dev mode, skipping email send");
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, link, formTitle }),
      };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    console.log("[DEBUG] Sending email via SMTP to:", email);

    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your secure form link",
      text: `Delete this email if you did not just request a Form-Link from Ascend Next Level.

The link can only be used today, from this email address and only for this form.

If you are not ready to complete and submit the form, you can request another link when you are ready.

Form link: ${link}`,
      html: `
        <p>Delete this email if you did not just request a Form-Link from <strong>Ascend Next Level</strong>.</p>
        <p>The link can only be used <strong>today</strong>, from this email address and only for this form.</p>
        <p>If you are not ready to complete and submit the form, you can request another link when you are ready.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">${formTitle}</a></p>
      `,
    });

    console.log("[DEBUG] Email sent successfully to:", email);
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("[ERROR] Failed to send email:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Error sending email" }) };
  }
};
