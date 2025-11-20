---
title: "Manage Permitted Users"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [Full]
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

<div id="form-config" style="display:none">
  {
    "save_bin_id": "USER_ACCESS_BIN",
    "save_sectionKey": "permitted_users",
    "listLabel": "Existing Permitted Users",
    "checkList_bin_id": "USER_ACCESS_BIN",
    "checkList_section_key": "Roles",
    "checkList_fields": ["Role"]
  }
</div>

<fieldset>
  <legend>Permitted User</legend>
  <label>Name<input required class="name" type="text" placeholder="Samantha Smith"/></label>
  <label>Email<input required type="email" placeholder="Samantha@mail.com" /></label>
  <label>User name<input class="name" type="text" disabled/></label>
  <label hidden>login_token<input type="text" hidden/></label>

  <fieldset>
    <legend>Role</legend>
    <div class="check-list-container"></div>
  </fieldset>
</fieldset>

<ul id="Permitted Users"></ul>