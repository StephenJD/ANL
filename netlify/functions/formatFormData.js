// netlify/functions/formatFormData.js
// Server-side: parses <form> HTML, preserves fieldsets, legends, inputs
const { JSDOM } = require("jsdom");

function formatFormData({ formData, effectiveSubmittedBy, includeUnselected = false }) {
  if (!formData || typeof formData !== "string") {
    console.warn("[DEBUG] formatFormData: No formData provided!", { formData });
    return "";
  }

  const dom = new JSDOM(formData);
  const form = dom.window.document.querySelector("form");
  if (!form) return "";
   
  console.log("[DEBUG] formatFormData: effectiveSubmittedBy ", effectiveSubmittedBy);

  // Replace submitted_by value if provided
  const submittedInput = form.querySelector("#submitted_by");
  if (submittedInput) {
    submittedInput.value = effectiveSubmittedBy
      ? `${effectiveSubmittedBy}{@V}`
      : "{@}";
  }
  
  const optionalEmailInput = form.querySelector("#optionalEmail input[type='email']");
  if (optionalEmailInput && optionalEmailInput.value.trim()) {
    optionalEmailInput.value = `Copy requested by ${optionalEmailInput.value.trim()}`;
  }

  const output = [];
  // Grab the first <h1> or <h2> that precedes the form
  let titleEl = null;
  const allTitles = dom.window.document.querySelectorAll("h1, h2");
  for (const el of allTitles) {
    if (el.compareDocumentPosition(form) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING) {
      titleEl = el;
      break;
    }
  }
  if (titleEl) output.push(`<h1>${titleEl.textContent.trim()}</h1>`);
  
  form.querySelectorAll("fieldset").forEach((fs) => {
    const legend = fs.querySelector("legend")?.textContent.trim();
    if (legend) output.push(`<strong>${legend}</strong>`);

    fs.querySelectorAll("input, textarea, select").forEach((input) => {
      let labelText = "";

      // Find label text
      const label = fs.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent.trim();
      else if (input.closest("label")) labelText = input.closest("label").textContent.trim();
      else labelText = input.name || "";

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
        else line += `: ${input.value || ""}`;
      }

      if (valueIncluded) output.push(line);
    });
  });

  return output.filter(l => l && l.trim() !== "").join("<br>");
}

module.exports = { formatFormData };
