// Client-Side: /static/js/formatFormData.js
/**
 * Convert a form into structured HTML for emails.
 * Collapses multiple empty lines between fieldsets.
 * @param {HTMLFormElement} form
 * @param {boolean} includeUnselected - Include unchecked/empty fields
 * @returns {string} HTML string
 */
export function formatFormEmail(form, includeUnselected = false) {
  const output = [];

  form.querySelectorAll("fieldset").forEach((fs) => {
    const items = [];

    // Include legend as heading
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) output.push(`<p><strong>${legend}</strong></p>`);

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input) => {
      let labelText = "";

      // Get label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label"))
        labelText = input.closest("label").textContent.trim();
      else labelText = input.name || "";

      // Skip empty/unselected fields unless includeUnselected
      if (!includeUnselected) {
        if ((input.type === "checkbox" || input.type === "radio") && !input.checked)
          return;
        if (!["checkbox", "radio"].includes(input.type) && !input.value.trim())
          return;
      }

      let line = labelText;
      if (input.type === "checkbox" || input.type === "radio") {
        line = input.checked ? line : `<s>${line}</s>`;
      } else {
        const value = input.value.replace(/\n/g, "<br>");
        line += `: ${value || ""}`;
      }

      items.push(`<li>${line}</li>`);
    });

    if (items.length) output.push(`<ul>${items.join("")}</ul>`);
  });

  // Collapse multiple empty lines between groups
  let html = output.join("\n");
  html = html.replace(/(\n\s*){2,}/g, "\n");

  return html;
}
