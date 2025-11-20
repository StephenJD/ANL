// Client-side: /static/js/gated_page_loader.js

export async function loadGatedPage(container, pagePath, msgBox) {
  if (!container) return console.error("Missing container");
  if (!pagePath) return console.error("Missing pagePath");

  function showMessage(message) {
    if (!msgBox) return console.error("Missing .page_access_message div");
    msgBox.textContent = message;
    msgBox.style.display = "block";
  }

  try {
    const token = localStorage.getItem("userLogin_token");
    const res = await fetch(`/.netlify/functions/gatedPage?page=${encodeURIComponent(pagePath)}`, {
      method: "GET",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });
    
    container.innerHTML = "";
    const contentType = res.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      switch (data.action) {
        case "redirect": return window.location.href = data.location;
        case "accessDenied": showMessage("Access denied"); return;
        case "notFound": showMessage("Page not found"); return;
        case "error": showMessage("Error loading page"); return;
        case "pageNameMissing": showMessage("Page Name missing"); return;
        case "methodNotAllowed": showMessage("Method not allowed"); return;
        default: showMessage("Unexpected response"); return;
      }
    }

    if (res.status === 200) {
      const html = await res.text();
      container.innerHTML = html;

      const scripts = Array.from(container.querySelectorAll("script"));
      for (const oldScript of scripts) {
        const newScript = document.createElement("script");
        if (oldScript.type) newScript.type = oldScript.type;
        if (oldScript.src) {
          newScript.src = oldScript.src;
          newScript.async = false;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        oldScript.replaceWith(newScript);
        if (newScript.type === "module" && newScript.src) await new Promise(r => newScript.onload = r);
      }

      document.dispatchEvent(new Event("gated-page-loaded"));
    } else {
      showMessage(`Unexpected status: ${res.status}`);
    }
  } catch (err) {
    console.error("Exception in loadGatedPage fetch:", err);
  }
}
