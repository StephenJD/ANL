---
title: "TnT Leader Weekly Register - Chinley"
last_reviewed: 2025-10-18
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [Helper]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<h2>Weekly Leader Register</h2>

<label>Date: <input required type="date" class="autofill-today" /></label>

  <fieldset>
    <legend>Helpers</legend>
    <div class="leaders-container"></div>
  </fieldset>
  

<h2>Previous Weekly Records</h2>
<ul id="weeklyRecordsList"></ul>

<script type="module">
  import { manageBinArrayForm } from "/js/binArrayInterface.js";

  document.addEventListener("access-validated", async () => {
    const form = document.querySelector("form.verified-form");
    const leadersContainer = form.querySelector(".leaders-container");

    // --- fetch leaders dynamically from the bin-store ---
    const leadersData = await fetch("/.netlify/functions/manageBinArrays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "list", bin_id: "HELPER_BIN", section_key: "TnT-Helpers" })
    }).then(res => res.json());

    if (leadersData.success && Array.isArray(leadersData.records)) {
      // each record represents a leader
      leadersContainer.innerHTML = "";
      leadersData.records.forEach(leader => {
      const labelText = leader.name || "Unnamed Leader";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      const label = document.createElement("label");
      label.style.display = "block";
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(" " + labelText));

      leadersContainer.appendChild(label);
    });
    }

    // --- manage the form using binArrayInterface ---
    manageBinArrayForm({
      bin_id: "TNT_SESSIONS_BIN",
      sectionKey: "TnT-Sessions",
      listLabel: "Previous Sessions",
      form
    });
  });
</script>


