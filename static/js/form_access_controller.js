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
   - Verify url_token by POSTing { url_token, formPath } to server:secureStore_ClientAccess.js
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

import { loadGatedPage } from './gated_page_loader.js';

export let restrictUsers = false;
let requireRequestLink = false;
let requireFinalSubmit = false;
let showSubmit = true;
let cleanTitle = null;
let frontMatter = null;

// DOM elements
let form = null;
let requestBox = null;
let submitBox = null;
let emailInput = null;
let requestBtn = null;
let messageBox = null;

const urlToken = new URLSearchParams(window.location.search).get("token");

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector(".gated_page_placeholder");
  if (typeof pagePath === "undefined") {
    var pagePath = window.location.pathname;
  }
  messageBox = document.querySelector(".page_access_message");
  console.log("[DEBUG] container:", container);
  console.log("[DEBUG] pagePath:", pagePath);

  if (!pagePath) {
    console.error("[DEBUG] Missing pagePath");
    return;
  }
  
  await fetchFrontMatter();
  console.table(frontMatter);

  if (container && pagePath && frontMatter?.access?.some(a => a.toLowerCase() !== "public")) {
    await loadGatedPage(container, pagePath, messageBox);
  }

  // Assign elements after form injection
  form = document.querySelector("form.verified-form");
  requestBox = document.querySelector(".form-request-box");
  submitBox = document.querySelector(".form-submit-box");
  emailInput = document.querySelector(".request-form-link-email");
  requestBtn = document.querySelector(".request-form-link-btn");
  
  setupAccessControls();
  await verifyFormAccessToken();
  document.dispatchEvent(new Event("access-validated"));

  form?.addEventListener("submit", handleFormSubmission);
});

async function fetchFrontMatter() {
  try {
    const res = await fetch("/.netlify/functions/getFormFrontMatter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formPath: window.location.pathname })
    });
    const fm = await res.json();
    if (!fm.success) return null;
    frontMatter = fm;
  } catch (err) {
    console.error("[form_access_controller] fetchFrontMatter() fetch failed:", err);
    return null;
  }

  cleanTitle = frontMatter?.title?.trim() || form?.name || "Untitled Form";
  restrictUsers = Array.isArray(frontMatter?.access) &&
                  frontMatter.access.some(r => r && r.toLowerCase() !== "none");

  const validation = Array.isArray(frontMatter?.validation) ? frontMatter.validation : ["none"];
  requireRequestLink = validation.includes("requestLink");
  requireFinalSubmit = validation.includes("submit");
  showSubmit = !validation.includes("noSend");
}

function setupAccessControls() {
  if (!form) return;
  if (requireRequestLink) {
    const allInputs = form.querySelectorAll('input, textarea, select, button[type="submit"]');
    allInputs.forEach(el => el.disabled = true);
  }

  if (requestBox) {
    if (requireRequestLink) {
      requestBox.style.display = "block";
      allInputs.forEach(el => {
        if (!el.closest(".form-request-box")) el.disabled = true;
      });
      if (requestBtn) requestBtn.addEventListener("click", handleRequestButtonClick);
    } else {
      requestBox.style.display = "none";
    }
  }

  if (submitBox) {
    submitBox.style.display = showSubmit ? "block" : "none";
  }
}

async function sendAccessLink(email) {
  const resp = await fetch("/.netlify/functions/sendFormAccessLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, formPath: window.location.pathname, formName: cleanTitle, site_root: window.location.origin })
  });
  return resp.json();
}

async function isEmailAllowed(email) {
  if (!restrictUsers) return { success: true };
  const resp = await fetch("/.netlify/functions/verifyUser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "checkIsPermittedUser", email })
  });
  return resp.json();
}

async function handleRequestButtonClick() {
  const email = emailInput?.value.trim();
  if (!email) return alert("Enter your email");

  const checkData = await isEmailAllowed(email);
  if (!checkData.success) {
    if (messageBox) {
      messageBox.textContent = "This email is not authorized to request access for this form.";
    }
    console.log("[form_access_controller] email is not authorized", email);
    return false;
  }

  const result = await sendAccessLink(email);
  console.log("[form_access_controller] email sent");
  //alert(result.success ? "Check your email for the link." : "Error sending link: " + (result.error || "unknown"));
  return true;
}

  async function requestAccount(email) {
    try {
      if (emailInput) emailInput.value = email || "";
      console.log("[user-login] requestAccount(): email set to", emailInput?.value);
      return await handleRequestButtonClick();
    } catch (err) {
      console.error("[user-login] requestAccount() failed:", err);
      return false;
    }
  }
  
window.requestAccount = requestAccount;

async function verifyFormAccessToken() {
  if (!urlToken) return;
  try {
    const resp = await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bin: "ACCESS_TOKEN_BIN", token: urlToken, formPath: window.location.pathname })
    });
    const data = await resp.json();
    const valid = data.valid && data.email && data.formPath === window.location.pathname;
    if (!valid) {
      if (messageBox) messageBox.textContent = "This access link is invalid or expired.";
      return;
    }
    if (requireRequestLink) {
      form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = false);
      emailInput?.removeAttribute("required");
    }
    const submittedBy = form.querySelector("#submitted_by");
    if (submittedBy) {
      submittedBy.value = decodeURIComponent(data.email);
      submittedBy.setAttribute("readonly", "true");
      submittedBy.setAttribute("aria-readonly", "true");
    }
    if (requestBox) requestBox.style.display = "none";
  } catch (err) {
    console.error("[form_access_controller] verifyFormAccessToken error:", err);
    if (messageBox) messageBox.textContent = "Verification failed.";
  }
}

async function handleFormSubmission(e) {
  e.preventDefault();
  const clonedForm = form.cloneNode(true);
  clonedForm.querySelectorAll("input, textarea, select").forEach(input => {
    if (input.type === "checkbox" || input.type === "radio") {
      if (input.checked) input.setAttribute("checked", ""); else input.removeAttribute("checked");
    } else if (input.tagName.toLowerCase() === "textarea") {
      input.textContent = input.value;
    } else {
      input.setAttribute("value", input.value);
    }
  });

  let submittedBy = "";
  const submittedInput = clonedForm.querySelector("#submitted_by");
  if (submittedInput) {
    submittedBy = submittedInput.value.trim();
    submittedInput.setAttribute("value", `{@S}${submittedBy}{/@}`);
    console.log("[form_access_controller] submittedInput found.");
  }
  
  let optionalEmail = "";
  const optionalEmailInput = clonedForm.querySelector("#optionalEmail input[type='email']");
  if (optionalEmailInput) {
    optionalEmail = optionalEmailInput.value.trim();
    console.log("[form_access_controller] optionalEmailInput found.");
  }

  const formData = clonedForm.outerHTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "\'");

  //console.log("[form_access_controller] handleFormSubmission clone:", formData);

  const payload = { bin: "ACCESS_TOKEN_BIN", formName: cleanTitle, formData, formPath: window.location.pathname }; 

  if (!requireRequestLink && submittedBy) payload.submittedBy = submittedBy;
  else if (optionalEmail) payload.optionalEmail = optionalEmail;
  if (urlToken) payload.token = urlToken;

  try {
    const resp = await fetch("/.netlify/functions/submitFormController", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();

    if (requireFinalSubmit) {
      alert("Check your email for the submission link to finalize your form.");
    } else if (data.token) {
      window.location.href = `/send_submission_page.html?token=${encodeURIComponent(data.token)}`;
    } else {
      alert("Form saved, but no token was returned. Please notify website administrator.");
    }
  } catch (err) {
    console.error("[form_access_controller] error:", err);
    alert("Form submission failed: " + (err.message || "unknown error"));
  }
}
