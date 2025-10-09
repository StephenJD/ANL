// Server-Side: /netlify/functions/sendFormattedForm.js
// - Sends stored HTML form to ANL or optional client
// - Optionally appends submission link for validated submissions

const { retrieveFinalForm } = require("./tokenStore");
const nodemailer = require("nodemailer");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { email, token, includeSubmissionLink = false } = JSON.parse(event.body);

    if (!token) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token" }) };
    }

    // Retrieve the stored HTML-formatted form
    const storedForm = await retrieveFinalForm(token);
    if (!storedForm) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    let htmlContent = storedForm;

    // Add submission link only if requested (validated submission)
    if (includeSubmissionLink) {
      const submitUrl = `${process.env.SITE_ROOT || "https://example.com"}/send_submission_page.html?token=${encodeURIComponent(token)}`;
      htmlContent += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
    }

    // Determine recipient(s)
    const recipients = email ? [email] : [process.env.ADMIN_EMAIL || process.env.SMTP_USER];

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

    // Send email to each recipient
    for (const recipient of recipients) {
      await transporter.sendMail({
        from: `"Ascend Next Level" <${process.env.SMTP_USER}>`,
        to: recipient,
        subject: includeSubmissionLink ? "Final Form Submission" : "Your Form Copy",
        html: htmlContent
      });
      console.log(`[DEBUG] Email sent to ${recipient}`);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("sendFormattedForm error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};
