export async function loadGatedPage(container, pagePath, msgBox) {
	console.log("[loadGatedPage] pagePath:", pagePath, "container:", container, "msgBox:", msgBox);

  if (!container) return console.error("Missing container");
  if (!pagePath) return console.error("Missing pagePath");

  function showMessage(message) {
    if (!msgBox) return console.error("Missing .page_access_message div");
    msgBox.textContent = message;
    msgBox.style.display = "block";
  }

  async function injectHtml(html) {
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
  }

  try {
    const token = localStorage.getItem("userLogin_token");
    const res = await fetch(`/.netlify/functions/gatedPage?page=${encodeURIComponent(pagePath)}`, {
      method: "GET",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    const contentType = res.headers.get("Content-Type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json();
      switch (data.action) {
        case "public": showMessage("Public page should not be gate-loaded!"); return;
        case "redirect": return window.location.href = data.location;
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
      await injectHtml(html);
    } else {
      showMessage(`Unexpected status: ${res.status}`);
    }
  } catch (err) {
    console.error("Exception in loadGatedPage fetch:", err);
  }
}
