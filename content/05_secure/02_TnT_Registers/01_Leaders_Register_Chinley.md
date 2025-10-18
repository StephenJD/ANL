---
title: "TnT Leader Register - Chinley"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<h2>New Session</h2>
<form id="sessionForm">
  <label>Date:</label>
  <input required type="date" class="autofill-today"/>

  <fieldset id="leaderChecklist">
    <legend>Leaders Present:</legend>
    <!-- Checkboxes populated by JS -->
  </fieldset>

  <button type="submit">Add Session</button>
</form>

<h2>Past Sessions</h2>
<ul id="sessionList">
  <!-- Sessions populated by JS -->
</ul>

<script>
const LEADERS_TOKEN = "TnT_Leaders_Chinley";
const SESSIONS_TOKEN = "TnT_Sessions_Chinley";
const STORE_ENDPOINT = "/.netlify/functions/secureStore_ClientAccess";

// Utility to fetch a token value
async function getToken(token) {
  const res = await fetch(STORE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  return data.success ? data.record : null;
}

// Utility to set a token value
async function setToken(token, value, ttl = null) {
  const res = await fetch(STORE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ token, value, ttl }),
  });
  return res.json();
}

// Populate leaders checklist
async function loadLeaders() {
  const leaders = await getToken(LEADERS_TOKEN) || [];
  const container = document.getElementById("leaderChecklist");
  container.innerHTML = "";
  leaders.forEach((name, idx) => {
    const id = `leader_${idx}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = name;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.value = name;

    label.prepend(checkbox);
    container.appendChild(label);
    container.appendChild(document.createElement("br"));
  });
}

// Populate session list
async function loadSessions() {
  const sessions = await getToken(SESSIONS_TOKEN) || [];
  const list = document.getElementById("sessionList");
  list.innerHTML = "";
  // Sort newest-first
  sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
  sessions.forEach(session => {
    const li = document.createElement("li");
    li.textContent = `${session.date}: ${session.leaders.join(", ")}`;
    list.appendChild(li);
  });
}

// Handle form submission
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const date = document.getElementById("sessionDate").value;
  if (!date) return;

  const checkboxes = document.querySelectorAll("#leaderChecklist input[type=checkbox]");
  const selectedLeaders = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

  const sessions = await getToken(SESSIONS_TOKEN) || [];
  sessions.push({ date, leaders: selectedLeaders });
  await setToken(SESSIONS_TOKEN, sessions);

  document.getElementById("sessionDate").value = "";
  checkboxes.forEach(cb => cb.checked = false);
  loadSessions();
});

// Initial load
loadLeaders();
loadSessions();
</script>
