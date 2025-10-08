// File location: /static/js/authentication_control.js

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('form.verified-form');
  const requestBox = document.querySelector('.form-request-box');

  if (!form || !requestBox) {
    console.log("[DEBUG] Form or requestBox not found");
    return;
  }

  const messageBox = requestBox.querySelector('.token-message');
  const btn = requestBox.querySelector('.request-token-btn');
  const emailInput = requestBox.querySelector('.request-email');

  let validationMode = window.PAGE_FRONTMATTER?.params?.validation || "none";
  if (typeof validationMode === "string") {
    validationMode = validationMode.split('#')[0].trim().split(/[\s,;]+/).filter(Boolean);
  }
  console.log("[DEBUG] validationMode:", validationMode);
  console.log("[DEBUG] attaching listener to form:", form, "form name:", form?.name);
  
  const requireRequestLink = validationMode.includes("requestLink");
  const requireFinalSubmit = validationMode.includes("submit");
  console.log("[DEBUG] requireRequestLink:", requireRequestLink, "requireFinalSubmit:", requireFinalSubmit);

  // Disable inputs if requestLink required
  form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = requireRequestLink);

  if (!requireRequestLink) {
  requestBox.style.display = 'none';
  const emailField = requestBox.querySelector('.request-email');
  if (emailField) emailField.removeAttribute('required');
}


  document.querySelectorAll('input[type="date"].autofill-today').forEach(input => {
    input.valueAsDate = new Date();
  });

  if (requireRequestLink) {
    btn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      console.log("[DEBUG] Request link click, email:", email);
      if (!email) { alert("Enter your email first"); return; }

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
        console.log("[DEBUG] sendFormAccessLink response:", data);
        alert(data.success ? "Check your email for the link." : "Error sending link: " + (data.error || "unknown error"));
      } catch (err) {
        console.error("[DEBUG] sendFormAccessLink error:", err);
        alert("Request failed");
      }
    });
  }

  // Token verification for submit-required forms
  const urlQuery = new URLSearchParams(window.location.search);
  const token = urlQuery.get('token');
  const email = urlQuery.get('email');

  if (requireFinalSubmit) {
    console.log("[DEBUG] Submit validation required, token:", token);
    if (!token) return;
    try {
      const resp = await fetch("/.netlify/functions/verifyFinalToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await resp.json();
      console.log("[DEBUG] verifyFinalToken response:", data);
      if (data.valid) {
        window.location.href = `/send_submission_page.html?token=${encodeURIComponent(token)}`;
      } else {
        messageBox.textContent = "This submission link has expired or is invalid.";
      }
    } catch (err) {
      console.error("[DEBUG] verifyFinalToken error:", err);
    }
  } else {
    // No submit validation
    console.log("[DEBUG] No submit validation, attaching submit listener");
    const optionalEmailFieldset = document.querySelector('#optional_email_field');
    const optionalEmailInput = optionalEmailFieldset ? optionalEmailFieldset.querySelector("input[type='email']") : null;
    const submittedByElem = form.querySelector('#submitted_by');
    const hasSubmittedBy = submittedByElem !== null;
    console.log("[DEBUG] optionalEmailFieldset:", optionalEmailFieldset, "submittedByElem:", submittedByElem);

    if (!hasSubmittedBy && optionalEmailFieldset) optionalEmailFieldset.style.display = 'block';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log("[DEBUG] Form submit triggered");

      const optionalEmailVal = optionalEmailInput ? optionalEmailInput.value.trim() : '';
      const submittedByVal = submittedByElem ? submittedByElem.value.trim() : '';
      const emailToSend = optionalEmailVal || (submittedByVal ? submittedByVal : null);
      console.log("[DEBUG] emailToSend:", emailToSend);

      if (emailToSend) {
        const fd = new FormData(form);
        const pairs = [];
        for (const [k, v] of fd.entries()) pairs.push(`${k}: ${v}`);
        const formattedForm = pairs.join('\n');
        console.log("[DEBUG] formattedForm:", formattedForm);
        const payload = {
          email: emailToSend,
          formName: form.name || document.title,
          formPath: window.location.pathname,
          formattedForm,
          site_root: window.location.origin
        };
        try {
          const resp = await fetch('/.netlify/functions/sendFormattedForm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          console.log("[DEBUG] sendFormattedForm response:", resp);
        } catch (err) {
          console.error("[DEBUG] sendFormattedForm error:", err);
        }
      }

      console.log("[DEBUG] Redirecting to send_submission_page.html");
      window.location.href = `/send_submission_page.html`;
    });
  }
});
