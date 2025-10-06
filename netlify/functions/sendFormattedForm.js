// netlify/functions/sendFormattedForm.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    const { email, token, formName, formattedForm, site_root } = JSON.parse(event.body || "{}");

    if (!email || !formName || !formattedForm) {
      console.error("Missing fields:", { email, formName, formattedForm: !!formattedForm });
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing fields" }),
      };
    }

    // Log received data to confirm frontend values
    console.log("Received from client:", { email, token, formName });

    // Skip token verification for now
    // Normally you'd verify token here, but we're isolating the mail path.

    // Set up mail transport (adjust for your provider)
    const transporter = nodemailer.createTransport({
      host: "smtp.yourmailhost.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Form submission: ${formName}`,
      html: `
        <p>This is your formatted form from <strong>${site_root}</strong>:</p>
        <hr>${formattedForm}
      `,
    });

    console.log("Mail sent:", info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("sendFormattedForm error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
