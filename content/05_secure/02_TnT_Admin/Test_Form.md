---
title: "Test Form"
last_reviewed: 2025-10-18
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [SuperUser]
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

<div id="form-config" style="display:none">
  {
    "save_bin_id": "TNT_SESSIONS_BIN",
    "save_sectionKey": "TnT-Sessions",
    "listLabel": "Previous Sessions",
    "checkList_bin_id": "HELPER_BIN",
    "checkList_section_key": "TnT-Helpers",
    "checkList_fields": ["name"]
  }
</div>

<label>Date: <input required type="date" class="autofill-today" /></label>
<fieldset>
<legend>Present</legend>
  <label>Mobile No: <input type="tel" /></label>
  <label>Email: <input type="email" /></label>

<label><input type="checkbox"> Stephen Dolley</label>
<label><input type="checkbox"> Cheryl Cross</label>
<label><input type="radio"> Had fob</label>
<label><input type="radio"> Were let in</label>
</fieldset>
<fieldset>
<legend>Food</legend>
<label><input type="radio"> Pancakes</label>
<label><input type="radio"> Waffles</label>
</fieldset>


<fieldset><legend>Role</legend>
  <fieldset>
   <label><input type="checkbox">Chinley</label>
   <fieldset>
   <label><input required type="radio"> Leader</label>
   <label><input required type="radio"> Helper</label>
   </fieldset>
  </fieldset>
  
  <fieldset>
   <label><input type="checkbox">Whaley Bridge</label>
   <fieldset>
   <label><input required type="radio"> Leader</label>
   <label><input required type="radio"> Helper</label>
   </fieldset>
  </fieldset>

  <fieldset>
   <label><input type="checkbox">New Mills</label>
   <fieldset>
   <label><input required type="radio"> Leader</label>
   <label><input required type="radio"> Helper</label>
   </fieldset>
  </fieldset>
  
</fieldset>


  <fieldset>
    <legend>Helpers</legend>
    <div class="check-list-container"></div>
  </fieldset>
  
<ul id="weeklyRecordsList"></ul>