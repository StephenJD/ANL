// /netlify/functions/getRecordFromForm.js

import { parseHTML } from "linkedom";
  
export function getFormRecord(rawHTML) {
  const { document } = parseHTML(rawHTML);
  const form = document.querySelector("form");
  if (!form) throw new Error("No <form> element found in HTML input");

  const result = Array.from(form.children).flatMap(el => parseElement(el));

  const cleaned = removeEmptyArrays(structuredClone(result));
  const merged = mergeArrays(cleaned);

  console.debug('[getRecordFromForm] Merged:', JSON.stringify(merged, null, 2));

  return merged;
}

function mergeArrays(cleaned) {
  const merged = {};

  for (const entry of cleaned) {
    for (const [key, value] of Object.entries(entry)) {
      if (!(key in merged)) {
        merged[key] = value;
      } else if (Array.isArray(merged[key]) && Array.isArray(value)) {
        merged[key].push(...value);
      } else if (Array.isArray(merged[key])) {
        merged[key].push(value);
      } else if (Array.isArray(value)) {
        merged[key] = [merged[key], ...value];
      } else {
        merged[key] = [merged[key], value];
      }
    }
  }
  return merged;
}

function removeEmptyArrays(data) {
  if (Array.isArray(data)) {
    const filtered = data
      .map(removeEmptyArrays)
      .filter(el => {
        if (Array.isArray(el)) {
          const hasKeyedObject = el.some(e => e && typeof e === 'object' && !Array.isArray(e) && Object.keys(e).length);
          return el.length > 0 && hasKeyedObject;
        }
        if (el && typeof el === 'object') return Object.keys(el).length > 0;
        return el !== undefined && el !== null;
      });
    return filtered;
  } else if (data && typeof data === 'object') {
    const newObj = {};
    for (const [k, v] of Object.entries(data)) {
      const filtered = removeEmptyArrays(v);
      if (filtered !== undefined && (Array.isArray(filtered) ? filtered.length > 0 : true)) {
        newObj[k] = filtered;
      }
    }
    return newObj;
  } else {
    return data;
  }
}

function getGroupKey(container) {
  if (!container || !container.tagName) return null;

  if (container.tagName === 'FIELDSET') {
    const legend = Array.from(container.children).find(el => el.tagName === 'LEGEND');
    if (legend) return legend.textContent.trim()
  }

  const firstLabelOnly = [...container.children].find(
    c => c.tagName === 'LABEL' && !getInputOrTextAreaInLabel(c)
  );
  if (firstLabelOnly) return firstLabelOnly.textContent.trim();

  const firstLabel = Array.from(container.children)
    .find(el => el.tagName === 'LABEL' && !getInputOrTextAreaInLabel(el));
  if (firstLabel && firstLabel.textContent.trim()) return firstLabel.textContent.trim();

  return null;
}

function isControlledFieldset(fs) {
  let parent = fs.previousSibling;
  while (parent && parent.nodeType !== 1) {
    parent = parent.previousSibling;
  }

  if (parent && parent.tagName === 'LABEL') {
    const nested = parent.querySelector('input[type="checkbox"], input[type="radio"]');
    if (nested && nested.hasAttribute('checked')) return true;
  }
  return false;
}

function parseFieldset(fieldset) {
  const rawLegend = Array.from(fieldset.children).find(el => el.tagName === 'LEGEND');
  let groupKey = rawLegend ? rawLegend.textContent.trim() : '';
  if (!groupKey) groupKey = getGroupKey(fieldset);
  const hasLegend = !!groupKey;

  const children = Array.from(fieldset.children)
    .filter(el =>
      el.nodeType === 1 &&
      el.tagName !== 'LEGEND' &&
      !(el.tagName === 'FIELDSET' && isControlledFieldset(el))
    );

  const valueArray = children.flatMap(parseElement);

  if (hasLegend) {
    return { [groupKey]: valueArray };
  } else {
    return valueArray;
  }
}

function parseElement(el) {

  if (el.tagName === 'LABEL') {

    const nestedInput = getInputOrTextAreaInLabel(el);

    if (nestedInput) {
      return parseInputOrControl(el, nestedInput);
    }

    if (el.parentElement?.tagName === 'FIELDSET' && el === el.parentElement.firstElementChild) {
      return [];
    }

    const nextEl = el.nextElementSibling;

    if (nextEl && (nextEl.tagName === 'INPUT' || nextEl.tagName === 'TEXTAREA')) {
      nextEl.__handledByLabel = true;   // prevent double parsing
      return parseInputOrControl(el, nextEl);
    }

  }

  if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.__handledByLabel) {
    return [];
  }

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    return parseInputOrControl(el, el);
  }

  if (el.tagName === 'FIELDSET') {
    return parseFieldset(el);
  }

  if (el.children?.length) {
    return Array.from(el.children).flatMap(parseElement);
  }

  return [];
}

function getInputOrTextAreaInLabel(labelEl) {
  return labelEl.querySelector('input, textarea');
}

function getInputType(element) {
  if (!element) return '';
  if (element.tagName === 'TEXTAREA') return 'text';
  return (element.getAttribute('type') || element.type || 'text').toLowerCase();
}

function getLabelText(labelEl) {
  if (!labelEl) return '';
  const clone = labelEl.cloneNode(true);
  clone.querySelector('input, textarea')?.remove();
  return clone.textContent.trim();
}

function parseInputOrControl(labelEl, inputEl) {

  const type = getInputType(inputEl);

  if (['checkbox', 'radio'].includes(type)) {
    return parseCheckedInputWithFieldset(labelEl, inputEl);
  }

  const key = getLabelText(labelEl);

  let value;

  if (inputEl.tagName === 'TEXTAREA') {
    value = inputEl.textContent.trim() || '';
  } else {
    value = (inputEl.getAttribute('value') || '').trim();
  }

  return value ? [{ [key]: value }] : [];
}

function parseCheckedInputWithFieldset(labelEl, inputEl) {

  const isChecked = inputEl.getAttribute('checked') !== null || /\bchecked\b/i.test(inputEl.outerHTML);
  if (!isChecked) return [];

  let fieldsetControlledByCheckedInput = null;

  for (const child of labelEl.children) {
    if (child.tagName === 'FIELDSET') {
      fieldsetControlledByCheckedInput = child;
      break;
    }
  }

  if (!fieldsetControlledByCheckedInput) {
    let next = labelEl.nextSibling;
    while (next && next.nodeType !== 1) next = next.nextSibling;
    if (next && next.tagName === 'FIELDSET') {
      fieldsetControlledByCheckedInput = next;
    }
  }

  const labelText = getLabelText(labelEl);

  if (fieldsetControlledByCheckedInput) {

    const parsed = parseFieldset(fieldsetControlledByCheckedInput);

    const value = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed)[0];

    return [{ [labelText]: value }];
  }

  return [labelText];
                          }
