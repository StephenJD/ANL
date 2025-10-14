// Client-Side: /static/js/form_access_controller.js
// - Sends raw form data to server (/.netlify/functions/submitFormController) to generate/store token securely
// - Works for validation: "none", "requestLink", and "submit"

/*
Client-side: 
Front-matter has validation modes none, requireRequestLink, requireFinalSubmit or requireRequestLink + requireFinalSubmit
non-validated forms may be anonymous and have an optionalEmail. All other forms have submittedBy. 

1. Obtain validation mode from server:getFormFrontMatter.js:
   - requireRequestLink
   - requireFinalSubmit

2. If requireRequestLink:
   a) Display the form but disable all inputs except the form-request-box.
   b) Clicking the request button sends { email, formPath, formName } to server:sendFormAccessLink.js.
      - Server handles token generation, storage, and emailing the access link.

3. If a query Link-token exists and requireRequestLink is true:
   - Verify Link-token by POSTing { token, formPath } to server:verifyToken_ClientWrapper.js.
   - If valid, enable the form inputs. Do NOT trust submittedBy from the client; server will derive it from the token.

4. On form submit:
   - Collect raw form data and optionalEmail only.
   - If requireRequestLink, do NOT send submittedBy; server will read it from the token.
   - POST to /.netlify/functions/submitFormController.js.
   - On success, redirect to /send_submission_page.html?token=<server-generated-token>.

Server-side:
1. If a link-token is requested, generate a secure token using the email and form-name, store it, and email the link to the user (sendFormAccessLink.js).
2. On form-submission submitFormController.js receives raw form data, optionalEmail, and token if present.
3. Server derives submittedBy from the token when requireRequestLink is true; otherwise, uses client-provided submittedBy.
4. Server formats the form (formatFormEmail), generates a secure token, and stores { token, formattedForm, metadata } in secureStore.
5. Emails the form to the client using sendClientEmail.js if optionalEmail or requireFinalSubmit.
6. If requireFinalSubmit is true, that email contains a link to send_submission_page.html with the token. No client redirection occurs.
7. If requireFinalSubmit is false the client returns the token which redirects client to send_submission_page.html with that token.
8. send_submission_page.html retrieves the stored form using the query token; invalid or missing tokens fail.
9. Server handles final submission to Netlify.
*/

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form.verified-form");
  if (!form) return console.log("[DEBUG] No verified form found");

  const requestBox = document.querySelector(".form-request-box");
  const messageBox = requestBox?.querySelector(".token-message");
  const request_link_btn = requestBox?.querySelector(".request-token-btn");
  const emailInput = requestBox?.querySelector(".request-email");

  let requireRequestLink = false;
  let requireFinalSubmit = false;

  // --- 1. Fetch frontmatter to determine validation mode ---
  try {
    const resp = await fetch("/.netlify/functions/getFormFrontMatter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formPath: window.location.pathname })
    });
    const data = await resp.json();
    const validationMode = Array.isArray(data.validationMode) ? data.validationMode : ["none"];
    requireRequestLink = validationMode.includes("requestLink");
    requireFinalSubmit = validationMode.includes("submit");
  } catch (err) {
    console.error("[DEBUG] Failed to get frontmatter:", err);
  }

  // --- 2. Setup form based on requireRequestLink ---
  if (requireRequestLink) {
    if (requestBox) requestBox.style.display = "block";
    form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => {
      if (!el.closest(".form-request-box")) el.disabled = true;
    });
  } else if (requestBox) {
    requestBox.style.display = "none";
  }

  // --- 3. Request link button ---
  if (requireRequestLink && request_link_btn) {
    request_link_btn.addEventListener("click", async () => {
      const email = emailInput?.value.trim();
      if (!email) return alert("Enter your email");

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
        const result = await resp.json();
        alert(result.success ? "Check your email for the link." : "Error sending link: " + (result.error || "unknown"));
      } catch (err) {
        console.error("[DEBUG] sendFormAccessLink error:", err);
        alert("Request failed");
      }
    });
  }

  // --- 4. Verify RequestLink token from URL ---
  const token = new URLSearchParams(window.location.search).get("token");
  if (requireRequestLink && token) {
    try {
      const resp = await fetch("/.netlify/functions/verifyToken_ClientWrapper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, formPath: window.location.pathname })
      });
      const data = await resp.json();
      if (data.valid) {
        form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = false);
        const submittedBy = form.querySelector("#submitted_by");
        if (submittedBy && data.email) {
          submittedBy.value = decodeURIComponent(data.email);
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

  // --- 5. Form submission ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(form).entries());
    const optionalEmail = document.querySelector("#optional_email_field input[type='email']")?.value.trim() || "";
    const formPath = window.location.pathname;

    let payload = { formData, formPath, optionalEmail };
    if (!requireRequestLink) {
      const submittedBy = form.querySelector("#submitted_by")?.value.trim() || "";
      payload.submittedBy = submittedBy;
    } else {
      payload.token = token; // server will derive submittedBy from token
    }

    try {
      const resp = await fetch("/.netlify/functions/submitFormController", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Unknown error");

      // Redirect client to the submission page with token (only for non-final-submit cases)
      if (!requireFinalSubmit) {
        window.location.href = `/send_submission_page.html?token=${encodeURIComponent(data.token)}`;
      } else {
        alert("Check your email for the submission link to finalize your form.");
      }
    } catch (err) {
      console.error("[DEBUG] submitFormController error:", err);
      alert("Form submission failed: " + (err.message || "unknown error"));
    }
  });
});
