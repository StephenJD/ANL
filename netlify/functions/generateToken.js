const nodemailer = require("nodemailer");
const crypto = require("crypto");

exports.handler = async (event) => {
  console.log("generateToken invoked", event.httpMethod);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formId = null;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formId = data.formId;
  } catch (e) {
    console.error("JSON parse error:", e);
  }

  if (!email) {
    console.error("Missing email in request body:", event.body);
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing email" }),
    };
  }

  // Generate a secure token (hash of email + date)
  const token = crypto
    .createHash("sha256")
    .update(email + new Date().toISOString().slice(0, 10))
    .digest("hex");

  const link = `https://ascendnextlevel.org.uk/${formId}?token=${token}`;

  console.log(`Sending token link for ${formId} to ${email}`);

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

    console.log("Email sent OK");

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
