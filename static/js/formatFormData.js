// Client-side: \static\js\formatFormData.js
/**
 * Convert a form into an HTML string for email.
 * Always logs debug info to console.
 * @param {HTMLFormElement} form
 * @param {boolean} includeUnselected
 * @returns {string} HTML-formatted string
 */
 
export function formatFormEmail(form, includeUnselected = false) {
  if (!form) {
    console.warn("[DEBUG] formatFormEmail: No form provided!");
    return "";
  }

  //console.log("[DEBUG] Starting formatFormEmail for form:", form);
  const formTitle = window.PAGE_FRONTMATTER?.title?.replace(/^"|"$/g, "") || document.title;
  const output = [`<h2>${formTitle}</h2>`, ""];

  form.querySelectorAll("fieldset").forEach((fs, fsIndex) => {
    const fieldsetLines = [];

    // Include legend as heading
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) {
      fieldsetLines.push(`<strong>${legend}</strong>`);
      //console.log(`[DEBUG] Fieldset #${fsIndex} legend:`, legend);
    }

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input, idx) => {
      let labelText = "";

      // Try to get associated label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label")) labelText = input.closest("label").textContent.trim();

      // Skip unselected/empty if not including unselected
      if (!includeUnselected) {
        if ((input.type === "checkbox" || input.type === "radio") && !input.checked) return;
        if (!["checkbox", "radio"].includes(input.type) && !input.value.trim()) return;
      }

      // Handle each input type
      let line = "";

      // Special case: optional_email_field
      if (fs.id === "optional_email_field") {
        const val = (input.value || "").trim();
        line = val ? `Copy requested by: ${val}` : "";
      } else {
        line = labelText;
        if (["checkbox", "radio"].includes(input.type)) {
          line = input.checked ? line : `<s>${line}</s>`;
        } else {
          const val = (input.value || "").trim();
          line += val ? `: ${val}` : "";
        }
      }

	// --- Insert "@#" immediately after the submitted_by field ---
      if (input.id === "submitted_by") {
        line += " @#";
        //console.log("[DEBUG] Inserted @# after submitted_by field");
      }

      if (line) fieldsetLines.push(`<p>${line}</p>`);
      //console.log(`[DEBUG] Fieldset #${fsIndex}, input #${idx}:`, line);
	
    });

    if (fieldsetLines.length) {
     output.push(fieldsetLines.join("\n"));
     //output.push("<br>");
    }
  });

  const finalHTML = output.join("\n");
  console.log("[DEBUG] Final formatted HTML:\n", finalHTML);

  return finalHTML;
}

// Expose to global scope so you can call it manually in console
window.formatFormEmail = formatFormEmail;

// --- Auto-run on load for quick testing ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.verified-form");
  if (form) {
    console.log("[DEBUG] Auto-running formatFormEmail on DOMContentLoaded");
    formatFormEmail(form);
  } else {
    console.log("[DEBUG] No verified form found on page load");
  }
});
