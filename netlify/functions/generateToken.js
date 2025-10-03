// netlify/functions/generateToken.js
import crypto from "crypto";
import nodemailer from "nodemailer";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formId = null;

  try {
    const data = JSON.parse(event.body);
    email = data.email?.trim();
    formId = data.formId?.trim();
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email or formId" }),
    };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const secret = process.env.TOKEN_SECRET || "supersecret";

    // HMAC token to match verifyToken.js
    const token = crypto
      .createHmac("sha256", secret)
      .update(email + today)
      .digest("hex");

    // Link points to the correct form dynamically using formId
    const link = `https://ascendnextlevel.org.uk/${formId}?token=${token}&email=${encodeURIComponent(email)}`;

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
