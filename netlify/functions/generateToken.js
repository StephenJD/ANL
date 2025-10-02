// netlify/functions/generateToken.js

const nodemailer = require("nodemailer");

exports.handler = async function(event, context) {
  try {
    const { email, formUrl } = JSON.parse(event.body);

    // Use your Netlify environment variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"AscendNextLevel.org.uk" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your form link",
  text: `Here’s your link to submit the form: ${formUrl}?token=XYZ`
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent" })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};


await transporter.sendMail({
  from: `"Your Site" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "Your form link",
  text: `Here’s your link to submit the form: ${formUrl}?token=XYZ`
});
