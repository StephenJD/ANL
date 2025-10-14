// netlify/functions/sendEmail.js
// - Single responsibility: send email
// - Can attach the body as a .txt file optionally
// - Local/dev mode skips actual sending

const nodemailer = require("nodemailer");

async function sendEmail({
    to,
    subject,
    html,
    attachBodyAsFile = false
  }) 
  {
  console.log("[DEBUG] sendEmail invoked");
  console.log("[DEBUG] Params:", { to, subject, htmlLength: html?.length, attachBodyAsFile });  
	  
  if (!to || !subject || !html) {
    console.error("[ERROR] Missing required email parameters", { to, subject, htmlLength: html ? html.length : 0 });
    throw new Error(`Missing required email parameters: ${JSON.stringify({
      to: !!to,
      subject: !!subject,
      html: !!html
    })}`);
  }

  const attachments = attachBodyAsFile ? [{ filename: "email.txt", content: html }] : [];
  console.log("[DEBUG] Attachments set:", attachments.length);
  
  const isLocal = !process.env.NETLIFY && process.env.NODE_ENV !== "production";

  if (isLocal) {
    console.log("[DEBUG] Local mode - email not sent", {
      to,
      subject,
      attachBodyAsFile,
      htmlLength: html.length,
      body: html
    });
    return { success: true, debug: true };
  }

  console.log("[DEBUG] Creating Nodemailer transporter with host:", process.env.SMTP_HOST);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: true,
    debug: true
  });

  try {
    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments
    });
    console.log("[DEBUG] Email successfully sent");
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
}
  
module.exports = { sendEmail };