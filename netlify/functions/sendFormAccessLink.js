// netlify/functions/sendFormAccessLink.js
const nodemailer = require("nodemailer");
const { generateSecureToken } = require("./generateSecureToken"); // CommonJS require

exports.handler = async (event) => {
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
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formPath || !site_root) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email, formPath or site_root" }),
    };
  }

  try {
    const token = generateSecureToken(email + formPath);

    const link = `${site_root}${formPath.split("?")[0]}?token=${token}&email=${encodeURIComponent(email)}`;

    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

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
    <p><a href="${link}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">${formName}</a></p>
  `
});


    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Error sending email:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Error sending email" }) };
  }
};
