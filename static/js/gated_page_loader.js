// \static\js\gated_page_loader.js
import { urlizePath } from "/js/urlize.js";
import { getNetlifyAuthHeaders } from "/js/netlifyAuthFetch.js";

/** Clear session credentials and redirect to the login page. */
function forceLogout(redirectUrl) {
  localStorage.removeItem("userLogin_token");
  window.location.href = `/user-login?redirect=${encodeURIComponent(redirectUrl)}&logout=1`;
}

export async function loadGatedPage(container, pagePath, msgBox) {
  // pagePath can be raw .File.Path
	console.log("[loadGatedPage] pagePath:", pagePath, "container:", container, "msgBox:", msgBox);

  if (!container) return console.error("Missing container");
  if (!pagePath) return console.error("Missing pagePath");

  function showMessage(message) {
    if (!msgBox) return console.error("Missing .page_access_message div");
    msgBox.textContent = message;
    msgBox.style.display = "block";
  }

  async function injectHtml(html) {
    console.log("[injectHtml] Injecting HTML:", html);
    container.innerHTML = html;
    const scripts = Array.from(container.querySelectorAll("script"));
    for (const oldScript of scripts) {
      const isModule = oldScript.type === "module";
      const isSrc = !!oldScript.src;
      let newScript;
      console.log("[injectHtml] Found <script> tag. type:", oldScript.type, "src:", oldScript.src, "content:", oldScript.textContent);
      if (isModule && !isSrc) {
        // Inline module: must append to <head> for execution
        newScript = document.createElement("script");
        newScript.type = "module";
        newScript.textContent = oldScript.textContent;
        try {
          document.head.appendChild(newScript);
        } catch (e) {
          console.error("[injectHtml] Error appending inline module script:", e, "script content:", newScript.textContent);
        }
      } else {
        newScript = document.createElement("script");
        if (oldScript.type) newScript.type = oldScript.type;
        if (isSrc) {
          newScript.src = oldScript.src;
          newScript.async = false;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        try {
          oldScript.replaceWith(newScript);
        } catch (e) {
          console.error("[injectHtml] Error replacing script:", e, "script content:", newScript.textContent);
        }
        if (newScript.type === "module" && newScript.src) await new Promise(r => newScript.onload = r);
      }
    }
    document.dispatchEvent(new Event("gated-page-loaded"));
  }

  try {
    const normalizedPath = urlizePath(pagePath);

    const res = await fetch(`/.netlify/functions/gatedPage?page=${encodeURIComponent(normalizedPath)}`, {
      method: "GET",
      headers: getNetlifyAuthHeaders()
    });

    const contentType = res.headers.get("Content-Type") || "";
    console.log("[loadGatedPage] Response Content-Type:", contentType);

    if (contentType.includes("application/json")) {
      const data = await res.json();
      console.log("[loadGatedPage] JSON response:", data);
      switch (data.action) {
        case "public": showMessage("Public page should not be gate-loaded!"); return;
        case "redirect": return window.location.href = data.location;
        case "forceLogout": return forceLogout(window.location.pathname);
        case "accessDenied": showMessage("Access denied"); return;
        case "notFound": showMessage("Page not found"); return;
        case "error": showMessage("Error loading page"); return;
        case "pageNameMissing": showMessage("Access denied"); return;
        case "methodNotAllowed": showMessage("Method not allowed"); return;
        default: showMessage("Unexpected response"); return;
      }
    }

    if (res.status === 200) {
      const html = await res.text();
      console.log("[loadGatedPage] HTML response:", html);
      await injectHtml(html);
    } else {
      showMessage(`Unexpected status: ${res.status}`);
    }
  } catch (err) {
    console.error("Exception in loadGatedPage fetch:", err);
  }
}

