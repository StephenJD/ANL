// static/js/webeditor/renderForm.js
import { fieldSchema } from "./fieldSchema.js";

export async function renderForm(node, frontMatter, accessOptionsCache) {
  const form = document.getElementById("editForm");
  form.innerHTML = "";

  const resolvedFront = { ...frontMatter };
  const editState = {
    accessOptionsCache: accessOptionsCache || null
  };

  function applyDerivedDefaults(values) {
    const typeValue = String(frontMatter.type || "").toLowerCase();
    const nodePath = String(node?.path || "").toLowerCase();
    const isIndex = nodePath.endsWith("_index.md") || !nodePath.endsWith(".md");
    const parentType = String(node?.parent?.frontMatterOriginal?.type || "").toLowerCase();
    const qual = String(node?.qualification || "").toLowerCase();
    const qualMap = {
      "navigation:": "Navigation",
      "collated:": "Content",
      "section:": "Content",
      "content:": "Content"
    };
    const qualPageType = qualMap[qual];

    if (!values.page_type) {
      if (qualPageType) {
        values.page_type = qualPageType;
      } else if (!isIndex) {
        values.page_type = "Content";
      } else if (typeValue === "document-folder" || typeValue === "see_also") {
        values.page_type = "Navigation";
      } else if (typeValue === "collated_page" || typeValue === "home") {
        values.page_type = "Content";
      }
    }

    if (!values.content_type && !isIndex) {
      if (typeValue && typeValue !== "document") {
        if (typeValue === "collated_page") values.content_type = "Collated_Page";
        else values.content_type = typeValue;
      } else if (typeValue === "document") {
        if (parentType === "collated_page") values.content_type = "Page from section files";
        else if (parentType === "document-folder" || parentType === "see_also") values.content_type = "Page from single file";
      }
    }

    if (!values.give_content_prev_next_buttons && values.page_type === "Navigation") {
      if (typeValue === "see_also") values.give_content_prev_next_buttons = "true";
      else if (typeValue === "document-folder") values.give_content_prev_next_buttons = "false";
    }
  }

  applyDerivedDefaults(resolvedFront);

  async function getAccessOptions() {
    if (editState.accessOptionsCache) return editState.accessOptionsCache;
    try {
      const res = await fetch("/.netlify/functions/get_role_options");
      if (!res.ok) throw new Error("HTTP " + res.status);
      let options = await res.json();
      options = options.map(o => o.Role || o.role || o);
      options.unshift("Public");
      editState.accessOptionsCache = options;
      return options;
    } catch (err) {
      log("Access fetch error: " + err);
      editState.accessOptionsCache = ["Public"];
      return ["Public"];
    }
  }

  function getCurrentFormValues() {
    const obj = {};
    const elements = Array.from(form.elements || []).filter(el => el && el.name);
    for (const el of elements) {
      if (el.type === "checkbox") {
        obj[el.name] = el.checked ? "true" : "false";
      } else {
        obj[el.name] = el.value;
      }
    }
    return obj;
  }

  function formatFrontMatterValue(val) {
    if (Array.isArray(val)) {
      return `[${val.map(v => String(v)).join(", ")}]`;
    }
    if (val === true) return "true";
    if (val === false) return "false";
    if (val === null || val === undefined) return "";
    return String(val);
  }

  function updateFrontMatterText(values) {
    const frontMatterText = document.getElementById("frontMatterText");
    if (!frontMatterText) return;
    const derived = { ...(node?.frontMatterOriginal || {}) };
    const skipKeys = ["page_type", "content_type", "give_content_prev_next_buttons"];
    for (const field of fieldSchema.fields) {
      if (skipKeys.includes(field.key)) continue;
      if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
      const v = values[field.key];
      if (v === "" || v == null) {
        delete derived[field.key];
      } else {
        derived[field.key] = v;
      }
    }

    const orderedKeys = Array.isArray(node?.frontMatterOriginalOrder)
      ? node.frontMatterOriginalOrder
      : [];
    const remainingKeys = Object.keys(derived).filter(k => !orderedKeys.includes(k));
    const keyOrder = [...orderedKeys, ...remainingKeys];

    const lines = [];
    for (const key of keyOrder) {
      const v = derived[key];
      if (v === "" || v == null) continue;
      lines.push(`${key}: ${formatFrontMatterValue(v)}`);
    }
    frontMatterText.value = lines.join("\n");
  }

  function matchDependency(dep) {
    const value = (resolvedFront[dep.key] ?? "").toString().toLowerCase();
    return dep.values.map(v => v.toLowerCase()).includes(value);
  }

  function isVisible(field) {
    if (field.dependsOnAll) {
      return field.dependsOnAll.every(matchDependency);
    }
    if (field.dependsOn) {
      return matchDependency(field.dependsOn);
    }
    return true;
  }

  function renderOptionalHeading() {
    const heading = document.createElement("div");
    heading.textContent = "Optional Fields";
    heading.style.marginTop = "14px";
    heading.style.fontWeight = "bold";
    form.appendChild(heading);
  }

  function getOptionsByParentQualification(field) {
    if (!field.optionsByParentQualification) return null;
    const parent = node?.newParent || node?.parent;
    const qual = String(parent?.qualification || "").toLowerCase();
    return field.optionsByParentQualification[qual] || null;
  }

  async function renderField(field) {
    if (!isVisible(field)) return;

    let input = null;
    const value = resolvedFront[field.key] ?? field.default ?? "";

    if (field.type === "hidden") {
      input = document.createElement("input");
      input.type = "hidden";
      input.value = value || "";
    } else if (field.type === "select") {
      input = document.createElement("select");
      let options = field.options || [];
      if (field.optionsProvider === "get_role_options") {
        options = await getAccessOptions();
      }
      const parentOptions = getOptionsByParentQualification(field);
      if (parentOptions) {
        options = parentOptions;
      }
      if (!options.length) options = [""];
      const allowBlank = false;
      const firstOption = options[0];
      const optionsLower = options.map(o => String(o).toLowerCase());
      const hasValue = !(value === "" || value == null);
      const valueLower = hasValue ? String(value).toLowerCase() : "";
      const currentValue = hasValue ? valueLower : (allowBlank ? "" : String(firstOption).toLowerCase());
      const isIllegal = hasValue && !optionsLower.includes(valueLower);
      if (isIllegal) {
        const illegalOpt = document.createElement("option");
        illegalOpt.value = valueLower;
        illegalOpt.textContent = "Illegal";
        illegalOpt.selected = true;
        input.appendChild(illegalOpt);
        input.dataset.illegal = "true";
      }
      options.forEach(optVal => {
        const opt = document.createElement("option");
        opt.value = String(optVal).toLowerCase();
        opt.textContent = String(optVal);
        if (!isIllegal && currentValue === opt.value) opt.selected = true;
        input.appendChild(opt);
      });
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = field.rows || 3;
      input.value = value || "";
    } else if (field.type === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      const valStr = String(value).toLowerCase();
      input.checked = valStr === "true" || valStr === "1" || valStr === "yes" || value === true;
    } else if (field.type === "date") {
      input = document.createElement("input");
      input.type = "date";
      input.value = value || "";
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = value || "";
    }

    input.name = field.key;
    const wideKeys = ["title", "summary", "background_image", "logo_image"];
    const isWide = wideKeys.includes(field.key);
    if (field.type === "boolean") {
      input.style.width = "auto";
    } else {
      input.style.width = isWide ? "100%" : "320px";
    }
    if (field.disabled) input.disabled = true;

    input.addEventListener("change", () => {
      if (input.dataset) delete input.dataset.illegal;
      Object.assign(resolvedFront, getCurrentFormValues());
      updateFrontMatterText(resolvedFront);
      renderForm(node, resolvedFront, editState.accessOptionsCache);
    });

    if (field.type === "hidden") {
      form.appendChild(input);
    } else if (field.type === "boolean") {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.marginTop = "10px";
      label.appendChild(input);
      label.appendChild(document.createTextNode(" " + (field.label || field.key)));
      form.appendChild(label);
    } else {
      const label = document.createElement("label");
      label.textContent = field.label || field.key;
      label.style.display = "block";
      label.style.marginTop = "10px";
      form.appendChild(label);
      form.appendChild(input);
    }
  }

  let optionalHeadingInserted = false;
  for (const field of fieldSchema.fields) {
    if (!field.required && !optionalHeadingInserted) {
      renderOptionalHeading();
      optionalHeadingInserted = true;
    }
    await renderField(field);
  }

  updateFrontMatterText(getCurrentFormValues());

}
