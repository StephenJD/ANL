// /.netlify/functions/formatFormData.js
import { JSDOM } from "jsdom";

export function formatFormData({ formData, effectiveSubmittedBy, includeUnselected = false }) {
  if (!formData || typeof formData !== "string") {
    console.warn("[DEBUG] formatFormData: No formData provided!", { formData });
    return "";
  }

  const dom = new JSDOM(formData);
  const form = dom.window.document.querySelector("form");
  if (!form) return "";

  const submittedInput = form.querySelector("#submitted_by");
  if (submittedInput) {
    submittedInput.value = effectiveSubmittedBy
      ? `${effectiveSubmittedBy}{@V}`
      : "{@}";
  }

  const optionalEmailInput = form.querySelector("#optionalEmail input[type='email']");
  if (optionalEmailInput && optionalEmailInput.value.trim()) {
    const label = optionalEmailInput.closest("label");
    if (label && label.textContent.trim().endsWith(":")) {
      label.textContent = label.textContent.trim().slice(0, -1);
    }
    optionalEmailInput.value = `Copy requested by ${optionalEmailInput.value.trim()}`;
  }

  const output = [];
  let titleEl = null;
  const allTitles = dom.window.document.querySelectorAll("h1, h2");
  for (const el of allTitles) {
    if (el.compareDocumentPosition(form) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING) {
      titleEl = el;
      break;
    }
  }
  if (titleEl) output.push(`<${titleEl.tagName.toLowerCase()}>${titleEl.textContent.trim()}</${titleEl.tagName.toLowerCase()}>`);

  form.querySelectorAll("fieldset").forEach((fs) => {
    const legend = fs.querySelector("legend")?.textContent.trim();
    if (legend) output.push(`<strong>${legend}</strong> `);

    fs.querySelectorAll("input, textarea, select").forEach((input) => {
      let labelText = "";
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label")) {
        const rawLabel = input.closest("label").cloneNode(true);
        rawLabel.querySelectorAll("input, textarea, select").forEach(el => el.remove());
        labelText = rawLabel.textContent.trim();
      }
      else labelText = input.name || "";

      if (labelText && input.tagName.toLowerCase() === "textarea" && !labelText.endsWith(":")) {
        labelText += ":";
      }

      let valueIncluded = true;
      let line = labelText;

      if (input.tagName.toLowerCase() === "select") {
        const selected = Array.from(input.options)
          .filter(o => o.selected)
          .map(o => o.textContent.trim())
          .join(", ");
        if (!includeUnselected && !selected) valueIncluded = false;
        else line += `: ${selected}`;
      } else if (input.type === "checkbox" || input.type === "radio") {
        if (!includeUnselected && !input.checked) valueIncluded = false;
        else line = input.checked ? line : `<s>${line}</s>`;
      } else {
        if (!includeUnselected && !input.value.trim()) valueIncluded = false;
        else line += ` ${input.value || ""}`;
      }

      if (valueIncluded) output.push(line);
    });
  });

  return output.filter(l => l && l.trim() !== "").join("<br>");
}
