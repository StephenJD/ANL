// netlify/functions/generateToken.js

const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: "Email is required" };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Send email
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your secure form link",
      text: `Here’s your link to submit the form: https://ascendnextlevel.org.uk/form?token=${token}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent", token }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
