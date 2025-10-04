// netlify/functions/sendFormAccessLink.js
const nodemailer = require("nodemailer");
const { generateSecureToken } = require("./generateSecureToken"); // correct relative path

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formPath = null;
  let origin = null;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formPath = data.formPath;
    origin = data.origin;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formPath || !origin) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email, formPath or origin" }),
    };
  }

  try {
    const token = generateSecureToken(email);

    const link = `${origin}${formPath.split("?")[0]}?token=${token}&email=${encodeURIComponent(email)}`;

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
      text: `Here’s your link to submit the form: ${link}`,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Error sending email:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Error sending email" }) };
  }
};
