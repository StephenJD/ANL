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

export function setInputsFromRecord(form, startElement, pathParts) {
  const allElements = [...form.querySelectorAll('input, label, legend')];
  let startIndex = 0;
  if (startElement) {
    startIndex = allElements.indexOf(startElement);
    if (startIndex < 0) startIndex = 0;
  }
  let lastKey = null;
  let lastRadioElement = null
  let lastText = null;

  const pathPartsArr = String(pathParts).split(',').map(s => s.trim()).filter(Boolean);
  let pathIndex = 0;
  let pathPart = urlize(pathPartsArr[pathIndex]);

  console.log("setInputsFromRecord at:",startIndex, pathParts);

  for (const el of allElements.slice(startIndex)) {
    //console.log("next el:", el, `pathIndex[${pathIndex}] el.name: ${el.name}`);

    const tag = el.tagName;
    if (tag !== 'INPUT') {
      const clone = el.cloneNode(true);
      clone.querySelectorAll('input, select, textarea').forEach(n => n.remove());
      // Skip elements that have no *own* text (i.e., only nested tags)
      const hasOwnText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!hasOwnText) continue;
      const text = urlize(clone.textContent);
      //console.log("Text/lastKey:", text, lastKey);
      if (text) {
        lastText = text;
        if (pathPart === text) {
          lastKey = text;
          ++pathIndex;
          pathPart = pathIndex < pathPartsArr.length ? urlize(pathPartsArr[pathIndex]) : null;
        }
      }
    } else if (lastKey) {
      if (lastRadioElement && el.name !== lastRadioElement.name) {
        //console.log("Quit");
        return lastRadioElement;
      }
      const type = el.type;

      if (['text', 'tel', 'email', 'date'].includes(type)) {
        el.value = pathPartsArr[pathIndex];
        //console.log(`text set '${pathPartsArr[pathIndex]}'`);
        return el;
      } else if (type === 'checkbox') {
        el.checked = (lastText === lastKey);
        //console.log(`checkbox ${lastText} ? ${lastKey}: ${(lastText === lastKey)}`);
        continue;
      } else if (type === 'radio') {
        el.checked = lastText === lastKey;
        //console.log(`radio ${lastText} ? ${lastKey}: ${(lastText === lastKey)}`);
        lastRadioElement = el;
        continue;
      }
      return el;
    }
  }
  //console.log(`[END] reached end of elements; returning null`);
  return null;
}






export function getRecordFromInputs(form) {
/*
1. Form traversed linearly over field-sets, labels and inputs, starting outside any fieldset.
2. Creates an array of records, where each record is an array of path-elements.
3. A path-element is any legend or label text found before an input.
4. When entering a nested fieldset, insert { into the record (after any legend if present), and capture the contents for recursive processing.
5. When the current fieldset processing is complete, insert } at the end of the last record generated for this fieldset.
6. Check-box label should be preceeded with ! if unchecked, "checked"/"unchecked" should not be inserted into the record.
7. Radios are ignored if unchecked and only the checked label added.
8. Every record ends at an input (value element). The value is the value of any text-like input, or the label of a check-box or selected radio.
9. If the next input is at the same level, start a new record.

Note:
When an input is found its index in the record array must be recorded (last_input_index and last_input_depth), as it may be the end of the record. But that cannot be confirmed until the next input is found. If it is deeper nested then reset last_input_index and last_input_depth to the new input. If the next input is at the same level as the indexed one then split the record at that index and push it to the record-set. The remainder is the start of the current record.
*/

  const recordSet = [];
  const pathStack = [];

  let last_input_index = -1;
  let last_input_depth = -1;

  function processElement(el, depth = 0, currentRecord = [...pathStack]) {
    const children = [...el.children];  // Keep all children to include top-level elements
    //console.debug(`Entering element <${el.tagName}> at depth ${depth}, currentRecord:`, currentRecord);

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const tag = node.tagName;

      // --- INPUT / LABEL processing ---
      if (tag === 'LABEL' || tag === 'INPUT') {
        let labelText = '';
        let input = null;

        if (tag === 'LABEL') {
          const clone = node.cloneNode(true);
          clone.querySelectorAll('input').forEach(n => n.remove());
          labelText = urlize(clone.textContent);
          input = node.querySelector('input');
          if (!input) continue;
        } else {
          input = node;
        }

        if (labelText) currentRecord.push(labelText);
        //console.debug(`Found input of type ${input?.type || 'unknown'} at depth ${depth}, currentRecord before split:`, currentRecord);

        if (input) {
          if (last_input_index >= 0 && depth === last_input_depth) {
            const completeRecord = currentRecord.slice(0, last_input_index + 1);
            const remainder = currentRecord.slice(last_input_index + 1);
            recordSet.push(completeRecord);
            //console.debug('Same-level split occurred. CompleteRecord pushed:', completeRecord, 'Remainder:', remainder);
            currentRecord = remainder;
          }

          const type = input.type;
          if (['text','tel','email','date'].includes(type)) {
            currentRecord.push(input.value);
            //console.debug('Text input added:', currentRecord);
            last_input_index = currentRecord.length - 1;
            last_input_depth = depth;
          } else if (type === 'checkbox') {
            if (!input.checked && currentRecord.length) {
			currentRecord.pop();
              //currentRecord[currentRecord.length - 1] = '!' + currentRecord[currentRecord.length - 1];
            }
            //console.debug('Checkbox processed:', currentRecord);
            last_input_index = currentRecord.length - 1;
            last_input_depth = depth;
          } else if (type === 'radio') {
            if (!input.checked) {
              currentRecord.pop();
              //console.debug('Radio unchecked, popped:', currentRecord);
            } else {
              //console.debug('Radio checked:', currentRecord);
              last_input_index = currentRecord.length - 1;
              last_input_depth = depth;
            }
          }
        }
        continue;
      }

      // --- FIELDSET processing ---
      if (tag === 'FIELDSET') {
        const legend = node.querySelector(':scope > legend');
        const legendText = legend ? urlize(legend.textContent) : '';
        if (legendText) currentRecord.push(legendText);
        currentRecord.push('{');  // always insert { for nested fieldsets

        const startRecordIndex = recordSet.length;

        const saved_index = last_input_index;
        const saved_depth = last_input_depth;
        last_input_index = -1;
        last_input_depth = -1;

        //console.debug(`Entering FIELDSET at depth ${depth} with legend '${legendText}', startRecordIndex: ${startRecordIndex}`);
        currentRecord = processElement(node, depth + 1, currentRecord);
        //console.debug(`Exiting FIELDSET at depth ${depth} with legend '${legendText}', currentRecord:`, currentRecord);

        last_input_index = saved_index;
        last_input_depth = saved_depth;

        if (recordSet.length > startRecordIndex) {
          recordSet[recordSet.length - 1].push('}');
        } else if (currentRecord.length) {
          currentRecord.push('}');
        }
        continue;
      }

      if (node.children.length > 0) currentRecord = processElement(node, depth, currentRecord);
    }

    if (currentRecord.length) {
      recordSet.push(currentRecord);
      //console.debug('End of container, pushed remaining record:', currentRecord);
      last_input_index = -1;
      last_input_depth = -1;
    }

    return [];
  }

  processElement(form, 0, [...pathStack]);
  //console.debug('Final recordSet:', recordSet);
  return { startElement: null, pathArr: recordSet };
}


























// --- input type extractors ---
function extractCheckboxWithNestedRadios(checkboxNode, storedValue, includeUnselected = false) {
  const checkbox = checkboxNode.querySelector("input[type=checkbox]");
  if (!checkbox) return null;

  const labelText = getLabelText(checkbox);

  if (storedValue && storedValue[labelText] !== undefined) {
    checkbox.checked = true;
  }

  const radios = [];
  let next = checkboxNode.nextElementSibling;
  const seenRadios = new Set(); // <-- track duplicates

  while (next) {
    const nextInput = next.querySelector("input[type=radio]");
    if (!nextInput) { next = next.nextElementSibling; continue; }

    const radioLabel = next.textContent.trim();
    if (!seenRadios.has(radioLabel)) { // <-- only add once
      radios.push({ label: radioLabel, checked: nextInput.checked });
      seenRadios.add(radioLabel);
    }

    if (storedValue && storedValue[labelText] !== undefined) {
      nextInput.checked = radioLabel === storedValue[labelText];
    }

    if (nextInput.querySelector("input[type=checkbox]")) break; // next checkbox ends group
    next = next.nextElementSibling;
  }

  return {
    label: labelText,
    value: checkbox.checked ? storedValue[labelText] || checkbox.value : checkbox.value,
    checked: checkbox.checked,
    radios
  };
}




function extractStandaloneRadio(radioNode, includeUnselected = false) {
  const radio = radioNode.querySelector("input[type=radio]");
  if (!radio) return null;

  const labelText = getLabelText(radio);

  if (radio.checked) return { label: labelText, value: radio.value, checked: true };
  if (includeUnselected) return { label: labelText, value: "", checked: false };
  return null;
}

function extractOtherInput(inputNode, includeUnselected = false) {
  const input = inputNode.querySelector("input:not([type=checkbox]):not([type=radio]), textarea, select");
  if (!input) return null;

  const labelText = getLabelText(input);
  return { label: labelText, value: input.value || "", checked: input.checked };
}

// --- fieldset extractor ---
export function extractFieldset(fieldsetNode, includeUnselected = false) {
  const legend = fieldsetNode.querySelector("legend")?.textContent.trim() || null;
  const fields = [];

  Array.from(fieldsetNode.children).forEach(child => {
    let field = null;

    if (child.querySelector("input[type=checkbox]")) {
      field = extractCheckboxWithNestedRadios(child, includeUnselected);
    } else if (child.querySelector("input[type=radio]")) {
      field = extractStandaloneRadio(child, includeUnselected);
    } else if (child.querySelector("input, textarea, select")) {
      field = extractOtherInput(child, includeUnselected);
    }

    if (field) fields.push(field);
  });

  if (fields.length === 0) return null;
  return { legend, fields };
}

// --- main parser ---
export function parseFormElements(form, { includeUnselected = false } = {}) {
  const elements = [];
  const walker = document.createTreeWalker(form, NodeFilter.SHOW_ELEMENT, null);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (node.tagName === "FIELDSET") {
      const fs = extractFieldset(node, includeUnselected);
      if (fs) elements.push(fs);
    } else if (node.tagName === "LABEL") {
      if (!node.closest("fieldset")) {   // <-- only labels not inside a fieldset
        const lbl = extractOtherInput(node, includeUnselected);
        if (lbl) elements.push(lbl);
      }
    }
  }

  return elements;
}

