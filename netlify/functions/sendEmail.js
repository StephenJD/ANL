// /.netlify/functions/sendEmail.js
// - Single responsibility: send email
// - Can attach the body as a .pdf file optionally
// - Local/dev mode skips actual sending

import nodemailer from "nodemailer";
import { makePDF } from "./makePDF.js"; // server-only PDF utility

export async function sendEmail({
  to,
  subject,
  html,
  attachBodyAsFile = false
}) {
  console.log("[sendEmail] Params:", { to, subject, html });

  if (!to || !subject || !html) {
    console.error("[ERROR] Missing required email parameters", { to, subject, htmlLength: html ? html.length : 0 });
    throw new Error(`Missing required email parameters: ${JSON.stringify({
      to: !!to,
      subject: !!subject,
      html: !!html
    })}`);
  }

  let attachments = [];

  if (attachBodyAsFile) {
    const pdfBytes = await makePDF(html);
    attachments.push({ filename: `${subject}.pdf`, content: pdfBytes });
  }

  const isLocal = !process.env.SMTP_HOST;

  if (isLocal) {
    console.log("[sendEmail] Local mode - email not sent", {
      to,
      subject,
      attachBodyAsFile,
      htmlLength: html.length,
      body: html
    });
    return { success: true, debug: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    //logger: true,
    //debug: true
  });

  try {
    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments
    });
    console.log("[sendEmail] Email successfully sent");
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
