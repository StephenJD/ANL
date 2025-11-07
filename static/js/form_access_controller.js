// Client-Side: /static/js/form_access_controller.js
// Loaded by layouts/forms/single.html
/*
Client-side: 
Front-matter has validation options [none, requestLink, Submit]
non-validated forms may be anonymous and have an optionalEmail field. All other forms have submittedBy. 

1. Obtain validation mode from server:getFormFrontMatter.js:
   - requireRequestLink
   - requireFinalSubmit
   - 

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

// Client-Side: /static/js/form_access_controller.js
// Loaded by layouts/forms/single.html

// Client-Side: /static/js/form_access_controller.js
// Loaded by layouts/forms/single.html

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
  const container = document.querySelector("#gated-form-placeholder");
  const formPath = window.location.pathname;

  await loadGatedForm(container, formPath);

  // Assign elements after form injection
  form = document.querySelector("form.verified-form");
  requestBox = document.querySelector(".form-request-box");
  submitBox = document.querySelector(".form-submit-box");
  messageBox = requestBox?.querySelector(".form-link-message");
  requestBtn = requestBox?.querySelector(".request-form-link-btn");
  emailInput = requestBox?.querySelector(".request-form-link-email");
  
  await fetchFrontMatter();

  setupAccessControls();
  await verifyFormAccessToken();
  document.dispatchEvent(new Event("access-validated"));

  form?.addEventListener("submit", handleFormSubmission);
});

document.addEventListener("DOMContentLoaded", () => {
  const breadcrumbLinks = document.querySelectorAll(".breadcrumb a");
  console.log("[DEBUG] Found breadcrumb links:", breadcrumbLinks);

  breadcrumbLinks.forEach(a => {
    a.addEventListener("click", e => {
      console.log("[DEBUG] Clicked breadcrumb link:", a.href, "default prevented?", e.defaultPrevented);
    });
  });
});

window.requestAccount = async function (email) {
  try {
    requireRequestLink = true;
    restrictUsers = true;
    if (emailInput) emailInput.value = email || "";
    console.log("requestAccount(): email set to", emailInput?.value);
    return await handleRequestButtonClick();
  } catch (err) {
    console.error("requestAccount() failed:", err);
    return false;
  }
};

async function loadGatedForm(container, formName) {
  console.log("[DEBUG] loadGatedForm called with:", { container, formName });

  if (!container || !formName) {
    console.error("[DEBUG] Missing container or formName");
    return;
  }

  try {
    const token = localStorage.getItem("userLogin_token");
    const fetchURL = `/.netlify/functions/gatedForm?form=${encodeURIComponent(formName)}`;

    console.log("[DEBUG] About to fetch gatedForm:", fetchURL, "with token?", !!token);

    const res = await fetch(fetchURL, {
      method: "GET",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    console.log("[DEBUG] fetch completed. Status:", res.status);

    if (res.status === 200) {
  const html = await res.text();
  container.innerHTML = html;          // first inject HTML
  //console.log("[DEBUG] container innerHTML after injection:", container.innerHTML);

  //rebindBreadcrumbLinks(container);    // now container is a DOM element
  document.dispatchEvent(new Event("gated-form-loaded"));
  console.log("[DEBUG] Form loaded successfully into container");

    } else if (res.status === 302) {
      const location = res.headers.get("Location");
      console.warn("[DEBUG] Redirecting to:", location);
      window.location.href = location;
    } else if (res.status === 403) {
      container.innerHTML = `<div style="color:red;">Access denied</div>`;
      console.warn("[DEBUG] Access denied for this form");
    } else if (res.status === 404) {
      container.innerHTML = `<div style="color:red;">Form not found</div>`;
      console.error("[DEBUG] Form not found");
    } else {
      container.innerHTML = `<div style="color:red;">Error loading form</div>`;
      console.error("[DEBUG] Unexpected status:", res.status);
    }
  } catch (err) {
    console.error("[DEBUG] Exception in loadGatedForm fetch:", err);
  }
}

window.loadGatedForm = loadGatedForm;

/*
function rebindBreadcrumbLinks(container) {
  const links = container.querySelectorAll(".breadcrumb a");
  console.log("[DEBUG] rebindBreadcrumbLinks called on container:", container);
  console.log("[DEBUG] Found breadcrumb links:", links);

  links.forEach(a => {
    console.log("[DEBUG] Binding click to link:", a.href);
    a.addEventListener("click", e => {
      e.preventDefault();
      console.log("[DEBUG] Breadcrumb link clicked:", a.href);
      window.location.href = a.href;
    });
  });
}
*/

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
    console.error("[DEBUG] fetchFrontMatter() fetch failed:", err);
    return null;
  }

  cleanTitle = frontMatter?.title?.trim() || form?.name || "Untitled Form";
  restrictUsers = Array.isArray(frontMatter?.restrict_users) &&
                  frontMatter.restrict_users.some(r => r && r.toLowerCase() !== "none");

  const validation = Array.isArray(frontMatter?.validation) ? frontMatter.validation : ["none"];
  requireRequestLink = validation.includes("requestLink");
  requireFinalSubmit = validation.includes("submit");
  showSubmit = !validation.includes("noSend");
}

function setupAccessControls() {
  if (!form) return;

  const allInputs = form.querySelectorAll('input, textarea, select, button[type="submit"]');
  allInputs.forEach(el => el.disabled = !!requireRequestLink);

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

window.setupAccessControls = setupAccessControls;

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
    return false;
  }

  const result = await sendAccessLink(email);
  alert(result.success ? "Check your email for the link." : "Error sending link: " + (result.error || "unknown"));
  return true;
}

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

    form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = false);
    emailInput?.removeAttribute("required");
    const submittedBy = form.querySelector("#submitted_by");
    if (submittedBy) {
      submittedBy.value = decodeURIComponent(data.email);
      submittedBy.setAttribute("readonly", "true");
      submittedBy.setAttribute("aria-readonly", "true");
    }
    if (requestBox) requestBox.style.display = "none";
  } catch (err) {
    console.error("verifyFormAccessToken error:", err);
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

  const formData = `<h2>${cleanTitle}</h2>` + clonedForm.outerHTML;
  const submittedBy = form.querySelector("#submitted_by")?.value.trim() || "";
  const optionalEmail = form.querySelector("#optionalEmail input[type='email']")?.value.trim() || "";
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
      alert("Form saved, but no token was returned.");
    }
  } catch (err) {
    console.error("submitFormController error:", err);
    alert("Form submission failed: " + (err.message || "unknown error"));
  }
}
