// /netify/functions/getRecordFromForm.js

 /*
 Record is of the form:
    "name": "Stephen Dolley",
    "contact_details": {
        "mobile_no": "07980 446573",
        "email": "sjdolley@gmail.com"
    },
    "role": {
        "Chinley": "Helper",
        "Whaley Bridge": "Helper"
    },
    "dbs": {
        "dbs_number": "65765765"
    }
}

Form is like:
<label>Name: <input required class="name" type="text" /></label>
<fieldset><legend>Contact Details</legend>
  <label>Mobile No: <input required type="tel" /></label>
  <label>Email: <input required type="email" /></label>
</fieldset>

<fieldset><legend>Role</legend>
  <label><input type="checkbox">Chinley</label>
   <label><input required type="radio" name="r1"> Leader</label>
   <label><input required type="radio" name="r1"> Helper</label>
  <label><input type="checkbox">Whaley Bridge</label>
   <label><input required type="radio" name="r2"> Leader</label>
   <label><input required type="radio" name="r2"> Helper</label>
</fieldset>

 Takes a record-path such as one of: 
   {"name": "Stephen Dolley"}, 
   {"contact_details": "mobile_no": "07980 446573"},
   {"email": "sjdolley@gmail.com"},
   {"role": "Chinley": "Leader"},
   {"Whaley Bridge": "Helper"},
 The last arg is the "value".
 Start at startElement and look at each element-tagname ("FIELDSET", "LEGEND", "LABEL", "INPUT")
  If "FIELDSET", "LEGEND", "LABEL" extract the urlized(text) and if non-null set this a map-key (e.g. name, contact_details, mobile_no, role, chinley, leader)
  If "INPUT", extract type (text, tel, email, date, checkbox, radio,) :
    If type == text, tel, email, date: Use the "value" to set the input for the previous map-key.
    If type == checkbox: select the check box.
    If type == radio: If value == previous map-key, select it. Find last radio with same name. 
  Return next element.

e.g. for {"role": "Chinley": "Helper"} starting at <input email>:
   map-key: "role", (no input)
   map-key: "chinley", input = checkbox (select it).
   map-key: "leader", input = radio (value matches, select it)
   find last "r1" radio.
   Return next element == <label Whaley Bridge>

for {"Whaley Bridge": "Helper"} starting at <label Whaley Bridge>,
   map-key: "whaley_bridge", input = checkbox (select it).
   map-key: "leader", input = radio (no value match).
   map-key: "helper", input = radio (value matches, select it)
   find last "r2" radio.
   Return next element == null;
     
*/
import { parseHTML } from "linkedom";

export function urlize(str) {
  return str.trim();
  // return str
   // .toLowerCase()
  // .trim()
  // .replace(/\s+/g, "_")
  // .replace(/[^a-z0-9_-]+/g, "")
  // .replace(/^_+|_+$/g, ""); // remove leading/trailing underscores or hyphens
}

export function getFormRecord(rawHTML) {
/*
These are the form rules:
1. All radios and checkboxes (values) are in fieldsets and can be a mix of radios and checkboxes
2. A fieldset with no legend contributes to the value array of its parent label or legend.
3. The radio / checkbox members of a fieldset form a value array
4. A radio or checkbox immediatly followed by a fieldset becomes the key for that fieldset
5. Nested labels or legends become nested keys.
6. Text-like inputs are always values and may be inside or outside fieldsets.
*/
  const { document } = parseHTML(rawHTML);
  const form = document.querySelector("form");
  if (!form) throw new Error("No <form> element found in HTML input");

//console.debug('[getRecordFromForm] form:', form.outerHTML);

const result = Array.from(form.children).flatMap(el => parseElement(el));

// frozen snapshot of original parse
const snapshotFinal = JSON.parse(JSON.stringify(result));
//console.debug('[getRecordFromForm] completed parse:', JSON.stringify(snapshotFinal, null, 2));

// remove empty arrays on a cloned copy
const cleaned = removeEmptyArrays(structuredClone(result));
const snapshotCleaned = JSON.parse(JSON.stringify(cleaned));
//console.debug('[getRecordFromForm] Cleaned:', JSON.stringify(snapshotCleaned, null, 2));

// merge cleaned array into object
const merged = Object.assign({}, ...cleaned);
const snapshotMerged = JSON.parse(JSON.stringify(merged));
console.debug('[getRecordFromForm] Merged:', JSON.stringify(snapshotMerged, null, 2));

// --- Flatten single top key with nested array of objects ---
const keys = Object.keys(merged);
if (keys.length === 1 && Array.isArray(merged[keys[0]])) {
  const inner = merged[keys[0]];
  if (inner.every(item => item && typeof item === "object" && !Array.isArray(item))) {
    const flattened = Object.assign({}, ...inner);
    console.debug('[getRecordFromForm] Flattened nested array →', flattened);
    return flattened;
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
          // keep only arrays that are non-empty and contain at least one keyed object
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

function parseFieldset(fieldset) {
  const legend = fieldset.querySelector('legend');
  const hasLegend = !!legend;
  const children = Array.from(fieldset.children)
    .filter(el => el.nodeType === 1 && el.tagName !== 'LEGEND');

  const items = children.flatMap(parseElement);

  if (hasLegend) {
    const key = urlize(legend.textContent);
    console.debug('[getRecordFromForm] parseFieldset:', key, items);
    return { [key]: items };
  } else {
    let someInput;
    const labelWithInput = children.find(el => el.tagName === 'LABEL' && (someInput = getInputOrTextAreaInLabel(el)));
    if (labelWithInput) {
      const key = urlize(labelWithInput.textContent);
      const value = someInput.getAttribute('value') || '';
      return { [key]: value };
    } else {
      const labelAfterInput = children.find(el => el.tagName === 'LABEL');
      if (labelAfterInput) {
        someInput = labelAfterInput.nextElementSibling;
        if (someInput && someInput.tagName === 'INPUT' || someInput.tagName === 'TEXTAREA') {
          const key = urlize(labelAfterInput.textContent);
          const value = someInput.getAttribute('value') || '';
          return { [key]: value };
        }
      }
    }
  }
  return items;
}

function getInputType(input) {
  if (el.tagName === 'TEXTAREA') return 'text';
  return (input?.getAttribute?.('type') || input?.type || '').toLowerCase();
}

function getInputOrTextAreaInLabel(labelEl) {
  return labelEl.querySelector('input, textarea');
}

function parseElement(el) {
  console.debug('[getRecordFromForm] Element:', el.tagName);

  if (el.tagName === 'FIELDSET') {
    return [parseFieldset(el)];
  }

  else if (el.tagName === 'LABEL') {

    const someInput = getInputOrTextAreaInLabel(el);

    if (!someInput) return [];

    const type = getInputType(someInput);
    if (['checkbox', 'radio'].includes(type)) {
      const result = parseCheckedInputWithFieldset(el, input);
      console.debug('[getRecordFromForm] checkbox processed:', result);
      return result;
    } else { // text-like input
      const labelText = getLabelText(el);
      const value = someInput.getAttribute('value') || '';
      console.debug('[getRecordFromForm] Text-like input processed:', { [labelText]: value });
      return [{ [labelText]: value }];
    }
  }

  else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const type = getInputType(el);
    if (['checkbox', 'radio'].includes(type)) {
      if (el.hasAttribute('checked')) {
        const labelText = getLabelText(el.closest('label'));
        console.debug('[getRecordFromForm] INPUT checked:', labelText);
        return [labelText];
      } else {
        //console.debug('[getRecordFromForm] INPUT not checked:', el.outerHTML);
        return [];
      }
    } else { // text-like input
      const value = el.getAttribute('value') || '';
      console.debug('[getRecordFromForm] INPUT text value:', value);
      return [value];
    }
  }

  else if (el.children.length) {
    console.debug(`[getRecordFromForm] Nested element ${el.children.length} children:`);
    const nestedItems = Array.from(el.children).flatMap(parseElement);
    return nestedItems;
  }
  return [];
}

function parseCheckedInputWithFieldset(labelEl, inputEl) {
  if (!inputEl.hasAttribute('checked')) return [];

  const childFieldset = Array.from(labelEl.children)
    .find(c => c.tagName === 'FIELDSET');

  let fieldsetControlledByCheckedInput = null;
  if (childFieldset) {
    fieldsetControlledByCheckedInput = childFieldset;
  } else if (labelEl.nextElementSibling?.tagName === 'FIELDSET') {
    fieldsetControlledByCheckedInput = labelEl.nextElementSibling;
  }

  const labelText = getLabelText(labelEl);
  if (fieldsetControlledByCheckedInput) {
    return [{ [labelText]: parseFieldset(fieldsetControlledByCheckedInput) }];
  }
  console.debug('[getRecordFromForm] INPUT :', labelText);
  return [labelText];
}


function getLabelText(labelEl) {
  if (!labelEl) return 'checked_input';
  const clone = labelEl.cloneNode(true);
  clone.querySelector('input')?.remove();
  return urlize(clone.textContent);
}
