---
title: "Volunteer Reference Form"
summary: Reference form for volunteers working with children or vulnerable adults
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
include_unselected_options: true
access: Admin
validation: [submit] # options: requestLink, submit, none (default)
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

<h2>Request for reference for a voluntary worker with children or vulnerable adults</h2>
<fieldset>
  <legend>Referee and Volunteer Details</legend>
  <label>Name and address of referee:<input type="text" class="address" required></label>
  <label>Name and address of volunteer requesting reference:<input type="text" class="address" required></label>
</fieldset>

<fieldset>
  <legend>Applicant Information</legend>
  <p>
    An applicant has given your name as a reference in relation to their application for a role 
    which may involve working with children or vulnerable adults (i.e. adults experiencing, or at risk of, abuse or neglect).
  </p>

  <p>
    Guidelines suggest that all voluntary organisations must take steps to safeguard the children or vulnerable adults entrusted to their care. 
    I would be grateful if you could comment on the following factors, in confidence, as they apply to the applicant:
  </p>

  <p>Thank you for your assistance.</p>
  <p>Yours sincerely, <strong>Cheryl Cross</strong></p>
  <p>On behalf of Ascend Next Level Directors</p>
</fieldset>

<fieldset>
  <legend>Reference Details</legend>
  <label>Applicant’s Name:<input type="text" class="short-input" required></label>
  <label>How long have you known the applicant? (years):<input type="number" class="short-input" min="0" required></label>
  <label>In what capacity have you known the volunteer?<textarea rows="2" required></textarea></label>
  <label>Please share what you know about their previous experience of working with children or vulnerable adults:<textarea rows="3" required></textarea></label>
  <label>Please share about their ability to provide kind, consistent and safe care:<textarea rows="3" required></textarea></label>
  <label>Evidence of their willingness to respect the background and culture of children or vulnerable adults in their care:<textarea rows="3" required></textarea></label>
  <label>Their commitment to treat all children or vulnerable adults as individuals and with equal concern:<textarea rows="3" required></textarea></label>
  <label>Their character qualities:<textarea rows="3"></textarea></label>
  <label>Their Christian commitment and experience:<textarea rows="3"></textarea></label>
  <label>Are there any other comments you would like to make about the volunteer?<textarea rows="3"></textarea></label>
  <label>Any health-related comments which would affect their work with children/young people?<textarea rows="2"></textarea></label>
  <label>Any reservations you have, or any limitations we should bear in mind?<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
  <legend>Signature</legend>
  <label>Email address:<input id="submitted_by" type="email" placeholder="you@example.com" required></label>
  <label><input type="checkbox" required> I confirm that typing my name below acts as my electronic signature.</label>
  <label>Signed:<input type="text" class="name" required></label>
  <label>Date:<input type="date" class="autofill-today" required></label>
  </label>
</fieldset>
