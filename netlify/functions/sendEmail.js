// netlify/functions/sendEmail.js
// - Single responsibility: send email
// - Can attach the body as a .txt file optionally
// - Local/dev mode skips actual sending

const nodemailer = require("nodemailer");

module.exports = async function sendEmail({
  to,
  subject,
  html,
  attachBodyAsFile = false
}) {
  if (!to || !subject || !html) {
    console.error("[ERROR] Missing required email parameters", { to, subject, htmlLength: html ? html.length : 0 });
    throw new Error(`Missing required email parameters: ${JSON.stringify({
      to: !!to,
      subject: !!subject,
      html: !!html
    })}`);
  }

  const attachments = attachBodyAsFile
    ? [{ filename: "email.txt", content: html }]
    : [];

  const isLocal = !process.env.NETLIFY && process.env.NODE_ENV !== "production";

  if (isLocal) {
    console.log("[DEBUG] Local mode - email not sent", {
      to,
      subject,
      attachBodyAsFile,
      htmlLength: html.length,
      snippet: html.slice(0, 200)
    });
    return { success: true, debug: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments
    });
    return { success: true };
  } catch (err) {
    console.error("[ERROR] sendEmail failed", {
      error: err.message,
      to,
      subject,
      attachBodyAsFile,
      env: {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_USER: process.env.SMTP_USER ? "(set)" : "(missing)"
      }
    });
    throw err;
  }
};
