// netlify/functions/sendFormattedForm.js
const nodemailer = require("nodemailer");
const { generateSecureToken } = require("./generateSecureToken"); // token utils
const { verifySecureToken } = require("./verifySecureToken"); // adjust if needed

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, token, formName, formattedForm, site_root;
  try {
    const data = JSON.parse(event.body);
    email = data.email;
    token = data.token;
    formName = data.formName;
    formattedForm = data.formattedForm;
    site_root = data.site_root;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  if (!email || !token || !formattedForm || !site_root) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing required fields" }) };
  }

  try {
    const valid = await verifySecureToken(token, email + formName);
    if (!valid) {
      return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const link = `${site_root}/${formName}?token=${token}&email=${encodeURIComponent(email)}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Your ${formName} submission`,
      html: `
        <p>Here is your submitted form. You can edit and submit it using the link below:</p>
        <pre>${formattedForm}</pre>
        <p><a href="${link}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">Edit and Submit</a></p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
