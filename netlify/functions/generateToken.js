// netlify/functions/generateToken.js

const nodemailer = require("nodemailer");

exports.handler = async function(event, context) {
  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: "Email is required" };
    }

    // Generate a short random token
    const token = Math.random().toString(36).substring(2, 15);

    // Construct the link (adjust your site URL)
    const link = `https://YOUR_SITE_URL/verify?token=${token}&email=${encodeURIComponent(email)}`;

    // Configure SMTP transport using environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your form submission link",
      text: `Click this link to enable the form: ${link}`,
      html: `<p>Click this link to enable the form:</p><p><a href="${link}">${link}</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Verification email sent" }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error sending email" };
  }
};
