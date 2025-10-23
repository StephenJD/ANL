---
title: "Manage TnT Leaders - Chinley"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<fieldset>
  <legend>Leader Details</legend>
  <label>Name: <input required class="name" type="text" /></label>
  <label>Mobile No: <input class="" type="tel" /></label>
  <label>Email: <input class="" type="email" /></label>
</fieldset>

<fieldset>
  <legend>Role</legend>
  <label><input required type="radio"> Leader</label>
  <label><input required type="radio"> Helper</label>
</fieldset>

<fieldset>
  <legend>DBS</legend>
  <label>DBS Number: <input class="short-input" type="text" /></label>
  <label>DBS Date: <input class="" type="date" /></label>
</fieldset>

<fieldset>
  <legend>Safeguarding</legend>
  <label>Safeguarding Date: <input class="" type="date" /></label>
  <label>Safeguarding Level: <input class="short-input" type="text" /></label>
</fieldset>

<button type="button" class="sendButton" id="saveLeaderBtn">Add/Edit</button>
<button type="button" class="sendButton" id="cancelEditBtn" style="display:none;">Cancel</button>
<button type="button" class="sendButton" id="deleteLeaderBtn" style="display:none;">Delete</button>

<h2>Current Leaders</h2>
<ul id="leaderList"></ul>

<script type="module">
import { getFormRecord, populateForm, loadRecords } from '/js/binArrayInterface.js';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form.verified-form");
  const saveBtn = document.getElementById("saveLeaderBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteLeaderBtn");
  const list = document.getElementById("leaderList");
  let editIndex = null;
  let leadersCache = [];

  async function getLeaders() {
    const res = await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_Leaders_Chinley" }),
    });
    const data = await res.json();
    if (!data.valid) return [];
    return Array.isArray(data.record) ? data.record : [];
  }

  async function setLeaders(leaders) {
    await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_Leaders_Chinley", value: { record: leaders } }),
    });
  }

  async function loadLeaders() {
    leadersCache = await getLeaders();
    loadRecords({
      records: leadersCache,
      listEl: list,
      form,
      editBtnClass: "editLeaderBtn"
    });
  }

  list.addEventListener("click", e => {
    if (!e.target.classList.contains("editLeaderBtn")) return;
    const idx = parseInt(e.target.dataset.index);
    const leader = leadersCache[idx];
    if (!leader) return;
    editIndex = idx;
    populateForm(form, leader);
    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
  });

  saveBtn.addEventListener("click", async () => {
    if (!form.reportValidity()) return;
    const record = getFormRecord(form);

    if (editIndex !== null) leadersCache[editIndex] = record;
    else {
      const existingIndex = leadersCache.findIndex(l => l.name?.toLowerCase() === record.name?.toLowerCase());
      existingIndex >= 0 ? leadersCache[existingIndex] = record : leadersCache.push(record);
    }

    await setLeaders(leadersCache);
    populateForm(form, {}); // clear form
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
    await loadLeaders();
  });

  cancelBtn.addEventListener("click", () => {
    populateForm(form, {}); // clear form
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
  });

  deleteBtn.addEventListener("click", async () => {
    if (editIndex === null) return;
    leadersCache.splice(editIndex, 1);
    await setLeaders(leadersCache);
    populateForm(form, {}); // clear form
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
    await loadLeaders();
  });

  loadLeaders();
});
</script>
