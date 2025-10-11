// Client-Side: /static/js/authentication_control.js
// - Formats form data client-side using formatFormEmail()
// - Sends formatted form to server (/.netlify/functions/storeFinalForm) to generate/store token securely
// - Optionally emails the form via /.netlify/functions/sendFormattedForm
// - Works for validation: "none", "requestLink", and "submit"
/*
Client-side:
1. If requireRequestLink then the entire form should be visible but disabled.
 a) Only the form-request-box should be enabled.
 b) Clicking Send button stores a validation token and sends the link with the token to the email-address using netlify/functions/sendFormAccessLink.js
2. If requireRequestLink then only enable the form if the query token is valided by verifyToken.
3. On form "Submit" Serialize and format the form (/static/js/formatFormData.js). 
4. Send the formatted form to /netlify/functions/storeFinalForm.js 
5. storeFinalForm.js generates the secure token, stores the form along with the token, and returns the token to the client. 
6.
  a) If validate-submit then email form to client with link to send_submission_page.html, no immediate redirection. 
  b) If not validate-submit [if requireRequestLink or optional email given, email form to client] then redirect to send_submission_page.html. 

Server-side:
1. If a link-token is requested, use form-name & email address as the "source" for generating a token.
2. storeFinalForm.js receives { formattedForm }. 
3. Calls generateSecureToken(formattedForm). 
4. Stores { token, formattedForm } using tokenStore. 
5. Returns { token } to the client. 
6. On send_submission_page.html, Retrieve form using query-token (will fail if client attempts with wrong token) 
7. Send to Netlify.
*/

// --- Helper: formatFormEmail (client-side only) ---
function formatFormEmail(form, includeUnselected = false) {
  const output = [];

  form.querySelectorAll("fieldset").forEach((fs) => {
    const fieldsetLines = [];

    // Include legend
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input) => {
      let labelText = "";
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label"))
        labelText = input.closest("label").textContent.trim();
      else labelText = input.name || "";

      // Skip empty or unselected fields unless includeUnselected=true
      if (!includeUnselected) {
        if ((input.type === "checkbox" || input.type === "radio") && !input.checked)
          return;
        if (!["checkbox", "radio"].includes(input.type) && !input.value.trim())
          return;
      }

      let line = labelText;
      if (input.type === "checkbox" || input.type === "radio") {
        line = input.checked ? line : `<s>${line}</s>`;
      } else {
        line += `: ${input.value || ""}`;
      }

      fieldsetLines.push(line);
    });

    if (fieldsetLines.length) output.push(...fieldsetLines, ""); // spacing
  });

  while (output.length && !output[output.length - 1].trim()) output.pop();

  return output.join("\n");
}

// --- Main Logic ---
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form.verified-form");
  if (!form) return console.log("[DEBUG] No verified form found");

  const requestBox = document.querySelector(".form-request-box");
  const optionalEmailInput = document.querySelector("#optional_email_field input[type='email']");
  const messageBox = requestBox?.querySelector(".token-message");
  const btn = requestBox?.querySelector(".request-token-btn");
  const emailInput = requestBox?.querySelector(".request-email");
  console.log("[DEBUG] requestBox found:", !!requestBox);
  if (requestBox) requestBox.style.display = "block";

  let validationMode = ["none"];
  
  try {
    const params = JSON.parse(window.PAGE_FRONTMATTER?.params || "{}");
    let val = params.validation || "none";
    if (typeof val === "string") {
      val = val
        .split("#")[0]
        .trim()
        .split(/[\s,;|]+/)
        .filter(Boolean);
      validationMode = val.length ? val : ["none"];
    }
  } catch (e) {
    console.warn("[DEBUG] Failed to parse PAGE_FRONTMATTER.params:", e);
  }

  const requireRequestLink = validationMode.includes("requestLink");
  const requireFinalSubmit = validationMode.includes("submit");
  const formTitle = window.PAGE_FRONTMATTER?.title || document.title || form.name;
  
  console.log("[DEBUG] validationMode:", validationMode);
  console.log("[DEBUG] requireRequestLink:", requireRequestLink, "requireFinalSubmit:", requireFinalSubmit);

  if (requireRequestLink) {
    if (requestBox) requestBox.style.display = "block";
    form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => {
      if (!el.closest(".form-request-box")) el.disabled = true;
    });
  } else if (requestBox) {
    requestBox.style.display = "none";
    emailInput?.removeAttribute("required");
  }

  if (requireRequestLink && btn) {
    btn.addEventListener("click", async () => {
      const email = emailInput?.value.trim();
      if (!email) return alert("Enter your email first");

      try {
        const resp = await fetch("/.netlify/functions/sendFormAccessLink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            formPath: window.location.pathname,
            formName: formTitle,
            site_root: window.location.origin
          })
        });
        const data = await resp.json();
        alert(data.success ? "Check your email for the link." : "Error sending link: " + (data.error || "unknown error"));
        console.log("[DEBUG] sendFormAccessLink response:", data);
      } catch (err) {
        console.error("[DEBUG] sendFormAccessLink error:", err);
        alert("Request failed");
      }
    });
  }

  // --- Token verification ---
  const urlQuery = new URLSearchParams(window.location.search);
  const token = urlQuery.get("token");
  const urlEmail = urlQuery.get("email") || null;

  if (requireRequestLink && token) {
    try {
      const resp = await fetch("/.netlify/functions/verifyToken_ClientWrapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: urlEmail, formPath: window.location.pathname })
      });
      const data = await resp.json();

      if (data.valid) {
        const verifiedEmail = (data.email && String(data.email).trim()) || urlEmail;
        console.log("[DEBUG] Token verified for:", verifiedEmail);

        form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => {
          el.disabled = false;
        });

        const submittedBy = form.querySelector("#submitted_by");
        if (submittedBy && verifiedEmail) {
          submittedBy.value = decodeURIComponent(verifiedEmail);
          submittedBy.setAttribute("readonly", "true");
          submittedBy.setAttribute("aria-readonly", "true");
        }

        if (requestBox) requestBox.style.display = "none";
      } else if (messageBox) {
        messageBox.textContent = "This access link is invalid or expired.";
      }
    } catch (err) {
      console.error("[DEBUG] verifyToken error:", err);
      if (messageBox) messageBox.textContent = "Verification failed.";
    }
  }

  // --- Submit handler ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("[DEBUG] Form submit triggered");

    const formattedForm = formatFormEmail(form);
    const submittedByInput = form.querySelector("#submitted_by");
    const submittedByEmail = submittedByInput?.value.trim() || "";
    const optionalEmail = (document.querySelector("#optional_email_field input[type='email']")?.value || "").trim() || "";

    let storedToken;
    try {
      const resp = await fetch("/.netlify/functions/storeFinalForm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formattedForm })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Unknown error");
      storedToken = data.token;
      console.log("[DEBUG] Stored form and received token:", storedToken);
    } catch (err) {
      console.error("[DEBUG] storeFinalForm error:", err);
      return;
    }

    if (requireFinalSubmit) {
      if (!submittedByEmail) {
        alert("Missing 'submitted_by' email.");
        return;
      }
      try {
        await fetch("/.netlify/functions/sendFormattedForm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: submittedByEmail,
            formName: form.name || document.title,
            formPath: window.location.pathname,
            formattedForm,
            site_root: window.location.origin,
            token: storedToken,
            includeSubmissionLink: true
          }),
        });
        console.log("[DEBUG] Final-submit link emailed to", submittedByEmail);
      } catch (err) {
        console.error("[DEBUG] Error sending final-submit email:", err);
      }
      alert("Form saved. Check your email for the final submission link.");
      return;
    }

    let emailToSend = null;
    if (requireRequestLink) {
      if (!submittedByEmail) {
        alert("Missing 'submitted_by' email.");
        return;
      }
      emailToSend = submittedByEmail;
    } else {
      if (optionalEmail) emailToSend = optionalEmail;
    }

    if (emailToSend) {
      try {
        await fetch("/.netlify/functions/sendFormattedForm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailToSend,
            formName: form.name || document.title,
            formPath: window.location.pathname,
            formattedForm,
            site_root: window.location.origin,
            token: storedToken,
            includeSubmissionLink: false
          }),
        });
        console.log("[DEBUG] Form emailed to", emailToSend);
      } catch (err) {
        console.error("[DEBUG] Error sending email:", err);
      }
    }

    const params = new URLSearchParams({ token: storedToken, validationMode: validationMode.join(",") });
    window.location.href = `/send_submission_page.html?${params.toString()}`;
  });
});
