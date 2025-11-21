// /netify/functions/getRecordFromForm.js
/*
These are the form rules:
1. Labels and inputs may exist outside of any Fieldset
2. Groups are ONLY created by fieldsets (gives visual grouping in browser) and may be nested
3. Labels and legends become keys. If a legend is missing from a fieldset, an immediatly following label serves the same purpose.
     Note: the label may be before or after a nested input. 
4. Nested labels or legends become nested keys.
5. Text-like inputs are always values
6. A fieldset may have multiple childen forming an array of values
7. Fieldsets can contain any mix of radios, checkboxes, text-inputs and text-areas
8. A fieldset with no legend contributes to the value array of its parent label or legend.
9. A radio or checkbox immediatly followed by a fieldset becomes the key for that fieldset

Examples:
Rule 3: Labels and legends become keys. If a legend is missing from a fieldset, an immediatly following label serves the same purpose.
All these should produce: {"Name" : "Stephen"}

<label>Name <input> </label> # Rule 1: Outside of any Fieldset

<label><input> Name </label> 

<label>Name </label>
  <input>

<fieldset>
  <legend>Name</legend>
   <input>
</fieldset>

<fieldset>
   <label>Name <input></label>
</fieldset>

<fieldset>
   <label>Name </label>
   <input>
</fieldset>

Rule 6: A fieldset may have multiple childen forming an array of values:
Rule 7: Fieldsets can contain any mix of radios, checkboxes, text-inputs and text-areas
Example:
<fieldset>
<legend>Present</legend> # Rule 3: Mixed inputs 
  <label>Mobile No: <input type="tel" /></label> # Rule 4: Nested labels or legends become nested keys.
  <label>Email: <input type="email" /></label>   # Rule 5: Text-like inputs are always values

  <label><input type="checkbox"> Stephen Dolley</label>
  <label><input type="checkbox"> Cheryl Cross</label>
  
  <label><input type="radio"> Had fob</label>
  <label><input type="radio"> Were let in</label>
</fieldset>

Produces:
{"Present": [
        {
          "Mobile No:": "07980 446573"
        },
        {
          "Email:": "sjdolley@gmail.com"
        },
        "Stephen Dolley",
        "Were let in"
      ],
}

Rule 8: A fieldset with no legend contributes to the value array of its parent label or legend.
Example:
<fieldset><legend>Role</legend>
  <fieldset>
   <label><input type="checkbox">Chinley</label> # Rule 9: A radio or checkbox immediatly followed by a fieldset becomes the key for that fieldset
   <fieldset>
   <label><input required type="radio"> Leader</label>
   <label><input required type="radio"> Helper</label>
   </fieldset>
  </fieldset>
  <fieldset>
   <label><input type="checkbox">Whaley Bridge</label>
   <fieldset>
   <label><input required type="radio"> Leader</label>
   <label><input required type="radio"> Helper</label>
   </fieldset>
  </fieldset>
</fieldset>

Produces:
{"Role": [
        [
          {
            "Chinley": [
              "Leader"
            ]
          }
        ],
        [
          {
            "Whaley Bridge": [
              "Helper"
            ]
          }
        ]
      ]
}
*/

import { parseHTML } from "linkedom";
  
export function getFormRecord(rawHTML) {
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
const merged = Object.assign({}, ...(Array.isArray(cleaned[0]) ? cleaned[0] : cleaned));
const snapshotMerged = JSON.parse(JSON.stringify(merged));
console.debug('[getRecordFromForm] Merged:', JSON.stringify(snapshotMerged, null, 2));

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

function getGroupKey(container) {
  if (!container || !container.tagName) return null;
  // FIELDSET with legend
  if (container.tagName === 'FIELDSET') {
    const legend = container.querySelector('legend');
    if (legend) return legend.textContent.trim()
  }

  // First child LABEL with no input → pseudo-legend
  const firstLabelOnly = [...container.children].find(
    c => c.tagName === 'LABEL' && !getInputOrTextAreaInLabel(c)
  );
  if (firstLabelOnly) return firstLabelOnly.textContent.trim();

  // Any other container → check for first LABEL without input
  const firstLabel = Array.from(container.children)
    .find(el => el.tagName === 'LABEL' && !getInputOrTextAreaInLabel(el));
  if (firstLabel && firstLabel.textContent.trim()) return firstLabel.textContent.trim();

  return null;
}

function isControlledFieldset(fs) {
  // If its parent label has a checked input → this FS is already processed
  const parent = fs.previousElementSibling;

  if (parent && parent.tagName === 'LABEL') {
    const nested = parent.querySelector('input[type="checkbox"], input[type="radio"]');
    if (nested && nested.hasAttribute('checked')) return true;
  }
  return false;
}

function parseFieldset(fieldset) {
  const rawLegend = fieldset.querySelector('legend');
  let groupKey = rawLegend ? rawLegend.textContent.trim() : '';
  if (!groupKey) groupKey = getGroupKey(fieldset);
  const hasLegend = !!groupKey;

  const children = Array.from(fieldset.children)
  .filter(el => 
       el.nodeType === 1 &&
       el.tagName !== 'LEGEND' &&
       !isControlledFieldset(el)
  );
  console.debug('[getRecordFromForm] FIELDSET ', fieldset.id  ? fieldset.id : (hasLegend ? groupKey : '(no legend)'));

  // parse all children first
  const valueArray = children.flatMap(parseElement);
  // let valueArray = [];
  // for (const child of children) {
    // const parsed = parseElement(child);
    // console.debug(
      // '[parseFieldset] FLATTEN: child <%s> ',
      // child.tagName,
	// child.id,
      // JSON.stringify(parsed)
    // );
  
    // // Correct flatMap equivalence
    // if (Array.isArray(parsed)) {
      // valueArray.push(...parsed);
    // } else if (parsed !== undefined && parsed !== null) {
      // valueArray.push(parsed);
    // }
  // }
  // console.debug('[parseFieldset] FLATTEN RESULT:', JSON.stringify(valueArray));


  if (hasLegend) {
    //console.debug('[getRecordFromForm] FIELDSET parsed with legend:', groupKey, valueArray);
    return { [groupKey]: valueArray };
  } else {
    //console.debug('[getRecordFromForm] FIELDSET parsed without legend:', valueArray);
    return valueArray;
  }
}

function parseElement(el) {
  //console.debug('[getRecordFromForm] Element:', el.tagName);

  let valueArr = [];
  if (el.tagName === 'LABEL') {
    const nestedInput = getInputOrTextAreaInLabel(el);
    if (nestedInput) {
      console.debug('[getRecordFromForm] parseElement nested-input...');
	valueArr = parseInputOrControl(el, nestedInput);
    } else if (el.parentElement?.tagName === 'FIELDSET' && el === el.parentElement.firstElementChild) {
      ; // This <label> has no input and is the first element child inside its parent <fieldset>, therefore it has no legend. It acts as the legend.
    } else {
      // No nested input → check for input-after-label
      const nextEl = el.nextElementSibling;
      if (nextEl && (nextEl.tagName === 'INPUT' || nextEl.tagName === 'TEXTAREA')) {
        console.debug('[getRecordFromForm] parseElement input-after-label...');
        valueArr = parseInputOrControl(el, nextEl);
      }
    }
  } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    valueArr = parseInputOrControl(el, el);
  } else if (el.tagName === 'FIELDSET') { // FIELDSETs create groups (Rule 2)
    valueArr = parseFieldset(el);
  } else if (el.children.length) {
    console.debug('[getRecordFromForm] parseElement children:', el.children.length);
    valueArr = Array.from(el.children).flatMap(parseElement);
  }
  //if (valueArr.length > 0) console.debug('[getRecordFromForm] parseElement valueArr returned:', valueArr);
  return valueArr;
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
  clone.querySelector('input, textarea').remove?.();
  return clone.textContent.trim();
}

function parseInputOrControl(labelEl, inputEl) {
  const type = getInputType(inputEl);
  // checkbox / radio
  if (['checkbox', 'radio'].includes(type)) {
    const result = parseCheckedInputWithFieldset(labelEl, inputEl);
    console.debug('[getRecordFromForm] parseInputOrControl: checkbox/radio processed:', result);
    return result;
  }

  // text-like input / textarea — use getAttribute('value') only
  const key = getLabelText(labelEl);
  let value;
  if (inputEl.tagName === 'TEXTAREA') {
    value = inputEl.textContent.trim() || '';
  } else {
    value = (inputEl.getAttribute('value').trim() || '');
  }
  console.debug('[getRecordFromForm] parseInputOrControl: Text-like input processed:', { [key]: value });
  return value ? [{ [key]: value }] : [];
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
    console.debug('[getRecordFromForm] fieldsetControlledByCheckedInput :', labelText);
    return [{ [labelText]: parseFieldset(fieldsetControlledByCheckedInput) }];
  }
  console.debug('[getRecordFromForm] Checkbox not controlling a fieldset :', labelText);
  return [labelText];
}

