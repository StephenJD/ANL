// Client-Side: /static/js/authentication_control.js
// - Formats form data client-side using formatFormEmail()
// - Sends formatted form to server (/.netlify/functions/storeFinalForm) to generate/store token securely
// - Optionally emails the form via /.netlify/functions/sendFormattedForm
// - Works for validation: "none", "requestLink", and "submit"

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

  // Trim trailing blank lines
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

  // Determine validation mode from front matter
  let validationMode = window.PAGE_FRONTMATTER?.params?.validation || "none";
  if (typeof validationMode === "string") {
    validationMode = validationMode.split("#")[0].trim().split(/[\s,;]+/).filter(Boolean);
  }

  const requireRequestLink = validationMode.includes("requestLink");
  const requireFinalSubmit = validationMode.includes("submit");

  console.log("[DEBUG] validationMode:", validationMode);
  console.log("[DEBUG] requireRequestLink:", requireRequestLink, "requireFinalSubmit:", requireFinalSubmit);

  // Disable form if requestLink required
  if (requireRequestLink) {
    form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = true);
  } else if (requestBox) {
    requestBox.style.display = "none";
    emailInput?.removeAttribute("required");
  }

  // Handle "request link" button
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
            formName: form.name || document.title,
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

  // Check for token (submit-validated forms)
  const urlQuery = new URLSearchParams(window.location.search);
  const token = urlQuery.get("token");

  if (requireFinalSubmit) {
    if (!token) {
      if (messageBox) messageBox.textContent = "Submission requires a valid token.";
      return;
    }

    try {
      const resp = await fetch("/.netlify/functions/verifyFinalToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await resp.json();

      if (data.valid) {
        window.location.href = `/send_submission_page.html?token=${encodeURIComponent(token)}`;
      } else {
        if (messageBox) messageBox.textContent = "This submission link has expired or is invalid.";
      }
    } catch (err) {
      console.error("[DEBUG] verifyFinalToken error:", err);
    }
  } else {
    // Non-validated form submission
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("[DEBUG] Non-validated form submit triggered");

      // 1️ Format form locally
      const formattedForm = formatFormEmail(form);

      // 2️ Send formatted form to server to generate/store token
      let token;
      try {
        const resp = await fetch("/.netlify/functions/storeFinalForm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formattedForm })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || "Unknown error");
        token = data.token;
        console.log("[DEBUG] Stored form and received token:", token);
      } catch (err) {
        console.error("[DEBUG] storeFinalForm error:", err);
        return;
      }

      // 3️ Optionally send email
      const emailToSend = optionalEmailInput?.value.trim() || null;
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
              token
            }),
          });
          console.log("[DEBUG] Optional email sent to", emailToSend);
        } catch (err) {
          console.error("[DEBUG] Error sending optional email:", err);
        }
      }

      // 4️ Redirect to confirmation page
      const params = new URLSearchParams({ token, validationMode: validationMode.join(",") });
      window.location.href = `/send_submission_page.html?${params.toString()}`;
    });
  }
});
