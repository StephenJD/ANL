// Server-Side: /netlify/functions/sendFormattedForm.js
// - Sends stored HTML form to a single recipient
// - Optionally appends submission link for validated submissions
// - Optionally attaches form as a file

const { retrieveFinalForm } = require("./tokenStore");
const nodemailer = require("nodemailer");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, token, includeSubmissionLink = false, asAttachment = false } = JSON.parse(event.body);

    if (!token || !email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token or email" }) };
    }

    const storedForm = await retrieveFinalForm(token);
    if (!storedForm) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    // Replace "@#" marker depending on validation status
    let htmlContent = storedForm.replace(/@#/g, includeSubmissionLink ? "(validated)" : "(not validated)");

    // Add submission link only if requested
    if (includeSubmissionLink) {
      const submitUrl = `${process.env.SITE_ROOT || "https://example.com"}/send_submission_page.html?token=${encodeURIComponent(token)}`;
      htmlContent += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
    }

    // Setup email transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    const mailOptions = {
      from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
      to: email,
      subject: includeSubmissionLink ? "Final Form Submission" : "Your Form Copy",
      html: htmlContent
    };

    if (asAttachment) {
      mailOptions.attachments = [
        {
          filename: "form.html",
          content: htmlContent,
          contentType: "text/html"
        }
      ];
    }

    await transporter.sendMail(mailOptions);

    console.log(`[DEBUG] Email sent to ${email}, asAttachment=${asAttachment}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error("sendFormattedForm error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
