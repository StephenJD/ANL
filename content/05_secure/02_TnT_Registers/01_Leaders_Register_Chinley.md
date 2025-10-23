---
title: "TnT Leader Weekly Register - Chinley"
last_reviewed: 2025-10-18
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: limited # [full, limited]
---

<h2>Weekly Leader Register</h2>

<label>Date: <input required type="date" class="short-input" /></label>

<div id="leaderCheckList"></div>

<button type="button" class="sendButton" id="submitWeekBtn">Submit</button>

<h2>Previous Weekly Records</h2>
<ul id="weeklyRecordsList"></ul>

<script>
document.addEventListener("DOMContentLoaded", async () => {
  const submitBtn = document.getElementById("submitWeekBtn");
  const checkListContainer = document.getElementById("leaderCheckList");
  const weeklyList = document.getElementById("weeklyRecordsList");

  // === Fetch leaders ===
  async function getLeaders() {
    const res = await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_Leaders_Chinley" }),
    });
    const data = await res.json();
    return data.valid && Array.isArray(data.record) ? data.record : [];
  }

  // === Fetch weekly records ===
  async function getWeeklyRecords() {
    const res = await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_WeeklyRegister_Chinley" }),
    });
    const data = await res.json();
    return data.valid && data.record ? data.record : {};
  }

  // === Store weekly records ===
  async function setWeeklyRecords(records) {
    await fetch("/.netlify/functions/secureStore_ClientAccess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "TnT_WeeklyRegister_Chinley", value: { record: records } }),
    });
  }

  // === Populate leader check-list dynamically ===
  async function renderCheckList() {
    const leaders = await getLeaders();
    checkListContainer.innerHTML = "";

    leaders.forEach(leader => {
      const labelText = leader.name || "Unnamed Leader";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      const label = document.createElement("label");
      label.style.display = "block";
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + labelText));

      checkListContainer.appendChild(label);
    });
  }

  // === Render weekly records list ===
  async function renderWeeklyRecords() {
    const data = await getWeeklyRecords();
    const records = Object.entries(data.record || {}).sort((a,b) => new Date(b[0]) - new Date(a[0]));
    weeklyList.innerHTML = "";

    records.forEach(([date, leaders]) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${date}</strong>: ${leaders.map(l => l.name || "Unnamed Leader").join(", ")}`;
      weeklyList.appendChild(li);
    });
  }

  // === Submit selected leaders ===
  submitBtn.addEventListener("click", async () => {
    const dateInput = document.querySelector('input[type="date"]');
    const date = dateInput.value;
    if (!date) return alert("Please select a date.");

    const selectedLeaders = Array.from(checkListContainer.querySelectorAll("input[type='checkbox']:checked"))
      .map(cb => cb.nextSibling.textContent.trim());

    if (!selectedLeaders.length) return alert("Please select at least one leader.");

    const allLeaders = await getLeaders();
    const leaderObjects = allLeaders.filter(l => selectedLeaders.includes(l.name));

    const weeklyRecords = await getWeeklyRecords();
    weeklyRecords.record = weeklyRecords.record || {};
    weeklyRecords.record[date] = leaderObjects;

    await setWeeklyRecords(weeklyRecords);

    // Reset form
    dateInput.value = "";
    checkListContainer.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);

    await renderWeeklyRecords();
  });

  // Initial render
  await renderCheckList();
  await renderWeeklyRecords();
});
</script>
