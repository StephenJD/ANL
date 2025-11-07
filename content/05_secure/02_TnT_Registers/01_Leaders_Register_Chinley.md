---
title: "TnT Leader Weekly Register - Chinley"
last_reviewed: 2025-10-18
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [Helper]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<!--
These are the form rules:
All radios and checkboxes (values) are in fieldsets and can be a mix of radios and checkboxes
Any fieldset with no legend is a member of a value array
The radio / checkbox members of a fieldset form a value array
A radio or checkbox immediatly followed by a fieldset becomes the key for that fieldset
Nested labels or legends become nested keys.
Text-like inputs are always value and may occur inside or outside fieldsets.
-->


<label>Date: <input required type="date" class="autofill-today" /></label>
  <fieldset>
    <legend>Helpers</legend>
    <div class="leaders-container"></div>
  </fieldset>
  
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
      leadersContainer.innerHTML = "";
      leadersData.records.forEach(leader => {
      const labelText = leader.name;
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      const label = document.createElement("label");
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


