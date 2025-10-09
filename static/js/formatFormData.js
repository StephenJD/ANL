// Client-Side: /static/js/formatFormData.js

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

  const output = [];
  console.log("[DEBUG] Starting formatFormEmail for form:", form);

  form.querySelectorAll("fieldset").forEach((fs, fsIndex) => {
    const fieldsetLines = [];

    // Include legend as heading
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) {
      fieldsetLines.push(`<h3>${legend}</h3>`);
      console.log(`[DEBUG] Fieldset #${fsIndex} legend:`, legend);
    }

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input, idx) => {
      let labelText = "";

      // Try to get associated label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label")) labelText = input.closest("label").textContent.trim();
      else labelText = ""; // no name attributes

      // Skip unselected/empty if not including unselected
      if (!includeUnselected) {
        if ((input.type === "checkbox" || input.type === "radio") && !input.checked) return;
        if (!["checkbox", "radio"].includes(input.type) && !input.value.trim()) return;
      }

      let line = labelText;
      if (input.type === "checkbox" || input.type === "radio") {
        line = input.checked ? line : `<s>${line}</s>`;
      } else {
        line += `: ${input.value || ""}`;
      }

      fieldsetLines.push(`<p>${line}</p>`);
      console.log(`[DEBUG] Fieldset #${fsIndex}, input #${idx}:`, line);
    });

    // Add fieldsetLines to output
    if (fieldsetLines.length) output.push(...fieldsetLines, ""); // empty line for spacing
  });

  const finalHTML = output.join("\n");
  console.log("[DEBUG] Final formatted HTML:\n", finalHTML);

  return finalHTML;
}

// Expose to global scope so you can call it from console easily
window.formatFormEmail = formatFormEmail;

// --- Debug helper: call on page load automatically ---
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.verified-form");
  if (form) {
    console.log("[DEBUG] Auto-running formatFormEmail on DOMContentLoaded");
    formatFormEmail(form);
  } else {
    console.log("[DEBUG] No verified form found on page load");
  }
});
