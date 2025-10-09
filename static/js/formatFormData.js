// Client-Side: /static/js/formatFormData.js

/**
 * Convert a form into an HTML string for email.
 * @param {HTMLFormElement} form
 * @param {boolean} includeUnselected
 * @returns {string} HTML-formatted string
 */
export function formatFormEmail(form, includeUnselected = false) {
  const output = [];

  form.querySelectorAll("fieldset").forEach((fs) => {
    const fieldsetLines = [];

    // Include legend as heading
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) fieldsetLines.push(`<h3>${legend}</h3>`);

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input) => {
      let labelText = "";
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label")) labelText = input.closest("label").textContent.trim();
      else labelText = input.name || "";

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
    });

    output.push(...fieldsetLines);
  });

  return output.join("\n");
}
