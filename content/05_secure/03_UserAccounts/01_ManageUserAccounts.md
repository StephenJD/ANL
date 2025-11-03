---
title: "Manage Permitted Users"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [Full]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<form class="verified-form">
  <fieldset>
    <legend>Permitted User Details</legend>
    <label>Name<input required class="name" type="text" /></label>
    <label>Email<input required type="email" /></label>
    <label>User name<input class="name" type="text" readonly /></label>
  </fieldset>

  <fieldset>
    <legend>Role</legend>
    <div class="roles-container"></div>
  </fieldset>
</form>

<script type="module">
  import { manageBinArrayForm } from "/js/binArrayInterface.js";

  document.addEventListener("access-validated", async () => {
    const form = document.querySelector("form.verified-form");
    const rolesContainer = form.querySelector(".roles-container");

    // --- fetch roles dynamically from the bin-store ---
    const rolesData = await fetch("/.netlify/functions/manageBinArrays", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "list", bin_id: "USER_ACCESS_BIN", section_key: "Roles" })
    }).then(res => res.json());

    if (rolesData.success && Array.isArray(rolesData.records)) {
      // each record represents a role
      rolesContainer.innerHTML = "";
      rolesData.records.forEach(record => {
        const roleName = Object.values(record)[0]; // assuming first value is the role name
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = roleName;
        label.appendChild(input);
        label.append(` ${roleName}`);
        rolesContainer.appendChild(label);
      });
    }

    // --- manage the form using binArrayInterface ---
    manageBinArrayForm({
      bin_id: "USER_ACCESS_BIN",
      sectionKey: "permitted_users",
      listLabel: "Existing Accounts",
      form
    });
  });
</script>
