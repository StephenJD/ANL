// /static/js/binArrayInterface.js 

export function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

function getLabelKey(label) {
  const input = label.querySelector("input, select, textarea");
  if (!input) return "unnamed";
  const clonedLabel = label.cloneNode(true);
  clonedLabel.querySelector("input, select, textarea")?.remove();
  return urlize(clonedLabel.textContent.trim());
}

export function getFormRecord(form) {
  const record = {};
  form.querySelectorAll("fieldset").forEach(fs => {
    const key = urlize(fs.querySelector("legend")?.textContent || "fieldset");

    const radios = fs.querySelectorAll("input[type=radio]");
    if (radios.length) {
      const checked = Array.from(radios).find(r => r.checked);
      if (checked) record[key] = checked.parentElement.textContent.trim();
      return;
    }

    const checkboxes = fs.querySelectorAll("input[type=checkbox]");
    if (checkboxes.length) {
      const checkedLabels = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim());
      if (checkedLabels.length) record[key] = checkedLabels;
      return;
    }

    fs.querySelectorAll("label").forEach(label => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;
      record[getLabelKey(label)] = input.value.trim();
    });
  });
  return record;
}

export function populateForm(form, record) {
  form.querySelectorAll("fieldset").forEach(fs => {
    const key = urlize(fs.querySelector("legend")?.textContent || "fieldset");

    const radios = fs.querySelectorAll("input[type=radio]");
    if (radios.length) {
      const storedValue = record[key];
      radios.forEach(r => r.checked = r.parentElement.textContent.trim() === storedValue);
      return;
    }

    const checkboxes = fs.querySelectorAll("input[type=checkbox]");
    if (checkboxes.length) {
      const storedValues = record[key] || [];
      checkboxes.forEach(cb => {
        const labelText = cb.parentElement.textContent.trim();
        cb.checked = storedValues.includes(labelText);
      });
      return;
    }

    fs.querySelectorAll("label").forEach(label => {
      const input = label.querySelector("input, select, textarea");
      if (!input) return;
      const key = getLabelKey(label);
      input.value = record[key] ?? "";
    });
  });
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
        li.appendChild(document.createTextNode(Array.isArray(v) ? `${k}: ${v.join(", ")}` : `${k}: ${v}`));
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

export async function manageBinArrayForm({ binKey, sectionKey, listLabel, form }) {
  if (!form) throw new Error("Form is required");
  listLabel = listLabel || sectionKey;

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
    const body = { action, section_key: sectionKey, bin_key: binKey };
    if (record) body.record = record;
    if (keyValue) body.keyValue = keyValue;
    const res = await fetch("/.netlify/functions/manageBinArrays", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": window.ADMIN_SESSION_KEY },
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
    populateForm(form, {});
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
    editKeyValue = Object.values(record)[0];
    populateForm(form, record);
    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
    alignButtons(form);
  });

  saveBtn.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const record = getFormRecord(form);
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
