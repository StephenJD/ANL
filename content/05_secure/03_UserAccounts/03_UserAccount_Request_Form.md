---
title: "User Account Application"
summary: "User Account Application"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
restrict_users: false
#include_unselected_options: false # options: "true", "false" (default)
validation: [requestLink, restrictUsers] # options: restrictUsers, requestLink, submit, none (default)
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

<fieldset>
   <legend>Account Details</legend>
   <label>User name:<input required class="name" type="text"></label>
   <label>E-mail address:<input required id="submitted_by" type="email"></label>
   <label>Password:<input required type="password" autocomplete="new-password" />
  </label>
</fieldset>
