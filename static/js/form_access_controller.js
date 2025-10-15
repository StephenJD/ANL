// Client-Side: /static/js/form_access_controller.js
// Loaded by layouts/forms/single.html
/*
Client-side: 
Front-matter has validation options [none, requestLink, Submit]
non-validated forms may be anonymous and have an optionalEmail field. All other forms have submittedBy. 

1. Obtain validation mode from server:getFormFrontMatter.js:
   - requireRequestLink
   - requireFinalSubmit

2. If requireRequestLink:
   a) Display the form but disable all inputs except the form-request-box.
   b) Clicking the request button sends { email, formPath, formName } to server:sendFormAccessLink.js.
      - Server handles token generation, storage, and emailing the access link.

3. If a url_token exists and requireRequestLink is true:
   - Verify url_token by POSTing { url_token, formPath } to server:getRequestLink_fromToken.js.
   - If valid, enable the form inputs. Do NOT trust submittedBy from the client; server will derive it from the token.

4. On form submit:
   - Collect raw form data and optionalEmail only.
   - If requireRequestLink, do NOT send submittedBy; server will read it from the token.
   - POST to /.netlify/functions/submitFormController.js.
   - On success, redirect to /send_submission_page.html?token=<server-generated-token>.

Server-side:
1. If a link-token is requested, generate a secure token using the email and form-name, store it, and email the link to the user (sendFormAccessLink.js).
2. On form-submission submitFormController.js receives raw form data, optionalEmail, and url_token.
3. Server derives submittedBy from the url_token when requireRequestLink is true; otherwise, uses client-provided submittedBy.
4. Server formats the form (formatFormEmail), generates a secure token, and stores { token, formattedForm, metadata } in secureStore.
5. Emails the form to the client using sendClientEmail.js if optionalEmail or requireFinalSubmit.
6. If requireFinalSubmit is true, that email contains a link to send_submission_page.html with the token. No client redirection occurs.
7. If requireFinalSubmit is false submitFormController returns the token which redirects client to send_submission_page.html with that url_token.
8. send_submission_page.html retrieves the stored form using the url_token; invalid or missing tokens fail.
9. Server handles final submission to Netlify.
*/


document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form.verified-form");

  const requestBox = document.querySelector(".form-request-box");
  const messageBox = requestBox?.querySelector(".form-link-message");
  const request_link_btn = requestBox?.querySelector(".request-form-link-btn");
  const emailInput = requestBox?.querySelector(".request-form-link-email");
  const url_token = new URLSearchParams(window.location.search).get("token");
  //console.log("[DEBUG] url_token from URL:", url_token);
  
  let requireRequestLink = false;
  let requireFinalSubmit = false;

  // --- 1. Fetch frontmatter to determine validation mode ---
  try {
    const formPath = window.location.pathname;
    console.debug("[DEBUG] Fetching frontmatter for:", formPath);
    
    const frontMatterObj = await fetch("/.netlify/functions/getFormFrontMatter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formPath })
    });

    let frontMatter;
    try {
      frontMatter = await frontMatterObj.json();
    } catch (jsonErr) {
      const text = await frontMatterObj.text();
      console.error("[DEBUG] JSON parse failed. Raw response text:", text);
      throw jsonErr;
    }
    console.debug("[DEBUG] getFormFrontMatter got :", frontMatter);
    
    const validation = Array.isArray(frontMatter.validation)
      ? frontMatter.validation
      : Array.isArray(frontMatter.validation)
      ? frontMatter.validation
      : ["none"];

    console.debug("[DEBUG] Parsed validation:", validation);
  
    requireRequestLink = validation.includes("requestLink");
    requireFinalSubmit = validation.includes("submit");
  } catch (err) {
    console.error("[DEBUG] Failed to get frontmatter:", err);
  }

  // --- 2. Setup form based on requireRequestLink ---
  if (requestBox && request_link_btn) {
    if (requireRequestLink) { // always start with disabled-form, even if token present, as it may be invalid
      requestBox.style.display = "block";
      form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => {
        if (!el.closest(".form-request-box")) el.disabled = true;
      });

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
              formName: document.title || form.name,
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
    } else {
      requestBox.style.display = "none";
    }
  }

  // --- 3. Verify RequestLink url_token  ---
  //console.debug("[DEBUG] url_token?:", requireRequestLink, url_token);
  
  if (requireRequestLink && url_token) {
    //console.debug("[DEBUG] has url_token:", url_token);

    try {
      const resp = await fetch("/.netlify/functions/getRequestLink_fromToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: url_token })
      });
      const data = await resp.json();
	const valid =
      data.valid &&
      data.email &&
      data.formPath === window.location.pathname;

      if (valid) {
        form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = false);
        const submittedBy = form.querySelector("#submitted_by");
        if (submittedBy) {
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

  // --- 4. Form submission ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.debug("[DEBUG] form_access_controller submit...");

const formElement = document.querySelector("form.verified-form");
const clonedForm = formElement.cloneNode(true);

    clonedForm.querySelectorAll("input, textarea, select").forEach(input => {
      if (input.type === "checkbox" || input.type === "radio") {
        if (input.checked) input.setAttribute("checked", "");
        else input.removeAttribute("checked");
      } else if (input.tagName.toLowerCase() === "textarea") {
        input.textContent = input.value; // ensure textarea contents are preserved
      } else {
        input.setAttribute("value", input.value);
      }
    });
    
    const cleanTitle = frontMatter?.title?.trim() || form.name || "Untitled Form";
    const formPath = window.location.pathname;
    const formData = `<h1>${document.title}</h1>` + clonedForm.outerHTML;
    const submittedBy = form.querySelector("#submitted_by")?.value.trim() || "";
    const optionalEmail = form.querySelector("#optionalEmail input[type='email']")?.value.trim() || "";

    let payload = { formName: cleanTitle , formData, formPath };
    
    if (!requireRequestLink && submittedBy) {
      payload.submittedBy = submittedBy;
    } else if (optionalEmail) {
      payload.optionalEmail = optionalEmail;
    }
    if (url_token) {
     payload.token = url_token;
    }
    console.debug("[DEBUG] form_access_controller:", payload);

    try {
      const resp = await fetch("/.netlify/functions/submitFormController", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
	const text = await resp.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[ERROR] Invalid JSON from submitFormController:", e, text);
        throw new Error("Server returned invalid JSON");
      }

      // Redirect client to the submission page with url_token (only for non-final-submit cases)
      if (data.token) {
        window.location.href = `/send_submission_page.html?token=${encodeURIComponent(data.token)}`;
      } else if (requireFinalSubmit) {
        alert("Check your email for the submission link to finalize your form.");
      } else {
        alert("Form saved, but no token was returned.");
      }
    } catch (err) {
      console.error("[DEBUG] submitFormController error:", err);
      alert("Form submission failed: " + (err.message || "unknown error"));
    }
  });
});
