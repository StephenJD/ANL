// netlify/functions/generateToken.js
const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formPath = null;

  // Parse JSON body
  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formPath = data.formPath; // pass the full form URL path from the frontend
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formPath) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email or formPath" }),
    };
  }

  try {
    // Generate token using HMAC SHA256 with secret
    const secret = process.env.TOKEN_SECRET || "supersecret";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const token = crypto
      .createHmac("sha256", secret)
      .update(email + today)
      .digest("hex");

    // Construct full link to the actual form
    const link = `${formPath.split("?")[0]}?token=${token}&email=${encodeURIComponent(email)}`;

    // Configure SMTP transporter
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send the email
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
