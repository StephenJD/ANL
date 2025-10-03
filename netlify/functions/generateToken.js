// netlify/functions/generateToken.js
const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;

  // Try JSON first
  try {
    const data = JSON.parse(event.body);
    email = data.email;
  } catch {
    // Fallback to form-encoded
    try {
      const params = new URLSearchParams(event.body);
      email = params.get("email");
    } catch {
      // ignore
    }
  }

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email" }),
    };
  }

  // Generate a secure token (hash of email + date)
  const token = crypto
    .createHash("sha256")
    .update(email + new Date().toISOString().slice(0, 10)) // date-limited
    .digest("hex");

  const link = `https://ascendnextlevel.org.uk/form?token=${token}`;

  try {
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

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("Error sending email:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Error sending email" }),
    };
  }
};
