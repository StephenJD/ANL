// /static/js/loadFormFromRecord.js.js

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
function urlize(str) {
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

  //console.log("setInputsFromRecord pathPartsArr:", pathPartsArr);
  
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


