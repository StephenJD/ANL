// static/js/webeditor/renderForm.js
import { fieldSchema } from "./fieldSchema.js";
import { serializeFrontMatter } from "./normalizeFrontMatter.js";
import { renderImageDropZone } from "./imageDropZone.js";
import { getNetlifyAuthHeaders } from "./authHeaders.js";


let sharedImageOptionsCacheGlobal = null;
let accessOptionsCacheGlobal = null;

export async function getAccessOptions() {
  if (accessOptionsCacheGlobal) {
    log('[getAccessOptions] returning global cache:', accessOptionsCacheGlobal);
    return accessOptionsCacheGlobal;
  }
  try {
    log('[getAccessOptions] fetching from /get_role_options');
    const res = await fetch("/.netlify/functions/get_role_options", {
      headers: getNetlifyAuthHeaders()
    });
    log('[getAccessOptions] fetch response status:', res.status);
    if (!res.ok) throw new Error("HTTP " + res.status);
    let options = await res.json();
    log('[getAccessOptions] raw options from server:', options);
    options = options.map(o => o.Role || o.role || o);
    options.unshift("Public");
    log('[getAccessOptions] normalized options:', options);
    accessOptionsCacheGlobal = options;
    return options;
  } catch (err) {
    log('[getAccessOptions] ERROR:', err);
    accessOptionsCacheGlobal = ["Public"];
    return ["Public"];
  }
}

export async function getSharedImageOptions() {
  if (sharedImageOptionsCacheGlobal) {
    log('[getSharedImageOptions] returning global cache:', sharedImageOptionsCacheGlobal);
    return sharedImageOptionsCacheGlobal;
  }
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
    sharedImageOptionsCacheGlobal = normalized;
    return normalized;
  } catch (err) {
    log("[getSharedImageOptions] ERROR: " + err);
    sharedImageOptionsCacheGlobal = [];
    return [];
  }
}

// Accepts an extra rawFrontMatter param for initial display
export async function renderForm(frontMatterFields, parentFrontMatterFields, accessOptionsCache, rawFrontMatter) {
  log('[renderForm] (static) called with frontMatterFields:', frontMatterFields, 'parentFrontMatterFields:', parentFrontMatterFields, 'accessOptionsCache:', accessOptionsCache);
  const { fields, derive, deriveType, isVisible } = fieldSchema;
  const resolvedFront = { ...frontMatterFields };
  const parentFields = { ...parentFrontMatterFields };
  if (!parentFields.qualification) {
    const parentType = String(parentFields.type || "").toLowerCase();
    if (parentType === "collated_page") parentFields.qualification = "collated:";
    else if (parentType === "navigation") parentFields.qualification = "navigation:";
  }

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

  // Show/hide and set values for all static fields
  for (const field of fields) {
    const el = document.getElementById(field.key);
    if (!el) continue;
    // Visibility
    if (isVisible(field, resolvedFront)) {
      el.closest('label') ? el.closest('label').style.display = '' : el.style.display = '';
    } else {
      el.closest('label') ? el.closest('label').style.display = 'none' : el.style.display = 'none';
      continue;
    }
    // Set value
    const rawValue = resolvedFront[field.key] ?? field.default ?? '';
    if (field.type === 'boolean') {
      el.checked = String(rawValue).toLowerCase() === 'true' || rawValue === true;
    } else if (field.type === 'select') {
      // Populate options if needed
      if (typeof field.optionsProvider === 'function') {
        // Async populate
        field.optionsProvider().then(options => {
          el.innerHTML = '';
          if (field.allowBlank) {
            const blankOpt = document.createElement('option');
            blankOpt.value = '';
            blankOpt.textContent = field.blankLabel || 'None';
            el.appendChild(blankOpt);
          }
          (options || []).forEach(opt => {
            const o = document.createElement('option');
            if (typeof opt === 'object') {
              o.value = opt.value;
              o.textContent = opt.label;
            } else {
              o.value = o.textContent = String(opt);
            }
            el.appendChild(o);
          });
          // Always set value after options are populated
          el.value = rawValue;
        });
      } else if (Array.isArray(field.options)) {
        el.innerHTML = '';
        if (field.allowBlank) {
          const blankOpt = document.createElement('option');
          blankOpt.value = '';
          blankOpt.textContent = field.blankLabel || 'None';
          el.appendChild(blankOpt);
        }
        (field.options || []).forEach(opt => {
          const o = document.createElement('option');
          o.value = o.textContent = String(opt);
          el.appendChild(o);
        });
        el.value = rawValue;
      } else {
        el.value = rawValue;
      }
    } else if (field.type === 'textarea') {
      el.value = rawValue;
    } else if (field.type === 'date') {
      el.value = rawValue;
    } else {
      el.value = rawValue;
    }
    // Enable/disable
    el.disabled = !!field.disabled;
  }

  // On load, set front-matter box to rawFrontMatter if provided
  const frontMatterText = document.getElementById('frontMatterText');
  if (frontMatterText && rawFrontMatter) {
    frontMatterText.value = rawFrontMatter;
  }

  // Bind change/input events for all fields
  const form = document.getElementById('editForm');
  if (form) {
    form.onchange = form.oninput = () => {
      const obj = {};
      for (const field of fields) {
        const el = document.getElementById(field.key);
        if (!el) continue;
        if (field.type === 'boolean') {
          obj[field.key] = el.checked ? true : false;
        } else {
          obj[field.key] = el.value;
        }
      }
      // Update front matter box using schema order and preserving comments
      const frontMatterText = document.getElementById('frontMatterText');
      if (frontMatterText && rawFrontMatter) {
        frontMatterText.value = serializeFrontMatter(rawFrontMatter, obj, fields.map(f => f.key));
      }
    };
  }
}
