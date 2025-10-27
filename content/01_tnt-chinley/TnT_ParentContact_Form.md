---
title: "TnT Parental Contact Form"
summary: "TnT Parental Contact Form"
last_reviewed: 2025-10-17
review_period: 1y
reviewed_by: Stephen Dolley
type: form
include_unselected_options: false
restrict_users: false
validation: [submit] # options: requestLink, submit, none (default)
qrCode: true
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

<p>Please complete this form to confirm that you are happy for your child to attend TnT.</p>
<p>All TnT helpers are DBS checked and trained in Safeguarding.</p>

<fieldset>
   <legend>Young Person’s Information</legend>
   <label>Child's Full Name:<input required class="name" type="text"></label>
   <label>Date of Birth:<input required type="date"></label>
</fieldset>

<fieldset>
   <legend>Emergency Contact Details</legend>
   <label>Name of Parent(s) / other adult(s) with delegated parental authority:<input required class="name" type="text"></label>
   <label>Relationship to Child:<input required class="short-input" type="text"></label>
   <label>Phone Number(s):<input required type="tel"></label>
   <label>Email Address:<input required id="submitted_by" type="email" placeholder="you@example.com"></label>
</fieldset>

<fieldset>
   <legend>Parent/Guardian Consent</legend>
   <label><input type="checkbox"> I give permission for my child to attend Chinley TnT.</label>
   <label><input type="checkbox"> I give permission for my child to attend Whaley Bridge TnT.</label>
   <label><input required type="checkbox"> I give permission for Ascend Next Level to securely retain this information.</label>
   <label><input required type="checkbox"> I confirm that typing my name below acts as my electronic signature.</label>
   <label>Name:<input required class="name" type="text"></label>
   <label>Date:<input required class="autofill-today" type="date"></label>
</fieldset>