---
title: "Manage TnT Leaders - Chinley"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<h2>Add / Edit Leader</h2>
<label>Name: <input class="name" type="text" id="leaderName" required /></label>
<label>Mobile No: <input type="tel" id="leaderMobile" /></label>
<label>Email: <input type="email" id="leaderEmail" /></label>

<fieldset id="leaderRoleFieldset">
  <legend>Role</legend>
  <label><input type="radio" name="leaderRole" value="Leader" required> Leader</label>
  <label><input type="radio" name="leaderRole" value="Helper" required> Helper</label>
</fieldset>

<label>DBS Number: <input type="text" class="short-input" id="dbsNumber" /></label>
<label>DBS Date: <input type="date" id="dbsDate" /></label>
<label>Safeguarding Date: <input type="date" id="safeguardingDate" /></label>
<label>Safeguarding Level: <input type="text" class="short-input" id="safeguardingLevel" /></label>
<button type="button" class="sendButton" id="saveLeaderBtn">Add/Edit</button>
<button type="button" class="sendButton" id="cancelEditBtn" style="display:none;">Cancel</button>
<button type="button" class="sendButton" id="deleteLeaderBtn" style="display:none;">Delete</button>

<h2>Current Leaders</h2>
<ul id="leaderList"></ul>

<script>
document.addEventListener("DOMContentLoaded", () => {
  let isEditing = false;
  let editIndex = null;

  const leaderForm = document.querySelector("form.verified-form");
  const saveBtn = document.getElementById("saveLeaderBtn");
  const list = document.getElementById("leaderList");
  const cancelBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteLeaderBtn");

  if (!leaderForm || !saveBtn || !list) return;

  // === Fetch leaders from secure store ===
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

  // === Save leaders to secure store ===
  async function setLeaders(leaders) {
    const valueToStore = { record: leaders };
    const res = await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_Leaders_Chinley", value: valueToStore }),
    });
    return await res.json();
  }

  // === Render leader list ===
  async function loadLeaders() {
    const leaders = await getLeaders();
    list.innerHTML = "";
    leaders.forEach((leader, idx) => {
      const li = document.createElement("li");
      li.style.listStyle = "none";
      li.innerHTML = `
        <button type="button" class="editLeaderBtn editButton" data-index="${idx}">Edit</button>
        <strong>${leader.name}</strong> — Mobile: ${leader.mobile || "N/A"},
        Email: ${leader.email || "N/A"},
        Role: ${leader.role || "N/A"},
        DBS: ${leader.dbs?.number || "N/A"} (${leader.dbs?.date || "N/A"}),
        Safeguarding: ${leader.safeguarding?.date || "N/A"} Level: ${leader.safeguarding?.level || ""}
      `;
      list.appendChild(li);
    });
  }

  // === Save/Edit handler ===
  saveBtn.addEventListener("click", async () => {
    if (!leaderForm.reportValidity()) return;

    const name = document.getElementById("leaderName")?.value.trim();
    const mobile = document.getElementById("leaderMobile")?.value.trim();
    const email = document.getElementById("leaderEmail")?.value.trim();
    const dbsNumber = document.getElementById("dbsNumber")?.value.trim();
    const dbsDate = document.getElementById("dbsDate")?.value;
    const safeguardingDate = document.getElementById("safeguardingDate")?.value;
    const safeguardingLevel = document.getElementById("safeguardingLevel")?.value.trim();
    const role = document.getElementById("leaderRoleFieldset")?.querySelector('input[type="radio"]:checked')?.value || "";

    const newLeader = { 
      name, mobile, email, role,
      dbs: { number: dbsNumber, date: dbsDate },
      safeguarding: { date: safeguardingDate, level: safeguardingLevel }
    };

    const leaders = await getLeaders();
    if (isEditing && editIndex !== null) leaders[editIndex] = newLeader;
    else {
      const existingIndex = leaders.findIndex(l => l.name.toLowerCase() === name.toLowerCase());
      existingIndex >= 0 ? leaders[existingIndex] = newLeader : leaders.push(newLeader);
    }

    await setLeaders(leaders);
    leaderForm.reset();
    isEditing = false;
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
    await loadLeaders();
  });

  // === Edit buttons ===
  list.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("editLeaderBtn")) return;
    const idx = parseInt(e.target.dataset.index);
    const leaders = await getLeaders();
    const leader = leaders[idx];
    if (!leader) return;

    editIndex = idx;
    isEditing = true;

    document.getElementById("leaderName").value = leader.name || "";
    document.getElementById("leaderMobile").value = leader.mobile || "";
    document.getElementById("leaderEmail").value = leader.email || "";
    document.getElementById("dbsNumber").value = leader.dbs?.number || "";
    document.getElementById("dbsDate").value = leader.dbs?.date || "";
    document.getElementById("safeguardingDate").value = leader.safeguarding?.date || "";
    document.getElementById("safeguardingLevel").value = leader.safeguarding?.level || "";

    const radio = document.getElementById("leaderRoleFieldset")?.querySelector(`input[type="radio"][value="${leader.role}"]`);
    if (radio) radio.checked = true;

    cancelBtn.style.display = "inline-block";
    deleteBtn.style.display = "inline-block";
  });

  // === Cancel handler ===
  cancelBtn.addEventListener("click", () => {
    leaderForm.reset();
    isEditing = false;
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
  });

  // === Delete handler ===
  deleteBtn.addEventListener("click", async () => {
    if (editIndex === null) return;
    const leaders = await getLeaders();
    leaders.splice(editIndex, 1);
    await setLeaders(leaders);
    leaderForm.reset();
    isEditing = false;
    editIndex = null;
    cancelBtn.style.display = "none";
    deleteBtn.style.display = "none";
    await loadLeaders();
  });

  // Initial load
  loadLeaders();
});
</script>
