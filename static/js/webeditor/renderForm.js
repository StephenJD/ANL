// static/js/webeditor/renderForm.js
import { fieldSchema } from "./fieldSchema.js";

export async function renderForm(node, frontMatter, accessOptionsCache) {
  const form = document.getElementById("editForm");
  form.innerHTML = "";

  const resolvedFront = { ...frontMatter };
  const editState = {
    accessOptionsCache: accessOptionsCache || null
  };

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

  function isVisible(field) {
    if (!field.dependsOn) return true;
    const dep = field.dependsOn;
    const value = (resolvedFront[dep.key] ?? "").toString().toLowerCase();
    return dep.values.map(v => v.toLowerCase()).includes(value);
  }

  async function renderField(field) {
    if (!isVisible(field)) return;

    const label = document.createElement("label");
    label.textContent = field.label || field.key;
    label.style.display = "block";
    label.style.marginTop = "10px";

    let input = null;
    const value = resolvedFront[field.key] ?? field.default ?? "";

    if (field.type === "select") {
      input = document.createElement("select");
      let options = field.options || [];
      if (field.optionsProvider === "get_role_options") {
        options = await getAccessOptions();
      }
      if (!options.length) options = [""];
      const firstOption = options[0];
      const optionsLower = options.map(o => String(o).toLowerCase());
      const hasValue = !(value === "" || value == null);
      const valueLower = hasValue ? String(value).toLowerCase() : "";
      const currentValue = hasValue ? valueLower : String(firstOption).toLowerCase();
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
      input.checked = valStr === "true" || valStr === "1" || value === true;
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
    input.style.width = field.type === "boolean" ? "auto" : "320px";
    if (field.disabled) input.disabled = true;

    input.addEventListener("change", () => {
      if (input.dataset) delete input.dataset.illegal;
      Object.assign(resolvedFront, getCurrentFormValues());
      renderForm(node, resolvedFront, editState.accessOptionsCache);
    });

    form.appendChild(label);
    form.appendChild(input);
  }

  for (const field of fieldSchema.fields) {
    await renderField(field);
  }

}
