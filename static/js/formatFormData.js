export function formatFormData(form) {
  const includeUnselected =
  window.PAGE_FRONTMATTER?.params?.include_unselected_options || false;

  const output = [];

  form.querySelectorAll("fieldset").forEach((fs) => {
    const fieldsetLines = [];

    // Include legend
    const legend = fs.querySelector("legend")?.innerText.trim();
    if (legend) fieldsetLines.push(`<strong>${legend}</strong>`);

    // Process inputs and textareas
    fs.querySelectorAll("input, textarea").forEach((input) => {
      let labelText = "";

      // Try to get label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label"))
        labelText = input.closest("label").textContent.trim();
      else labelText = input.name || "";

      // Skip empty values if include_unselected_options=false
      if (!includeUnselected) {
        if (
          (input.type === "checkbox" || input.type === "radio") &&
          !input.checked
        ) {
          return; // skip unselected
        }
        if (
          input.type !== "checkbox" &&
          input.type !== "radio" &&
          !input.value.trim()
        ) {
          return; // skip empty text fields
        }
      }

      let line = labelText;
      if (input.type === "checkbox" || input.type === "radio") {
        line = input.checked ? line : `<s>${line}</s>`;
      } else {
        line += `: ${input.value || ""}`;
      }

      fieldsetLines.push(line);
    });

    if (fieldsetLines.length) output.push(...fieldsetLines);
  });

  // Join lines and remove any empty <br> or stray whitespace
  return output.filter((l) => l && l.trim() !== "").join("<br>");
}
