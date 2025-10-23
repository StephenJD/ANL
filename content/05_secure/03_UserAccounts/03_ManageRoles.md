---
title: "Manage Roles"
summary: "Define system roles"
last_reviewed: 2025-10-22
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [SuperUser]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<fieldset>
  <legend>Role Details</legend>
  <label>Role<input required class="name" type="text" /></label>
  <label>Description<input required type="text" /></label>
</fieldset>

<script type="module">
  import { manageBinArrayForm } from "/js/binArrayInterface.js";
  document.addEventListener("access-validated", () => {
    const form = document.querySelector("form.verified-form");
    manageBinArrayForm({
      binKey: "UserAccess",
      sectionKey: "Roles",
      listLabel: "Existing Roles",
      form
    });
  });
</script>
