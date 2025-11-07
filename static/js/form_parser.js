// /static/js/form_parser.js
// --- utils ---


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
export function urlize(str) {
  return str
   .toLowerCase()
  .trim()
  .replace(/\s+/g, "_")
  .replace(/[^a-z0-9_-]+/g, "")
  .replace(/^_+|_+$/g, ""); // remove leading/trailing underscores or hyphens
}

function flattenRecord(record) {
  const result = [];

  function recurse(value) {
    if (Array.isArray(value)) {
      value.forEach(v => recurse(v));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        result.push(k);
        recurse(v);
      }
    } else {
      result.push(String(value));
    }
  }

  recurse(record);
  return result;
}

export function setInputsFromRecord(form, record) {
	
  const pathPartsArr = flattenRecord(record);

  let lastRecordKey = null;
  let lastRadioElement = null
  let lastFormText = null;

  let pathIndex = 0;
  let pathPart = urlize(pathPartsArr[pathIndex]);

  console.log("setInputsFromRecord pathPartsArr:", pathPartsArr);
  
  const allElements = [...form.querySelectorAll('input, label, legend')];
  for (const el of allElements) {
    if (lastRecordKey && (el.tagName !== 'INPUT')) {
      //console.log("Next El: lastRecordKey:", lastRecordKey, "GetNextPath");
      ++pathIndex;
      pathPart = pathIndex < pathPartsArr.length ? urlize(pathPartsArr[pathIndex]) : null;
    }
    //console.log("next el:", el, "lastRecordKey", lastRecordKey,...(pathPart ? [`pathPart: ${pathPart}`] : []),...(el.name ? [`el.name: ${el.name}`] : []));

    const tag = el.tagName;
    if (tag !== 'INPUT') {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('input, select, textarea').forEach(n => n.remove());
      // Skip elements that have no *own* text (i.e., only nested tags)
      const hasOwnText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!hasOwnText) continue;
      const text = urlize(clone.textContent);
      if (text) {
        lastFormText = text;
        if (text === pathPart  ) {
          lastRecordKey = pathPart;
        } 
        //console.log("Got FormText: lastRecordKey/FormText:", lastRecordKey, text);
      }
    } else if (lastRecordKey) {
      const type = el.type;
      if (['text', 'tel', 'email', 'date'].includes(type)) {
	  ++pathIndex;	
        //console.log(`text set '${pathPartsArr[pathIndex]}'`);
        el.value = pathPartsArr[pathIndex];
        ++pathIndex;
      } else if (type === 'checkbox') {
        el.checked = (lastFormText === lastRecordKey);
	  if (el.checked) ++pathIndex;
        //console.log(`checkbox ${lastFormText} =? key: ${lastRecordKey}: ${el.checked}`);
      } else if (type === 'radio') {
        el.checked = lastFormText === lastRecordKey;
        lastRadioElement = el;
	  if (el.checked) ++pathIndex;
        //console.log(`radio ${lastFormText} =? ${lastRecordKey}: ${el.checked}`);
      }
      pathPart = pathIndex < pathPartsArr.length ? urlize(pathPartsArr[pathIndex]) : null;
	lastRecordKey = null;
    }
  }
}

export function getFormRecord(form) {
/*
These are the form rules:
1. All radios and checkboxes (values) are in fieldsets and can be a mix of radios and checkboxes
2. A fieldset with no legend contributes to the value array of its parent label or legend.
3. The radio / checkbox members of a fieldset form a value array
4. A radio or checkbox immediatly followed by a fieldset becomes the key for that fieldset
5. Nested labels or legends become nested keys.
6. Text-like inputs are always values and may be inside or outside fieldsets.
*/

const result = Array.from(form.children).flatMap(el => parseElement(el));

// frozen snapshot of original parse
const snapshotFinal = JSON.parse(JSON.stringify(result));
console.debug('Final recordSet snapshot:', snapshotFinal);

// remove empty arrays on a cloned copy
const cleaned = removeEmptyArrays(structuredClone(result));
const snapshotCleaned = JSON.parse(JSON.stringify(cleaned));
console.debug('Cleaned recordSet snapshot:', snapshotCleaned);

// merge cleaned array into object
const merged = Object.assign({}, ...cleaned);
const snapshotMerged = JSON.parse(JSON.stringify(merged));
console.debug('Merged recordSet snapshot:', snapshotMerged);

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
  //For every direct child element of this <fieldset>, call parseElement() on it, and flatten all returned arrays into a single array.
  const items = Array.from(fieldset.children).flatMap(parseElement);
  return hasLegend ? { [urlize(legend.textContent)]: items } : items;
}

function parseElement(el) {
  //console.debug('Parsing element:', el.tagName, el);

  if (el.tagName === 'FIELDSET') return [parseFieldset(el)];
  else if (el.tagName === 'LABEL') { // look for input within a label
    const input = el.querySelector('input');
    if (!input) return [];
    else if (['checkbox','radio'].includes(input.type)) {
	return parseCheckedInputWithFieldset(el, input);
    } else { // text-input
      return [{ [getLabelText(el)]: input.value }]; // Braces inserted round key:value pairs
    }
  } else if (el.tagName === 'INPUT') {
    if (['checkbox','radio'].includes(el.type)) {
      if (el.checked) {
        const labelText = getLabelText(el.closest('label'));
        //console.debug('INPUT element (checked):', labelText);
        return [labelText];
      } else return [];
    } else { // text-type input
      return [el.value];
    }
  } else if (el.children.length) { // extract and process any elements wrapped in non-text ways (<p>, <div> etc.)
    const nestedItems = Array.from(el.children).flatMap(c => parseElement(c));
    //console.debug('Nested children parsed:', nestedItems);
    return nestedItems;
  }
  return [];
}

function parseCheckedInputWithFieldset(labelEl, inputEl) {
  if (!inputEl.checked) return [];
  // Look for a fieldset inside a label
  const childFieldset = Array.from(labelEl.children)
    .find(c => c.tagName === 'FIELDSET');
  
  let fieldsetControlledByCheckedInput;
  if (childFieldset) {
    fieldsetControlledByCheckedInput = childFieldset;
  } else if (labelEl.nextElementSibling?.tagName === 'FIELDSET') { // Look for an immediate sibling fieldset
    fieldsetControlledByCheckedInput = labelEl.nextElementSibling;
  } else {
    fieldsetControlledByCheckedInput = null;
  }
  
  const labelText = getLabelText(labelEl);
  if (fieldsetControlledByCheckedInput) {
    return [{ [labelText]: parseFieldset(fieldsetControlledByCheckedInput) }]; // Braces inserted round key:value pairs
  }
  return [labelText];
}

function getLabelText(labelEl) {
  if (!labelEl) return 'checked_input';
  const clone = labelEl.cloneNode(true);
  clone.querySelector('input')?.remove();
  return urlize(clone.textContent);
}
