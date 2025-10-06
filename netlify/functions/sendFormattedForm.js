// netlify/functions/sendFormattedForm.js
const nodemailer = require("nodemailer");

console.log("sendFormattedForm file loaded");
try {
  console.log("Nodemailer import succeeded");
} catch (err) {
  console.error("Nodemailer import failed:", err);
}

exports.handler = async (event) => {
  console.log("sendFormattedForm handler invoked");
  console.log("HTTP method:", event.httpMethod);
  console.log("Raw event.body:", event.body);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email, formName, formattedForm, site_root;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formName = data.formName;
    formattedForm = data.formattedForm;
    site_root = data.site_root;

    console.log("Parsed request body:", { email, formName, site_root });
  } catch (err) {
    console.error("Invalid JSON in request body:", err);
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  if (!email || !formattedForm || !site_root) {
    console.warn("Missing required fields:", { email, formattedForm, site_root });
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing required fields" }) };
  }

  try {
    const link = `${site_root}/${formName}`;
    console.log("Email link to include:", link);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

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

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("sendFormattedForm unhandled error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
