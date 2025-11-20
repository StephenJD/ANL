// /static/js/binArrayInterface.js 
import { setInputsFromRecord } from "/js/loadFormFromRecord.js";

export function populateForm(form, record) {
  setInputsFromRecord(form, record);
  disableRadiosUntilChecked();
}

function listRecord(record) {
  const result = [];

  function recurse(value, parentKey = null) {
    if (Array.isArray(value)) {
      value.forEach(v => recurse(v, parentKey));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        recurse(v, k);
      }
    } else {
      if (parentKey) {
        result.push(`${parentKey}: ${value}`);
      } else {
        result.push(String(value));
      }
    }
  }

  recurse(record);
  return result;
}

export function loadRecords({ records, listEl, form, editBtnClass }) {
  listEl.innerHTML = "";
  console.log("[binArrayInterface] loadRecords:", records);

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
        const flat = listRecord(v);
        li.appendChild(document.createTextNode(`${k}: ${flat.join(", ")}`));
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
  console.log("[binArrayInterface] manageBinArrayForm", bin_id,  sectionKey);

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
  h2.textContent = listLabel;
  const ul = document.createElement("ul");
  container.append(h2, ul);

  alignButtons(form);

  let editKeyValue = null;
  let recordsCache = [];

async function apiCall(action, payload = {}, keyValue = null) {
  const body = { action, bin_id, section_key: sectionKey, ...payload };
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
    if (!data.success) {
      console.error("[binArrayInterface] loadRecordsList error:", data.error);
      return;
    }
    console.log('[binArrayInterface] loadRecordsList:', JSON.parse(JSON.stringify(data.records)));
    recordsCache = data.records || [];
    loadRecords({ records: recordsCache, listEl: ul, form, editBtnClass: "editBtn" });
  }

function clearForm() {
  // Select all visible input and textarea elements
  const allControls = [...form.querySelectorAll('input, textarea')]
    .filter(el => el.type !== 'hidden');

  allControls.forEach(el => {
    if (el.tagName === 'TEXTAREA' || ['text', 'tel', 'email', 'date'].includes(el.type)) {
      el.value = '';
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    }
  });

  console.log('[binArrayInterface] all inputs cleared');

  editKeyValue = null;
  cancelBtn.style.display = "none";
  deleteBtn.style.display = "none";
  saveBtn.textContent = "Add";  
  alignButtons(form);
  autofillToday();
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
    saveBtn.textContent = "Save"; 
    alignButtons(form);
  });

saveBtn.addEventListener("click", async () => {
  if (!form.reportValidity()) return;

  // Clone the form to avoid modifying the displayed form
  const clonedForm = form.cloneNode(true);
  clonedForm.querySelectorAll("input, textarea, select").forEach(input => { 

    if (input.type === "checkbox" || input.type === "radio") {
      if (input.checked) input.setAttribute("checked", ""); else input.removeAttribute("checked");
    } else if (input.tagName.toLowerCase() === "textarea") {
      input.textContent = input.value;
    } else {
      input.setAttribute("value", input.value);
    }
  });
  
  //console.debug('[binArrayInterface] Save clonedForm:', clonedForm.outerHTML);
  clonedForm.querySelectorAll('[style*="display:none"], [style*="display: none"]').forEach(el => el.remove());

  // Remove all <script> tags
  clonedForm.querySelectorAll('script').forEach(s => s.remove());
  const formHtml = clonedForm.outerHTML
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "\'");


  const firstVisibleInput = Array.from(form.querySelectorAll("input, textarea, select"))
  .find(el => el.type !== "hidden" && el.offsetParent !== null);

  const keyValue = editKeyValue || firstVisibleInput?.getAttribute("value") || "";
  const action = editKeyValue ? "edit" : "add"; // set by edit-button, not from input.
  //console.debug('[binArrayInterface] Save formHtml:', formHtml);
  console.debug('[binArrayInterface] Save recordSet:', "keyValue", keyValue, "Action:", action);
  // Send to backend
  const data = await apiCall(action, { formHtml }, keyValue);

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
  saveBtn.textContent = "Add";  
  await loadRecordsList();
  alignButtons(form);
}
