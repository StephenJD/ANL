// static/js/webeditor/service_frontmatter_controls.js
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
export async function service_frontmatter_controls(frontMatterFields, parentFrontMatterFields, accessOptionsCache, rawFrontMatter) {
  log('[service_frontmatter_controls] (static) called with frontMatterFields:', frontMatterFields, 'parentFrontMatterFields:', parentFrontMatterFields, 'accessOptionsCache:', accessOptionsCache);
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
    let rawValue = resolvedFront[field.key] ?? field.default ?? '';
    if (Array.isArray(rawValue)) {
      log('[service_frontmatter_controls] field', field.key, 'rawValue is array:', rawValue);
      rawValue = rawValue[0] || '';
    }
    if (field.key === 'access') {
      log('[service_frontmatter_controls] access field rawValue:', rawValue, 'typeof:', typeof rawValue);
    }
    if (field.type === 'boolean') {
      el.checked = String(rawValue).toLowerCase() === 'true' || rawValue === true;
      log(`[service_frontmatter_controls] boolean field '${field.key}' set checked:`, el.checked, 'rawValue:', rawValue);
    } else if (field.type === 'select') {
      // Populate options if needed
      if (typeof field.optionsProvider === 'function') {
        // Async populate
        field.optionsProvider().then(options => {
          log('[service_frontmatter_controls] options for', field.key, ':', options);
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
          // After options are populated, select the value if present, else blank
          let setValue = rawValue;
          // If the value is not in the options, select blank
          const optionValues = Array.from(el.options).map(opt => opt.value);
          if (!optionValues.includes(setValue)) {
            log('[service_frontmatter_controls] value', setValue, 'not found in options for', field.key, '; selecting blank');
            setValue = '';
          }
          log('[service_frontmatter_controls] setting el.value for', field.key, 'to', setValue);
          el.value = setValue;
          log(`[service_frontmatter_controls] select field '${field.key}' el.value after set:`, el.value);
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
        let setValue = rawValue;
        if (Array.isArray(rawValue)) setValue = rawValue[0] || '';
        log('[service_frontmatter_controls] setting el.value for', field.key, 'to', setValue);
        el.value = setValue;
        log(`[service_frontmatter_controls] select field '${field.key}' el.value after set:`, el.value);
      } else {
        let setValue = rawValue;
        if (Array.isArray(rawValue)) setValue = rawValue[0] || '';
        log('[service_frontmatter_controls] setting el.value for', field.key, 'to', setValue);
        el.value = setValue;
        log(`[service_frontmatter_controls] select field '${field.key}' el.value after set:`, el.value);
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
    // Special log for QR Code field
    if (field.key === 'qrCode') {
      log(`[service_frontmatter_controls] QR Code field: el.checked=`, el.checked, 'rawValue:', rawValue);
    }
  }

  // On load, set front-matter box to rawFrontMatter if provided
  const frontMatterText = document.getElementById('frontMatterText');
  log('[service_frontmatter_controls] rawFrontMatter at load:', rawFrontMatter);
  if (frontMatterText) {
    if (rawFrontMatter && !frontMatterText.value) {
      frontMatterText.value = rawFrontMatter;
      log('[service_frontmatter_controls] frontMatterText.value initialized to rawFrontMatter');
    } else {
      log('[service_frontmatter_controls] frontMatterText.value already set or rawFrontMatter missing:', frontMatterText.value);
    }
  } else {
    log('[service_frontmatter_controls] frontMatterText element not found at load');
  }

  // Bind change/input events for all fields
  const form = document.getElementById('editForm');
  if (form) {
    form.onchange = form.oninput = () => {
      log('[service_frontmatter_controls] form change/input event fired');
      const obj = {};
      for (const field of fields) {
        const el = document.getElementById(field.key);
        // Only log missing fields for troubleshooting
        if (!el) {
          log(`[service_frontmatter_controls] MISSING field: ${field.key}`);
          continue;
        }
        if (field.type === 'boolean') {
          obj[field.key] = el.checked ? true : false;
        } else {
          obj[field.key] = el.value;
        }
      }
      log('[service_frontmatter_controls] new form values:', obj);
      // Update front matter box using schema order and preserving comments
      const frontMatterText = document.getElementById('frontMatterText');
      if (!frontMatterText) {
        log('[service_frontmatter_controls] ERROR: frontMatterText element not found in DOM');
        return;
      }
      // Always serialize from current form state, never rely on rawFrontMatter
      const baseFrontMatter = frontMatterText.value || '';
      try {
        const updated = serializeFrontMatter(baseFrontMatter, obj, fields.map(f => f.key));
        frontMatterText.value = updated;
        log('[service_frontmatter_controls] updated frontMatterText.value:', frontMatterText.value);
      } catch (e) {
        log('[service_frontmatter_controls] ERROR in serializeFrontMatter:', e);
      }
    };
  }
}
