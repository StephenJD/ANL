---
title: "Manage Roles"
last_reviewed: 2025-10-22
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [SuperUser]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<div id="form-config" style="display:none">
  {
    "save_bin_id": "USER_ACCESS_BIN",
    "save_sectionKey": "Role_Details",
    "listLabel": "Existing Roles",
    "checkList_bin_id": null,
    "checkList_section_key": null,
    "checkList_fields": null
  }
</div>

<fieldset>
  <legend>Role Details</legend>
  <label>Role<input required class="name" type="text" /></label>
  <label>Description<input required type="text" /></label>
</fieldset>