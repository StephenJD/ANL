// netlify/functions/generateToken.js

import nodemailer from "nodemailer";
import crypto from "crypto";

export async function handler(event) {
  try {
    const { email, pageUrl } = JSON.parse(event.body);
    if (!email || !pageUrl) {
      return { statusCode: 400, body: "Email and pageUrl required" };
    }

    // Token expires daily: use YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0]; 
    const secret = process.env.TOKEN_SECRET || "supersecret"; // set in Netlify env

    const token = crypto
      .createHmac("sha256", secret)
      .update(email + today)
      .digest("hex");

    const link = `${pageUrl}?token=${token}&email=${encodeURIComponent(email)}`;

    // Email setup
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Form access link",
      text: `Here’s your link to submit the form: ${link}`,
    });

    return { statusCode: 200, body: "Email sent" };
  } catch (err) {
    console.error("Error sending email:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
