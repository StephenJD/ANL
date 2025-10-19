---
title: "Manage Stored Records"
last_reviewed: 2025-10-18
review_period: 1y
reviewed_by: Stephen Dolley
type: form
---

<h2>Stored Secure Records</h2>
<p>This form lists all secure records currently stored. Select one or more to delete.</p>

<button type="button" id="refreshRecordsBtn">Refresh List</button>
<ul id="recordList"></ul>
<button type="button" id="deleteSelectedBtn" style="display:none;">Delete Selected</button>

<script>
document.addEventListener("DOMContentLoaded", () => {
  const recordsList = document.getElementById("recordList");
  const refreshBtn = document.getElementById("refreshRecordsBtn");
  const deleteBtn = document.getElementById("deleteSelectedBtn");

  // Normalise server response into an array of { token, value }
  function normalizeRecordsPayload(data) {
    if (!data) return [];
    if (Array.isArray(data.records)) {
      // Already an array of {token, value} (ideal)
      return data.records;
    }

    // Some backends return an object: { token1: value1, token2: value2, ... }
    if (data.records && typeof data.records === "object") {
      const obj = data.records;

      // numeric-keyed object (like { "0": {...}, "1": {...} })
      const keys = Object.keys(obj);
      const allNumeric = keys.length > 0 && keys.every(k => !isNaN(k));
      if (allNumeric) {
        return Object.values(obj).map(item => {
          // if values are objects that already contain token, try to preserve token if present
          if (item && item.token) return item;
          return { token: null, value: item };
        });
      }

      // token -> value mapping
      return Object.entries(obj).map(([token, value]) => ({ token, value }));
    }

    // Fallback: unknown shape
    return [];
  }

  async function fetchRecords() {
    recordsList.innerHTML = "<li>Loading...</li>";
    try {
      const res = await fetch("/.netlify/functions/secureStore_ClientAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list: true })
      });
      const data = await res.json();
      console.debug("[DEBUG] fetchRecords response:", data);

      const records = normalizeRecordsPayload(data);

      if (!records.length) {
        recordsList.innerHTML = "<li><em>No records found</em></li>";
        deleteBtn.style.display = "none";
        return;
      }

      // show newest first if there is a date-ish key, otherwise just reverse for simple recent-first
      // Here we simply render newest-first by reversing the array copy
      const rows = [...records].reverse();

      recordsList.innerHTML = "";
      for (const item of rows) {
        const token = item.token ?? (item.value && item.value.token) ?? "(unknown-token)";
        const value = item.value ?? item; // in case item is itself a value
        const li = document.createElement("li");
        li.style.listStyle = "none";

        // pretty-print small JSON, fall back to toString for primitives
        let pretty;
        try { pretty = typeof value === "object" ? JSON.stringify(value) : String(value); }
        catch (e) { pretty = String(value); }

        li.innerHTML = `
          <label>
            <input type="checkbox" class="record-checkbox" value="${encodeURIComponent(token)}">
            <strong>${token}</strong> — ${pretty}
          </label>
        `;
        recordsList.appendChild(li);
      }

      deleteBtn.style.display = "inline-block";
      updateInlineFit();
    } catch (err) {
      console.error("[ERROR] fetchRecords failed:", err);
      recordsList.innerHTML = `<li>Error loading records: ${err.message}</li>`;
      deleteBtn.style.display = "none";
    }
  }

  async function deleteSelected() {
    const checked = Array.from(document.querySelectorAll(".record-checkbox:checked"));
    if (!checked.length) return;

    if (!confirm(`Delete ${checked.length} selected record(s)? This cannot be undone.`)) return;

    // NOTE: your server-side currently supports SET (value provided) and GET (token).
    // The previous client attempted to delete by sending value: null — that will NOT work
    // with the current setSecureItem implementation (spreading null fails).
    //
    // Recommended minimal server change:
    // - Add support for a delete flag `delete: true` that removes the key from the stored object.
    //
    // Example server request body for delete (recommended):
    // { token: "<token>", delete: true }
    //
    // If you prefer, I can provide the tiny server-side patch to handle `delete: true`.
    //
    // Meanwhile, if your server already accepts value:null for deletion you can keep using it.
    //
    for (const box of checked) {
      const token = decodeURIComponent(box.value);
      // Preferred approach (server must implement delete handling)
      await fetch("/.netlify/functions/secureStore_ClientAccess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, delete: true })
      });
    }

    // refresh list
    await fetchRecords();
  }

  refreshBtn.addEventListener("click", fetchRecords);
  deleteBtn.addEventListener("click", deleteSelected);

  // initial load
  fetchRecords();
});
</script>
