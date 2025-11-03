// build_scripts\form_parser.js
import { JSDOM } from "jsdom";

// --- utils ---
export function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

function getLabelText(input) {
  return input.closest("label")?.textContent.trim() || input.name || "";
}

// --- input type extractors ---
function extractCheckboxWithNestedRadios(checkboxNode, includeUnselected = false) {
  const checkbox = checkboxNode.querySelector("input[type=checkbox]");
  if (!checkbox) return null;

  const labelText = getLabelText(checkbox);

  if (checkbox.checked) {
    let selectedRadio = null;
    let next = checkboxNode.nextElementSibling;
    while (next) {
      const nextInput = next.querySelector("input[type=radio]");
      if (!nextInput) { next = next.nextElementSibling; continue; }
      if (nextInput.checked) { selectedRadio = next.textContent.trim(); break; }
      if (nextInput.querySelector("input[type=checkbox]")) break;
      next = next.nextElementSibling;
    }
    return { label: labelText, value: selectedRadio || checkbox.value, checked: true };
  } else if (includeUnselected) {
    return { label: labelText, value: "", checked: false };
  }
  return null;
}

function extractStandaloneRadio(radioNode, includeUnselected = false) {
  const radio = radioNode.querySelector("input[type=radio]");
  if (!radio) return null;

  const labelText = getLabelText(radio);

  if (radio.checked) return { label: labelText, value: radio.value, checked: true };
  if (includeUnselected) return { label: labelText, value: "", checked: false };
  return null;
}

function extractOtherInput(inputNode, includeUnselected = false) {
  const input = inputNode.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select");
  if (!input) return null;

  const labelText = getLabelText(input);

  if (!input.value?.trim() && !includeUnselected) return null;
  return { label: labelText, value: input.value || "", checked: input.checked };
}

// --- fieldset extractor ---
export function extractFieldset(fieldsetNode, includeUnselected = false) {
  const legend = fieldsetNode.querySelector("legend")?.textContent.trim() || null;
  const fields = [];

  Array.from(fieldsetNode.children).forEach(child => {
    let field = null;

    if (child.querySelector("input[type=checkbox]")) {
      field = extractCheckboxWithNestedRadios(child, includeUnselected);
    } else if (child.querySelector("input[type=radio]")) {
      field = extractStandaloneRadio(child, includeUnselected);
    } else if (child.querySelector("input, textarea, select")) {
      field = extractOtherInput(child, includeUnselected);
    }

    if (field) fields.push(field);
  });

  if (fields.length === 0) return null;
  return { legend, fields };
}

// --- main parser ---
export function parseFormElements(form, { includeUnselected = false } = {}) {
  const elements = [];

Array.from(form.children).forEach(node => {
  if (node.tagName === "FIELDSET") {
    const fs = extractFieldset(node, includeUnselected);
    if (fs) elements.push(fs);
  } else if (node.tagName === "LABEL") {
    const lbl = extractOtherInput(node, includeUnselected);
    if (lbl) elements.push(lbl);
  } else if (node.tagName === "P") {
    const labelInsideP = node.querySelector("label");
    if (labelInsideP) {
      const lbl = extractOtherInput(labelInsideP, includeUnselected);
      if (lbl) elements.push(lbl);
    }
  }
});


  return elements;
}