// netlify/functions/sendFormattedForm.js
const nodemailer = require("nodemailer");
const { verifySecureToken } = require("./verifySecureToken"); // adjust path if needed

exports.handler = async (event) => {
  console.log("sendFormattedForm invoked. HTTP method:", event.httpMethod);
  console.log("Raw event.body:", event.body);

  if (event.httpMethod !== "POST") {
    console.warn("Non-POST request received");
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, token, formName, formattedForm, site_root;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    token = data.token;
    formName = data.formName;
    formattedForm = data.formattedForm;
    site_root = data.site_root;

    console.log("Parsed request body:", { email, token, formName, site_root });
  } catch (err) {
    console.error("Invalid JSON in request body:", err, "body:", event.body);
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  if (!email || !token || !formattedForm || !site_root) {
    console.warn("Missing required fields:", { email, token, formattedForm, site_root });
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing required fields" }) };
  }

  try {
    console.log("Verifying token...");
    const valid = await verifySecureToken(token, email + formName);
    console.log("Token verification result:", valid);

    if (!valid) {
      console.warn("Invalid or expired token for email:", email);
      return { statusCode: 403, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const link = `${site_root}/${formName}?token=${token}&email=${encodeURIComponent(email)}`;
    console.log("Email link to include:", link);

    // Log SMTP config (without password)
    console.log("SMTP config:", { host: process.env.SMTP_HOST, user: process.env.SMTP_USER });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    try {
      console.log("Sending email to:", email);
      await transporter.sendMail({
        from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your ${formName} submission`,
        html: `
          <p>Here is your submitted form. You can edit and submit it using the link below:</p>
          <pre>${formattedForm}</pre>
          <p><a href="${link}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">Edit and Submit</a></p>
        `,
      });
      console.log("Email sent successfully to:", email);
    } catch (mailErr) {
      console.error("sendMail failed:", mailErr);
      throw mailErr;
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Unhandled server error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
