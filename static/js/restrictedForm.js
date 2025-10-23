// /static/js/restrictedForm.js
console.log("restrictedForm.js executing");

export async function enforceAccess(formPath, containerSelector = ".form-container") {
  console.log("[DEBUG] restrictedForm.js loaded");

  const container = document.querySelector(containerSelector);
  if (!container) return null;

  const token = localStorage.getItem("login_token");
  console.log("[DEBUG] token:", token);

  // Fetch form metadata
  let metadata;
  try {
    const resp = await fetch("/.netlify/functions/getRestrictedForm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formPath, loginToken: token })
    });
    metadata = await resp.json();
  } catch (err) {
    console.error("[DEBUG] Failed to fetch form metadata:", err);
    return null;
  }

  console.log("[DEBUG] metadata:", metadata);

  // If restrict_users is false or missing, allow unrestricted access
  if (!metadata?.restrict_users) {
    console.log("[DEBUG] unrestricted access allowed");
    return metadata;
  }

  // Check token
  if (!token) {
    console.log("[DEBUG] No token, redirecting to login...");
    window.location.href = "/user-login.html";
    return null;
  }

  // Token present, check against server response
  if (metadata.allowed === false) {
    console.log("[DEBUG] token invalid or insufficient role, redirecting...");
    window.location.href = "/user-login.html";
    return null;
  }

  console.log("[DEBUG] access granted for token");
  return metadata;
}

// Auto-run on page load
document.addEventListener("DOMContentLoaded", () => {
  enforceAccess(window.location.pathname, ".form-container");
});

