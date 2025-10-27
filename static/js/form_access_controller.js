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

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form.verified-form");
  const requestBox = document.querySelector(".form-request-box");
  const submitBox = document.querySelector(".form-submit-box");
  const messageBox = requestBox?.querySelector(".form-link-message");
  const requestBtn = requestBox?.querySelector(".request-form-link-btn");
  let emailInput = requestBox?.querySelector(".request-form-link-email");
  const urlToken = new URLSearchParams(window.location.search).get("token");

  let requireRequestLink = false;
  let requireFinalSubmit = false;
  let showSubmit = true;
  let cleanTitle = null;
  let restrictUsers = false;
  let frontMatter = null;

 window.requestAccount = async function (email) {
  try {
    requireRequestLink = true;
    restrictUsers = true;
    if (emailInput) emailInput.value = email || "";
    console.log("requestAccount(): email set to", emailInput?.value); 
    return await handleRequestButtonClick();;
  } catch (err) {
    console.error("requestAccount() failed:", err);
    return false;
  }
};

  async function fetchFrontMatter() {
    console.log("Fetching frontmatter for:", window.location.pathname);
    try {
      const res = await fetch("/.netlify/functions/getFormFrontMatter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formPath: window.location.pathname })
      });
      frontMatter = await res.json();
      cleanTitle = frontMatter?.title?.trim() || form.name || "Untitled Form";
      restrictUsers =
        frontMatter?.restrict_users !== false &&
        !(Array.isArray(frontMatter?.restrict_users)
          ? frontMatter.restrict_users.includes("none")
          : frontMatter?.restrict_users === "none");
      const validation = Array.isArray(frontMatter.validation) ? frontMatter.validation : ["none"];
      requireRequestLink = validation.includes("requestLink");
      requireFinalSubmit = validation.includes("submit");
	showSubmit = !validation.includes("noSend")
console.log("fetchFrontMatter:", {
  title: frontMatter?.title,
  path: frontMatter?.path,
  restrict_users: frontMatter?.restrict_users,
  restrictUsers,
  validation
});

    } catch (err) {
      console.error("Failed to get frontmatter:", err);
    }
  }
  
async function controlRestrictedAccess(frontMatter) {
  console.log("controlRestrictedAccess: restrictUsers:", restrictUsers, "session_token:", localStorage.getItem("session_token"));

  const sessionToken = localStorage.getItem("session_token");
  const userRole = JSON.parse(localStorage.getItem("user_role") || "[]");
  const allowedRoles = Array.isArray(frontMatter?.restrict_users)
    ? frontMatter.restrict_users.map(r => r.toLowerCase())
    : [String(frontMatter?.restrict_users || "").toLowerCase()];

  if (restrictUsers) {
    if (!sessionToken) {
      const currentPath = window.location.pathname;
      console.log("Redirecting now to:", `/user-login?redirect=${encodeURIComponent(currentPath)}`);
      window.location.href = `/user-login?redirect=${encodeURIComponent(currentPath)}`;
      return;
    }

    if (
         allowedRoles.length &&
         !userRole.some(ur =>
           allowedRoles.some(ar => ar.toLowerCase() === ur.toLowerCase())
         )
       ){
      document.body.innerHTML = `
        <div style="margin:3em auto;max-width:600px;text-align:center;font-family:sans-serif;">
          <h2 style="color:red;">Access Denied</h2>
          <p>Your role "<strong>${userRole}</strong>" does not have permission to access this form.</p>
          <p>Allowed roles: <strong>${allowedRoles.join(", ")}</strong></p>
        </div>
      `;
      return;
    }
  }
  return true;
}
  
  function setupAccessControls() {
    console.log("setupAccessControls: requireRequestLink", requireRequestLink, "restrictUsers", restrictUsers, "showSubmit", showSubmit);

    const allInputs = form.querySelectorAll('input, textarea, select, button[type="submit"]');
  
    allInputs.forEach(el => el.disabled = requireRequestLink);

    if (!requestBox || !requestBtn) return;
    if (requireRequestLink) {
      requestBox.style.display = "block";
      allInputs.forEach(el => {
       if (!el.closest(".form-request-box")) el.disabled = true;
      });
      requestBtn.addEventListener("click", handleRequestButtonClick);
    } else {
      requestBox.style.display = "none";
    }
    if (showSubmit) {
	submitBox.style.display = "block";
    } else {
      submitBox.style.display = "none";
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
    console.log("isEmailAllowed: requireRequestLink", requireRequestLink, "restrictUsers", restrictUsers);

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
      console.log("handleRequestButtonClick: isEmailAllowed?", checkData.success);

      if (messageBox) {
        messageBox.textContent = "This email is not authorized to request access for this form.";
      }
      return false;
    }

    const result = await sendAccessLink(email);
    alert(result.success ? "Check your email for the link." : "Error sending link: " + (result.error || "unknown"));
    return true;
  }

  async function verifyToken() {
    if (!urlToken) return;
    console.log("verifyToken:", urlToken);
    try {
      const resp = await fetch("/.netlify/functions/secureStore_ClientAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bin: "ACCESS_TOKEN_BIN", token: urlToken, formPath: window.location.pathname })
      });
      const data = await resp.json();
      const valid = data.valid && data.email && data.formPath === window.location.pathname;
      if (!valid) {
        console.log("verifyToken: invalid");
        if (messageBox) messageBox.textContent = "This access link is invalid or expired.";
        return;
      }
      console.log("verifyToken: OK");

      form.querySelectorAll('input, textarea, select, button[type="submit"]').forEach(el => el.disabled = false);
      emailInput.removeAttribute("required");
      const submittedBy = form.querySelector("#submitted_by");
      if (submittedBy) {
        submittedBy.value = decodeURIComponent(data.email);
        submittedBy.setAttribute("readonly", "true");
        submittedBy.setAttribute("aria-readonly", "true");
      }
      if (requestBox) requestBox.style.display = "none";
    } catch (err) {
      console.error("verifyToken error:", err);
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

    const formPath = window.location.pathname;
    const formData = `<h2>${cleanTitle}</h2>` + clonedForm.outerHTML;
    const submittedBy = form.querySelector("#submitted_by")?.value.trim() || "";
    const optionalEmail = form.querySelector("#optionalEmail input[type='email']")?.value.trim() || "";
    const payload = { bin: "ACCESS_TOKEN_BIN", formName: cleanTitle, formData, formPath };
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

  await fetchFrontMatter();
  const ok = await controlRestrictedAccess(frontMatter);
  if (!ok) return;
  setupAccessControls();
  await verifyToken();
  document.dispatchEvent(new Event("access-validated"));
  form.addEventListener("submit", handleFormSubmission);
  
});

