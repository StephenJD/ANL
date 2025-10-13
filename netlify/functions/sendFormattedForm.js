// Server-Side: netlify/functions/sendFormattedForm.js
// - Retrieves stored form via token
// - Sends to single recipient using sendEmail
// - Optionally appends submission link or attaches form as a file

const { retrieveFinalForm } = require("./tokenStore");
const sendEmail = require("./sendEmail");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token, email, includeSubmissionLink = false, asAttachment = false } = JSON.parse(event.body);
    if (!token || !email) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing token or email" }) };
    }

    const { formattedForm } = await retrieveFinalForm(token);
    if (!formattedForm ) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid or expired token" }) };
    }

    const htmlContent = formattedForm.replace(/@#/g, includeSubmissionLink ? "(validated)" : "(not validated)");

    let finalHtml = htmlContent;
    if (includeSubmissionLink) {
      const submitUrl = `${process.env.SITE_ROOT || "https://example.com"}/send_submission_page.html?token=${encodeURIComponent(token)}`;
      finalHtml += `<p><a href="${submitUrl}" style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">Click to Submit</a></p>`;
    }

    await sendEmail({
      to: email,
      subject: includeSubmissionLink ? "Final Form Submission" : "Your Form Copy",
      html: finalHtml,
      attachBodyAsFile: asAttachment
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error("sendFormattedForm error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: "Server error" }) };
  }
};

