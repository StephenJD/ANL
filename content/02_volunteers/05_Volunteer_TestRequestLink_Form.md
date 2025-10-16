---
title: "Volunteer Test requestLink Form"
summary: "To be completed by all staff and volunteers of ANL"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
restrict_users: false
#include_unselected_options: false # options: "true", "false" (default)
validation: [requestLink] # options: requestLink, submit, none (default)
---

{{< comment >}}
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
{{< /comment >}}

<fieldset>
   <legend>Contact Details</legend>
   <label>E-mail address:<input required id="submitted_by" type="email"></label>
</fieldset>

<fieldset>
   <legend>I am applying to be a</legend>
   <label><input required type="radio">Director</label>
   <label><input type="radio">Employee</label>
   <label><input type="radio">Volunteer</label>
</fieldset>

<fieldset>
   <legend>Departments</legend>
   <label><input type="checkbox">Administrator</label>
   <label><input type="checkbox">Adult-Only ministry</label>
   <label><input type="checkbox">Childrens ministry</label>
   <label><input type="checkbox">TnT</label>
   <label><input type="checkbox">Prayer Room</label>
   <label><input type="checkbox">Prophetic/Deliverance Ministry</label>
</fieldset>
   
<fieldset>
   <legend>Signature</legend>
   <label><input required type="checkbox"> I confirm that typing my name below acts as my electronic signature.</label>
   <label>Signature:<input required class="name" type="text"></label>
   <label>Date:<input required class="autofill-today" type="date"></label>
</fieldset>
