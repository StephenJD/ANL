// static/js/webeditor/renderForm.js
import { renderAccessOptions } from "./renderAccessOptions.js";
import { renderExtraFields } from "./renderExtraFields.js";
import { renderSubOptions } from "./renderSubOptions.js";

export async function renderForm(frontMatter, accessOptionsCache) {
  const form = document.getElementById("editForm");
  form.innerHTML = "";

  // Page type
  const pageTypeLabel = document.createElement("label");
  pageTypeLabel.textContent = "Page type";
  pageTypeLabel.style.display = "block";
  pageTypeLabel.style.marginTop = "10px";

  const pageTypeSelect = document.createElement("select");
  ["content page", "navigation page"].forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    if (frontMatter["page_type"] === v) opt.selected = true;
    pageTypeSelect.appendChild(opt);
  });
  pageTypeSelect.name = "page_type";
  pageTypeSelect.style.width = "320px";
  pageTypeSelect.onchange = () => renderSubOptions(pageTypeSelect.value, form, frontMatter);

  form.appendChild(pageTypeLabel);
  form.appendChild(pageTypeSelect);

  // Title
  const titleLabel = document.createElement("label");
  titleLabel.textContent = "Title (required)";
  titleLabel.style.display = "block";
  titleLabel.style.marginTop = "10px";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = frontMatter["title"] || "";
  titleInput.name = "title";
  titleInput.style.width = "320px";

  form.appendChild(titleLabel);
  form.appendChild(titleInput);

  // Summary
  const summaryLabel = document.createElement("label");
  summaryLabel.textContent = "Summary (optional)";
  summaryLabel.style.display = "block";
  summaryLabel.style.marginTop = "10px";

  const summaryInput = document.createElement("textarea");
  summaryInput.name = "summary";
  summaryInput.value = frontMatter["summary"] || "";
  summaryInput.rows = 3;
  summaryInput.style.width = "320px";

  form.appendChild(summaryLabel);
  form.appendChild(summaryInput);

  await renderAccessOptions(form, frontMatter, accessOptionsCache);
  renderSubOptions(pageTypeSelect.value, form, frontMatter);
  renderExtraFields(form, frontMatter);
}
