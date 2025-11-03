---
title: "Manage TnT Helpers"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: Full
validation: [noSend] # options: requestLink, submit, none (default), noSend
---

{{< comment `
Form Rules
1. Default: No attributes except type (email, tel, date, text) — except...
2. Add ONE class: name, address, or short-input where relevant.
3. Use class address for name & address field.
4. Inexact dates use short-input (not type="date").
5. id="submitted_by" for the submitter’s email field.
6. Use <fieldset> and <legend> to group fields, instead of headings.
7. NO MORE THAN 3 SPACE INDENT
8. Attribute order: <required> <id> <class> <type> .
9. Add "None" default text in all required text fields that ask for additional information.
` >}}

<label>Name: <input required class="name" type="text" /></label>
<fieldset><legend>Contact Details</legend>
  <label>Mobile No: <input required type="tel" /></label>
  <label>Email: <input required type="email" /></label>
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
</fieldset>

<fieldset><legend>DBS</legend>
  <label>DBS Number: <input class="short-input" type="text" /></label>
  <label>DBS Date: <input class="" type="date" /></label>
</fieldset>

<fieldset><legend>Safeguarding</legend>
  <label>Safeguarding Date: <input class="" type="date" /></label>
  <label>Safeguarding Level: <input class="short-input" type="text" /></label>
</fieldset>

<script type="module">
  import { manageBinArrayForm } from "/js/binArrayInterface.js";
  document.addEventListener("access-validated", () => {
    const form = document.querySelector("form.verified-form");
    manageBinArrayForm({
      bin_id: "HELPER_BIN",
      sectionKey: "TnT-Helpers",
      listLabel: "Existing Helpers",
      form
    });
  });
</script>