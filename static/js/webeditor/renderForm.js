// static/js/webeditor/renderForm.js
import { fieldSchema } from "./fieldSchema.js";

let sharedImageOptionsCacheGlobal = null;

export async function renderForm(node, frontMatter, accessOptionsCache) {
  const form = document.getElementById("editForm");
  form.innerHTML = "";

  const resolvedFront = { ...frontMatter };
  const editState = {
    accessOptionsCache: accessOptionsCache || null,
    sharedImageOptionsCache: sharedImageOptionsCacheGlobal
  };
  let sharedImageDropZoneInserted = false;
  let sharedImageTargetSelect = null;

  function applyDerivedDefaults(values) {
    const derive = fieldSchema.derive || {};
    if (!node?._newEdit && !values.page_type && typeof derive.page_type === "function") {
      values.page_type = derive.page_type({ node, frontMatter });
    }
    if (node?._newEdit && !values.page_type) {
      const pageTypeField = fieldSchema.fields.find(f => f.key === "page_type");
      if (pageTypeField?.options?.length) values.page_type = pageTypeField.options[0];
    }
    if (!node?._newEdit && !values.content_type && values.page_type === "Content" && typeof derive.content_type === "function") {
      values.content_type = derive.content_type({ node, frontMatter });
    }
    if (node?._newEdit && values.page_type === "Content" && !values.content_type) {
      const contentField = fieldSchema.fields.find(f => f.key === "content_type");
      let options = contentField?.options || [];
      const parentOptions = contentField ? getOptionsByParentQualification(contentField) : null;
      if (parentOptions) options = parentOptions;
      if (options.length) values.content_type = options[0];
    }
    if (!node?._newEdit && !values.give_content_prev_next_buttons && values.page_type === "Navigation" && typeof derive.give_content_prev_next_buttons === "function") {
      values.give_content_prev_next_buttons = derive.give_content_prev_next_buttons({ node, frontMatter });
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

  async function getSharedImageOptions() {
    if (editState.sharedImageOptionsCache) return editState.sharedImageOptionsCache;
    try {
      const res = await fetch("/.netlify/functions/list_shared_images");
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

  function updateFrontMatterText(values) {
    const frontMatterText = document.getElementById("frontMatterText");
    if (!frontMatterText) return;
    const derived = { ...(node?.frontMatterOriginal || {}) };
    for (const field of fieldSchema.fields) {
      if (field.frontMatter === false) continue;
      if (!Object.prototype.hasOwnProperty.call(values, field.key)) continue;
      const v = values[field.key];
      const keyLower = field.key.toLowerCase();
      Object.keys(derived).forEach(k => {
        if (k.toLowerCase() === keyLower) delete derived[k];
      });
      if (v === "" || v == null || String(v).toLowerCase() === "false") {
        delete derived[keyLower];
      } else {
        derived[keyLower] = v;
      }
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

  function getParentQualification() {
    const parent = node?.newParent || node?.parent;
    return String(parent?.qualification || "").toLowerCase();
  }

  function getOptionsByParentQualification(field) {
    if (!field.optionsByParentQualification) return null;
    const qual = getParentQualification();
    return field.optionsByParentQualification[qual] || null;
  }

  async function renderField(field) {
    if (!isVisible(field)) return;

    let input = null;
    const rawValue = resolvedFront[field.key] ?? field.default ?? "";

    if (field.type === "hidden") {
      input = document.createElement("input");
      input.type = "hidden";
      input.value = value || "";
    } else if (field.type === "select") {
      input = document.createElement("select");
      let options = field.options || [];
      if (field.optionsProvider === "get_role_options") {
        options = await getAccessOptions();
      } else if (field.optionsProvider === "get_shared_images") {
        options = await getSharedImageOptions();
      }
      const parentOptions = getOptionsByParentQualification(field);
      if (parentOptions) {
        options = parentOptions;
      }
      const allowBlank = field.allowBlank === true;
      if (!options.length && !allowBlank) options = [""];

      const normalized = typeof field.normalizeValue === "function"
        ? field.normalizeValue(rawValue, { node, frontMatter })
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
        if (!isIllegal) {
          if (hasValue && matchIndex === index) opt.selected = true;
          if (!hasValue && !allowBlank && index === 0) opt.selected = true;
        }
        input.appendChild(opt);
      });
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
      let labelText = field.label || field.key;
      if (field.labelByParentQualification) {
        const qual = getParentQualification();
        if (field.labelByParentQualification[qual]) {
          labelText = field.labelByParentQualification[qual];
        }
      }
      label.textContent = labelText;
      label.style.display = "block";
      label.style.marginTop = "10px";

      if (field.type === "select" && field.optionsProvider === "get_shared_images") {
        input.addEventListener("focus", () => {
          sharedImageTargetSelect = input;
        });
        input.addEventListener("click", () => {
          sharedImageTargetSelect = input;
        });
        if (!sharedImageTargetSelect) sharedImageTargetSelect = input;

        if (!sharedImageDropZoneInserted) {
          sharedImageDropZoneInserted = true;
          const uploadRow = document.createElement("div");
          uploadRow.className = "webeditor-upload-row";

          const dropZone = document.createElement("div");
          dropZone.className = "webeditor-dropzone";
          dropZone.textContent = "Drop image here or click to browse";

          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.className = "webeditor-file-input";

          dropZone.addEventListener("click", () => fileInput.click());
          dropZone.addEventListener("dragover", e => {
            e.preventDefault();
            dropZone.classList.add("webeditor-dropzone--active");
          });
          dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("webeditor-dropzone--active");
          });
          dropZone.addEventListener("drop", e => {
            e.preventDefault();
            dropZone.classList.remove("webeditor-dropzone--active");
            const file = e.dataTransfer?.files?.[0];
            if (file) handleImageUpload(file, dropZone, fileInput);
          });

          fileInput.addEventListener("change", () => {
            const file = fileInput.files && fileInput.files[0];
            if (file) handleImageUpload(file, dropZone, fileInput);
          });

          uploadRow.appendChild(dropZone);
          uploadRow.appendChild(fileInput);
          form.appendChild(uploadRow);
        }

        form.appendChild(label);
        form.appendChild(input);

        const preview = document.createElement("img");
        preview.className = "webeditor-image-preview";
        const initialValue = input.value || "";
        if (initialValue) {
          preview.src = initialValue;
          preview.style.display = "block";
        } else {
          preview.style.display = "none";
        }
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
          } else {
            preview.removeAttribute("src");
            preview.style.display = "none";
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
        headers: { "Content-Type": "application/json" },
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

  let optionalHeadingInserted = false;
  for (const field of fieldSchema.fields) {
    if (!field.required && !optionalHeadingInserted) {
      renderOptionalHeading();
      optionalHeadingInserted = true;
    }
    await renderField(field);
  }

  updateFrontMatterText(getCurrentFormValues());
  setTimeout(() => {
    try {
      updateFrontMatterText(getCurrentFormValues());
    } catch (e) {
      // no-op
    }
  }, 0);

}
