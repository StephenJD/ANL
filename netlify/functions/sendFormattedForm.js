// netlify/functions/sendFormattedForm.js
const nodemailer = require("nodemailer");
const { generateSecureToken } = require("./generateSecureToken");
const { storeFinalForm } = require("./tokenStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let email = null;
  let formName = null;
  let formPath = null;
  let formattedForm = null;
  let site_root = null;

  try {
    const data = JSON.parse(event.body);
    email = data.email;
    formName = data.formName;
    formPath = data.formPath;
    formattedForm = data.formattedForm;
    site_root = data.site_root;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  if (!email || !formName || !formattedForm || !site_root) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: "Missing email, formName, formattedForm or site_root",
      }),
    };
  }

  try {
    // Generate final token and link
    const finalToken = generateSecureToken(formattedForm);
    await storeFinalForm(finalToken, formattedForm);
    const finalSubmitLink = `${site_root}/submit_final.html?token=${finalToken}`;

    // Detect local/dev environment safely
    const isDev =
      process.env.NODE_ENV === "development" ||
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS;

    if (isDev) {
      console.log("DEV MODE: would send email to", email);
      console.log("Final Submit Link:", finalSubmitLink);
      console.log("Formatted Form:", formattedForm);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Production SMTP
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
      subject: `Your completed ${formName} form (Review & Final Submit)`,
      text: `Here is a copy of your completed ${formName} form.

If everything looks correct, click the link below to complete submission:
${finalSubmitLink}

----------------------------------
${formattedForm}
`,
      html: `
        <p>Here is a copy of your completed <strong>${formName}</strong> form.</p>
        <p>If everything looks correct, click below to complete your submission:</p>
        <p>
          <a href="${finalSubmitLink}" style="display:inline-block;padding:10px 15px;background-color:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">
            Final Submit
          </a>
        </p>
        <hr>
        <pre style="white-space:pre-wrap;">${formattedForm}</pre>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("Error sending email:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Error sending email" }),
    };
  }
};
