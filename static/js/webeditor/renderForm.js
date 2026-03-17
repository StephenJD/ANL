// static/js/webeditor/renderForm.js
import { fieldSchema } from "./fieldSchema.js";
import { renderImageDropZone } from "./imageDropZone.js";
import { getNetlifyAuthHeaders } from "./authHeaders.js";

let sharedImageOptionsCacheGlobal = null;

export async function renderForm(frontMatterFields, parentFrontMatterFields, accessOptionsCache) {
  const form = document.getElementById("editForm");
  form.innerHTML = "";

  const { fields, derive, deriveType, isVisible } = fieldSchema;
  const resolvedFront = { ...frontMatterFields };
  // Infer qualification for parentFields
  const parentFields = { ...parentFrontMatterFields };
  if (!parentFields.qualification) {
    const parentType = String(parentFields.type || "").toLowerCase();
    if (parentType === "collated_page") {
      parentFields.qualification = "collated:";
    } else if (parentType === "navigation") {
      parentFields.qualification = "navigation:";
    }
  }
  const editState = {
    accessOptionsCache: accessOptionsCache || null,
    sharedImageOptionsCache: sharedImageOptionsCacheGlobal
  };
  let sharedImageTargetSelect = null;

  function applyDerivedDefaults(values) {
    if (!values.page_type && typeof derive.page_type === "function") {
      values.page_type = derive.page_type({ frontMatter: values, parentFrontMatter: parentFields });
    }
    if (!values.page_type) {
      const pageTypeField = fields.find(f => f.key === "page_type");
      if (pageTypeField?.options?.length) values.page_type = pageTypeField.options[0];
    }
    if (!values.content_type && values.page_type === "Content" && typeof derive.content_type === "function") {
      values.content_type = derive.content_type({ frontMatter: values, parentFrontMatter: parentFields });
    }
    if (values.page_type === "Content" && !values.content_type) {
      const contentField = fields.find(f => f.key === "content_type");
      let options = contentField?.options || [];
      const parentOptions = contentField && contentField.optionsByParentQualification
        ? contentField.optionsByParentQualification[parentFields.qualification?.toLowerCase?.() || ""]
        : null;
      if (parentOptions) options = parentOptions;
      if (options.length) values.content_type = options[0];
    }
    if (!values.give_content_prev_next_buttons && values.page_type === "Navigation" && typeof derive.give_content_prev_next_buttons === "function") {
      values.give_content_prev_next_buttons = derive.give_content_prev_next_buttons({ frontMatter: values, parentFrontMatter: parentFields });
    }
  }

  applyDerivedDefaults(resolvedFront);

  async function getAccessOptions() {
    if (editState.accessOptionsCache) return editState.accessOptionsCache;
    try {
      const res = await fetch("/.netlify/functions/get_role_options", {
        headers: getNetlifyAuthHeaders()
      });
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

  async function getSharedImageOptions() {
    if (editState.sharedImageOptionsCache) return editState.sharedImageOptionsCache;
    try {
      const res = await fetch("/.netlify/functions/list_shared_images", {
        headers: getNetlifyAuthHeaders()
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const options = Array.isArray(data) ? data : [];
      const normalized = options.map(opt => {
        if (opt && typeof opt === "object") {
          const value = String(opt.value ?? "");
          const label = String(opt.label ?? opt.value ?? "");
          return { value, label };
        }
        const value = String(opt);
        const label = value.split("/").pop() || value;
        return { value, label };
      });
      editState.sharedImageOptionsCache = normalized;
      sharedImageOptionsCacheGlobal = normalized;
      return normalized;
    } catch (err) {
      log("Shared images fetch error: " + err);
      editState.sharedImageOptionsCache = [];
      sharedImageOptionsCacheGlobal = [];
      return [];
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

  // Helper to update front matter box, preserving comments
  function updateFrontMatterTextWithComments(rawFrontMatter, values) {
    const frontMatterText = document.getElementById("frontMatterText");
    if (!frontMatterText) return;
    // Parse lines, keep comments and blank lines
    const lines = (rawFrontMatter || "").split(/\r?\n/);
    const keyLineMap = new Map();
    const commentLines = [];
    const keyRegex = /^([a-zA-Z0-9_\-]+):/;
    lines.forEach((line, idx) => {
      const m = line.match(keyRegex);
      if (m) {
        keyLineMap.set(m[1].trim(), idx);
      } else if (line.trim().startsWith("#") || line.trim() === "") {
        commentLines.push({ idx, line });
      }
    });

    // Only include fields with frontMatter !== false
    const allowedKeys = fieldSchema.fields.filter(f => f.frontMatter !== false).map(f => f.key);
    // Build derived object with only allowed keys
    const derived = {};
    for (const key of allowedKeys) {
      const v = values[key];
      if (v === undefined || v === "" || v == null || String(v).toLowerCase() === "false") continue;
      derived[key] = v;
    }

    const derivedType = typeof fieldSchema.deriveType === "function"
      ? fieldSchema.deriveType(values)
      : "";
    if (derivedType) {
      const currentType = String(derived.type || "").toLowerCase();
      if (!currentType.startsWith(derivedType.toLowerCase())) {
        derived.type = derivedType;
      }
    }

    // Always order keys by fieldSchema.fields
    const keyOrder = allowedKeys.filter(k => Object.prototype.hasOwnProperty.call(derived, k));

    // Rebuild front matter, preserving comments and blank lines
    const outLines = [];
    let usedKeys = new Set();
    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i];
      const m = line.match(keyRegex);
      if (m && allowedKeys.includes(m[1].trim())) {
        // Will be replaced below
        continue;
      }
      if (line.trim().startsWith("#") || line.trim() === "") {
        outLines.push(line);
      }
    }
    // Insert normalized key-value pairs in schema order after comments
    for (const key of keyOrder) {
      const v = derived[key];
      if (v === "" || v == null) continue;
      outLines.push(`${key}: ${formatFrontMatterValue(v)}`);
      usedKeys.add(key);
    }
    frontMatterText.value = outLines.join("\n");
  }

  function renderOptionalHeading() {
    const heading = document.createElement("div");
    heading.textContent = "Optional Fields";
    heading.style.marginTop = "14px";
    heading.style.fontWeight = "bold";
    form.appendChild(heading);
  }

  async function renderField(field) {
    if (!isVisible(field, resolvedFront)) return;

    let input = null;
    const rawValue = resolvedFront[field.key] ?? field.default ?? "";

    if (field.type === "hidden") {
      input = document.createElement("input");
      input.type = "hidden";
      input.value = rawValue || "";
    } else if (field.type === "select") {
      input = document.createElement("select");
      let options = field.options || [];
      if (typeof field.optionsProvider === "function") {
        options = await field.optionsProvider({ frontMatter: resolvedFront, parentFrontMatter: parentFields, getAccessOptions, getSharedImageOptions });
      }
      const parentOptions = field.optionsByParentQualification
        ? field.optionsByParentQualification[parentFields.qualification?.toLowerCase?.() || ""]
        : null;
      if (parentOptions) {
        options = parentOptions;
        }
      const allowBlank = field.allowBlank === true;
      if (!options.length && !allowBlank) options = [""];

      const normalized = typeof field.normalizeValue === "function"
        ? field.normalizeValue(rawValue, { frontMatter: resolvedFront, parentFrontMatter: parentFields })
        : rawValue;
      const hasValue = !(normalized === "" || normalized == null);

      const isCaseSensitive = field.caseSensitive === true;
      const toCompare = (val) => isCaseSensitive ? String(val) : String(val).toLowerCase();

      const normalizedOptions = options.map(opt => {
        if (opt && typeof opt === "object") {
          const value = String(opt.value ?? "");
          const label = String(opt.label ?? opt.value ?? "");
          return { value, label };
        }
        const value = String(opt);
        return { value, label: value };
      });

      const compareOptions = normalizedOptions.map(o => toCompare(o.value));
      const compareValue = hasValue ? toCompare(normalized) : "";
      const matchIndex = hasValue ? compareOptions.indexOf(compareValue) : -1;
      const isIllegal = hasValue && matchIndex === -1;

      if (allowBlank) {
        const blankOpt = document.createElement("option");
        blankOpt.value = "";
        blankOpt.textContent = field.blankLabel || "None";
        if (!hasValue) blankOpt.selected = true;
        input.appendChild(blankOpt);
      }

      if (isIllegal) {
        const illegalOpt = document.createElement("option");
        illegalOpt.value = String(normalized);
          illegalOpt.textContent = "Illegal";
          illegalOpt.selected = true;
          input.appendChild(illegalOpt);
          input.dataset.illegal = "true";
        }

        normalizedOptions.forEach((optVal, index) => {
          const opt = document.createElement("option");
          opt.value = isCaseSensitive ? optVal.value : toCompare(optVal.value);
          opt.textContent = optVal.label;
          // Always set dataset.preview for image fields
          if (
            (field.key === "background_image" || field.key === "logo_image") &&
            optVal.value && typeof optVal.value === "string" &&
            (optVal.value.match(/\.(png|jpg|jpeg|gif|webp)$/i) || optVal.value.startsWith("/"))
          ) {
            opt.dataset.preview = optVal.value;
          }
          if (!isIllegal) {
            if (hasValue && matchIndex === index) opt.selected = true;
            if (!hasValue && !allowBlank && index === 0) opt.selected = true;
          }
          input.appendChild(opt);
        });
      }
    } else if (field.type === "hidden") {
      input = document.createElement("input");
      input.type = "hidden";
      input.value = rawValue || "";
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = field.rows || 3;
      input.value = rawValue || "";
    } else if (field.type === "boolean") {
      input = document.createElement("input");
      input.type = "checkbox";
      const valStr = String(rawValue).toLowerCase();
      input.checked = valStr === "true" || valStr === "1" || valStr === "yes" || rawValue === true;
    } else if (field.type === "date") {
      input = document.createElement("input");
      input.type = "date";
      input.value = rawValue || "";
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = rawValue || "";
    }

    input.name = field.key;
    if (field.type === "boolean") {
      input.classList.add("webeditor-checkbox");
    } else {
      input.classList.add("webeditor-input");
      if (field.width === "wide") input.classList.add("webeditor-input--wide");
    }
    if (field.disabled) input.disabled = true;

      input.addEventListener("change", () => {
        if (input.dataset) delete input.dataset.illegal;
        Object.assign(resolvedFront, getCurrentFormValues());
        // Update front matter box, preserving comments
        const frontMatterText = document.getElementById("frontMatterText");
        const rawFrontMatter = frontMatterText ? frontMatterText.value : "";
        updateFrontMatterTextWithComments(rawFrontMatter, resolvedFront);
      renderForm(frontMatterFields, parentFrontMatterFields, editState.accessOptionsCache);
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
      let labelText = field.label || field.key;
      if (field.labelByParentQualification) {
        const qual = parentFields.qualification?.toLowerCase?.() || "";
        if (field.labelByParentQualification[qual]) {
          labelText = field.labelByParentQualification[qual];
        }
      }
      label.textContent = labelText;
      label.style.display = "block";
      label.style.marginTop = "10px";

      if (field.type === "select" && field.optionsProvider && field.optionsProvider.name === "getSharedImageOptions") {
        input.addEventListener("focus", () => {
          sharedImageTargetSelect = input;
        });
        input.addEventListener("click", () => {
          sharedImageTargetSelect = input;
        });
        if (!sharedImageTargetSelect) sharedImageTargetSelect = input;
        renderImageDropZone(form, handleImageUpload);
        form.appendChild(label);
        form.appendChild(input);
        const preview = document.createElement("img");
        preview.className = "webeditor-image-preview";
        const initialValue = input.value || "";
        if (initialValue) {
          preview.src = initialValue;
          preview.style.display = "block";
        } else {
          preview.removeAttribute("src");
          preview.style.display = "none";
        }
        // Only update preview on select change, not the whole form
        input.addEventListener("change", () => {
          const val = input.value || "";
          const selectedOption = input.options[input.selectedIndex];
          const previewUrl = selectedOption?.dataset?.preview || "";
          if (previewUrl) {
            preview.src = previewUrl;
            preview.style.display = "block";
          } else if (val) {
            preview.src = val;
            preview.style.display = "block";
            preview.style.visibility = "visible";
          } else {
            preview.removeAttribute("src");
            preview.style.display = "none";
          }
          if (preview.style.display === "block") {
            preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
        form.appendChild(preview);
      } else {
        form.appendChild(label);
        form.appendChild(input);
      }
    }
  }

  async function handleImageUpload(file, dropZone, fileInput) {
    const target = sharedImageTargetSelect;
    if (!target) return;
    try {
      dropZone.classList.add("webeditor-dropzone--busy");
      dropZone.textContent = "Uploading...";
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch("/.netlify/functions/upload_shared_image", {
        method: "POST",
        headers: getNetlifyAuthHeaders({ json: true }),
        body: JSON.stringify({ name: file.name, dataUrl, forceLocal: true })
      });
      const text = await res.text();
      if (!res.ok) {
        log("[upload] error status=" + res.status + " body=" + text);
        return;
      }
      let payload = {};
      try { payload = JSON.parse(text); } catch (e) {}
      const url = payload?.url || "";
      if (!url) {
        log("[upload] missing url in response");
        return;
      }

      const cache = editState.sharedImageOptionsCache || [];
      if (!cache.find(o => (o.value || "") === url)) {
        cache.push({ value: url, label: url.split("/").pop() || url });
        editState.sharedImageOptionsCache = cache;
        sharedImageOptionsCacheGlobal = cache;
      }

      let existingOpt = Array.from(target.options).find(o => o.value === url);
      if (!existingOpt) {
        existingOpt = document.createElement("option");
        existingOpt.value = url;
        existingOpt.textContent = url.split("/").pop() || url;
        target.appendChild(existingOpt);
      }
      existingOpt.dataset.preview = dataUrl;
      target.value = url;
      target.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (err) {
      log("[upload] exception: " + err);
    } finally {
      dropZone.classList.remove("webeditor-dropzone--busy");
      dropZone.textContent = "Drop image here or click to browse";
      if (fileInput) fileInput.value = "";
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }


  // Render required fields, then optional fields with heading
  const requiredFields = fields.filter(f => f.required);
  const optionalFields = fields.filter(f => !f.required);
  for (const field of requiredFields) {
    await renderField(field);
  }
  if (optionalFields.length) {
    renderOptionalHeading();
    for (const field of optionalFields) {
      await renderField(field);
    }
  }

  // Scroll form to top after render
  setTimeout(() => {
    if (form && form.scrollTo) {
      form.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, 0);

}
