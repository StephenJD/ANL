// /static/js/binArrayInterface.js 
import { getRecordFromInputs, urlize, setInputsFromRecord } from "/js/form_parser.js";

export function getFormRecord(form) {
  console.log("getFormRecord record...");
  let startElement = true;
  let pathArr = null;
 ({ startElement, pathArr } = getRecordFromInputs(form));
  console.log("getFormRecord getRecordFromInputs got:", pathArr);
  
  let record = buildJson(pathArr);
  console.log("getFormRecord buildJson got:", JSON.stringify(record, null, 2));
 
  return record;
}

// Returns the next element in arr (nested arrays) with a reference to its parent array
function nextElement(state) {
    let { arr, indices } = state;
    if (!indices) state.indices = indices = [];

    // Step 0: reference to current array level
    let ref = arr;
    for (let i = 0; i < indices.length - 1; i++) {
        ref = ref[indices[i]];
    }

    // Step 1: current index
    let idx = indices.length > 0 ? indices[indices.length - 1] : -1;

    // Step 2: increment index to get next element
    idx++;
    if (indices.length > 0) indices[indices.length - 1] = idx;
    else indices.push(idx);

    // Step 3: end of array
    if (idx >= ref.length) {
        if (indices.length === 0) return { element: undefined, indices };
        indices.pop();
        if (indices.length === 0) return { element: undefined, indices };
        return nextElement(state); // backtrack
    }

    // Step 4: descend into nested array
    if (Array.isArray(ref[idx])) {
        indices.push(-1); // will increment to 0 on next call
        return nextElement(state);
    }

    // Step 5: return element, copy of indices, and parent container
    return {
        element: ref[idx],
        indices: [...indices],
        container: ref,
        indexInContainer: idx
    };
}

function findNextOpenBrace(state) {
    while (true) {
        let result = nextElement(state);
        let el = result.element;
        if (el === undefined) break;
        if (el === '{') return result;
    }
    return { element: undefined };
}

function deleteMatchingBrace(arr, braceIndices) {
    if (!braceIndices || braceIndices.length === 0) return;

    let state = { arr, indices: [...braceIndices] };
    let braceCount = 1;

    while (true) {
        let result = nextElement(state);
        if (!result.element) break;

        if (result.element === '{') braceCount++;
        else if (result.element === '}') braceCount--;

        if (braceCount === 0) {
            console.log('deleteMatchingBrace: removing matching } at', result.indices);
            result.container.splice(result.indexInContainer, 1);
            return;
        }
    }
}

function moveOpenBraceToNextElement(state, openBrace) {
    let originalPos = [...state.indices];  // copy indices
    let next = nextElement(state);
    if (!next.element) return;
    next.container[next.indexInContainer] = '{' + next.element;
    openBrace.container.splice(openBrace.indexInContainer, 1);
    state.indices = originalPos;
}

function escapeStrings(state) {
    while (true) {
        let result = nextElement(state);
        let el = result.element;
        if (el === undefined) break;
        if (el !== '{' && el !== '}')
            result.container[result.indexInContainer] = JSON.stringify(el);
    }
}

function buildJson(arr) {
    /*
    1. Walk the braces in matching pairs {...} from both ends of the entire array.
    2. Wherever there is a double adjacent open-brace i.e. [{],[{], remove the first along with its matching } at the other end of the array. Repeat until no more {{.
    3. Concatenate open braces { with the next element, but keep it outside the quotes string.
    4. Concatenate closing braces } with the previous element, but keep it outside quotes string. Repeat until no free }.
    5. Join sub-arrays using :.
    6. Join remaining arrays on commas.
    7. Remove sub-array { , } with nothing between.
    Note: Keep quotes around all tokens; Preserve empty string "" elements.
    */

    console.log('Initial array:', JSON.parse(JSON.stringify(arr)));

// Step 2: remove {} pairs where the { is preceeded by { or }
let state = { arr, indices: [] };

let currElement = nextElement(state);
while (true) {
    let curr_el = currElement.element;
    if (curr_el === undefined) break;
    let nextEl = nextElement(state);
    if (!nextEl.element) break;
    
    if (nextEl.element === '{' && (curr_el == '{' || curr_el == '}')) {
      // remove open brace
      nextEl.container.splice(nextEl.indexInContainer, 1);
      deleteMatchingBrace(arr, nextEl.indices);
      //console.log('After removing {{ pair:', JSON.stringify(arr));
	state.indices = [...currElement.indices];
      //console.log('After moving } to previous element:', [...state.indices], "currElement", currElement.element, currElement.indices);
    } else currElement = nextEl;
}
    console.log('After removing }{} pairs:', JSON.parse(JSON.stringify(arr)));

// remove {} pairs where there is only one element between
state = { arr, indices: [] };

while (true) {
    let currElement = findNextOpenBrace(state);
    let curr_el = currElement.element;
    if (curr_el === undefined) break;
    let middleEl = nextElement(state);
    if (middleEl === undefined) break;
    let closingEl = nextElement(state);
    if (closingEl === undefined) break;
    //console.log(`${currElement.element} at:`, currElement.indices, "middleEl", middleEl.element, "closingEl", closingEl.element, closingEl.indices);
    
    if (closingEl.element === '}') {
        closingEl.container.splice(closingEl.indexInContainer, 1);
        if (middleEl.element === '') middleEl.container.splice(middleEl.indexInContainer, 1);
        currElement.container.splice(currElement.indexInContainer, 1);
        console.log('After removing {""} pair:', JSON.stringify(arr));
    } else state.indices = [...currElement.indices];
}
console.log('After removing {val} pairs:', JSON.parse(JSON.stringify(arr)));


state = { arr, indices: [] };
escapeStrings(state);

// Step 3: move all remaining open braces {
state.indices = [];
while (true) {
    let openBrace  = findNextOpenBrace(state);
    if (!openBrace.element) break;
    moveOpenBraceToNextElement(state, openBrace);
    //console.log('After moving { to next element:', state.indices, JSON.parse(JSON.stringify(arr)));
}
console.log('After moving { to next element:', [...state.indices], JSON.parse(JSON.stringify(arr)));

// Step 4: move closing braces } to previous element
state.indices = [];
//console.log('Step 4: move closing braces } to previous element');
currElement = nextElement(state);

while (true) {
    let el = currElement.element;
    if (el === undefined) break;
    //console.log(`start  Curr-el ${el} at`, currElement.indices, 'state.indices:', [...state.indices]);

    let nextEl = nextElement(state);
    //if (!nextEl.element) break;
    //console.log(`after next: cur  el ${el} at`, currElement.indices, `nextEl ${nextEl.element} at`, nextEl.indices, 'state.indices:', [...state.indices]);

    if (nextEl.element === '}') {
        console.log('} found at', nextEl.indices);
        // append } to previous element
        currElement.container[currElement.indexInContainer] += '}';
        // remove the standalone }
        //console.log('Removing standalone } at index', nextEl.indexInContainer, 'value:', nextEl.container[nextEl.indexInContainer]);
        nextEl.container.splice(nextEl.indexInContainer, 1);
	  state.indices = [...currElement.indices];
        //console.log('After moving } to previous element:', [...state.indices], "currElement", currElement.element, currElement.indices);
    } else currElement = nextEl;

}
console.log('After moving } to previous element:', JSON.parse(JSON.stringify(arr)));

    // Step 5: join each sub-array using ":"
    arr = arr.map(subArr => subArr.join(':'));
    console.log('After Step 5 (joined sub-arrays):', JSON.parse(JSON.stringify(arr)));

    // Step 6: join remaining arrays with commas
    arr = arr.filter(subArr => subArr.length > 0).join(',');
    console.log('After Step 6 (joined all arrays):', arr);
    arr = `{${arr}}`;
    let obj = JSON.parse(arr);
    console.log('After Step 7 (JSON):', obj);
    return obj;
}

export function populateForm(form, record) {
  let startElement = null;

  // Convert record to string, strip braces
  const str = JSON.stringify(record).replace(/[{}]/g, '');

  // Split on commas → each element is one call
  const elements = str.split(',').map(s => s.trim()).filter(Boolean);

  for (const el of elements) {
    const pathParts = el.split(':').map(s => s.trim().replace(/^"|"$/g, ''));
    startElement = setInputsFromRecord(form, startElement, pathParts);
  }
  if (elements.length > 1) {
    console.log(`populateForm done. Call getFormRecord`);
    getFormRecord(form);
  }
}



export function loadRecords({ records, listEl, form, editBtnClass }) {
  listEl.innerHTML = "";
  records.forEach((record, idx) => {
    const li = document.createElement("li");
    li.style.listStyle = "none";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `${editBtnClass} editButton`;
    btn.dataset.index = String(idx);
    btn.textContent = "Edit";
    li.appendChild(btn);

    Object.entries(record)
      .filter(([k, v]) => v !== undefined && v !== null && v !== "" && !k.toLowerCase().includes("token"))
      .forEach(([k, v], i) => {
        li.appendChild(document.createTextNode(i === 0 ? " " : ", "));

        let text;
        if (Array.isArray(v)) {
          text = `${k}: ${v.join(", ")}`;
        } else if (typeof v === "object" && v !== null) {
          text = `${k}: ${Object.entries(v).map(([subK, subV]) => `${subK}: ${subV}`).join(", ")}`;
        } else {
          text = `${k}: ${v}`;
        }

        li.appendChild(document.createTextNode(text));
      });

    listEl.appendChild(li);
  });
}


function alignButtons(form) {
  const buttons = Array.from(form.querySelectorAll(":scope > button"));
  let i = 0;
  while (i < buttons.length) {
    const row = [buttons[i]];
    let next = buttons[i].nextElementSibling;
    while (next && next.tagName === "BUTTON") {
      row.push(next);
      i++;
      next = next.nextElementSibling;
    }
    if (row.length > 1) {
      row.forEach(btn => btn.classList.add("inline-fit"));
    }
    i++;
  }
}

export async function manageBinArrayForm({ bin_id, sectionKey, listLabel, form }) {
  if (!form) throw new Error("Form is required");
  listLabel = listLabel || sectionKey;
  console.log("[DEBUG] manageBinArrayForm", bin_id,  sectionKey);

  const container = form;

  const buttons = ["Add/Edit", "Cancel", "Delete"].map(text => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sendButton";
    btn.textContent = text;
    if (text !== "Add/Edit") btn.style.display = "none";
    container.appendChild(btn);
    return btn;
  });
  const [saveBtn, cancelBtn, deleteBtn] = buttons;

  const h2 = document.createElement("h2");
  h2.textContent = `Existing ${listLabel}`;
  const ul = document.createElement("ul");
  container.append(h2, ul);

  alignButtons(form);

  let editKeyValue = null;
  let recordsCache = [];

  async function apiCall(action, record = null, keyValue = null) {
    const body = {action, bin_id: bin_id, section_key: sectionKey };
    if (record) body.record = record;
    if (keyValue) body.keyValue = keyValue;
    const res = await fetch("/.netlify/functions/manageBinArrays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  async function loadRecordsList() {
    const data = await apiCall("list");
    if (!data.success) return;
    recordsCache = data.records || [];
    loadRecords({ records: recordsCache, listEl: ul, form, editBtnClass: "editBtn" });
  }

  function clearForm() {
    const allElements = [...form.querySelectorAll('input, label, legend')];
    for (const el of allElements) {
      if (el.tagName !== 'INPUT') continue;
      const type = el.type;
      if (['text', 'tel', 'email', 'date'].includes(type)) {
        el.value = '';
      } else if (type === 'checkbox' || type === 'radio') {
        el.checked = false;
      }
    }
    console.log('setInputsFromRecord: record empty → all inputs cleared');

    editKeyValue = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
    alignButtons(form);
  }

  ul.addEventListener("click", e => {
    if (!e.target.classList.contains("editBtn")) return;
    const idx = parseInt(e.target.dataset.index);
    const record = recordsCache[idx];
    if (!record) return;
    clearForm();
    editKeyValue = Object.values(record)[0];
    populateForm(form, record);
    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
    alignButtons(form);
  });

  saveBtn.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const record = getFormRecord(form);
//console.log("[DEBUG] record being sent:", record);  // <--- Add this
    const keyValue = editKeyValue || Object.values(record)[0];
    const action = editKeyValue ? "edit" : "add";
    const data = await apiCall(action, record, keyValue);
    if (data.success) {
      clearForm();
      await loadRecordsList();
    }
  });

  cancelBtn.addEventListener("click", clearForm);

  deleteBtn.addEventListener("click", async () => {
    if (!editKeyValue) return;
    const data = await apiCall("delete", null, editKeyValue);
    if (data.success) {
      clearForm();
      await loadRecordsList();
    }
  });

  await loadRecordsList();
  alignButtons(form);
}
