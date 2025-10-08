---
title: "Volunteer Application Form"
summary: "To be completed by all staff and volunteers of ANL"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
restrict_users: false
#include_unselected_options: false # options: "true", "false" (default)
validation: requestLink # options: "requestLink" &| "submit", "none" (default)
---

<!--
# Form Rules
1. Default: No attributes except type (email, tel, date, text) — except...
2. Add ONE class: name, address, or short-input where relevant.
3. Use class address for name & address field.
4. Inexact dates use short-input (not type="date").
5. id="submitted_by" for the submitter’s email field.
6. Use <fieldset> and <legend> to group fields, instead of headings.
7. NO MORE THAN 3 SPACE INDENT
8. Attribute order: <required> <id> <class> <type> .
-->

<fieldset>
  <legend>About You</legend>
  <label>Full name:<input type="text" class="name" required></label>
  <label>Address:<textarea class="address" rows="2" required></textarea></label>
  <label>Phone number:<input type="tel" required placeholder="e.g. 01234 567890"></label>
  <label>Mobile number:<input type="tel" placeholder="Optional"></label>
  <label>E-mail address:<input id="submitted_by" type="email" required placeholder="you@example.com"></label>
</fieldset>

<fieldset>
  <legend>About the Role</legend>
  <label>Department:<input type="text" class="short-input" required></label>
  <label>Role applied for:<input type="text" class="short-input" required placeholder="e.g. Youth drop in volunteer at Chinley TNT"></label>
  <legend>Is the role subject to a DBS check?</legend>
  <label><input type="radio" required> Children only</label>
  <label><input type="radio"> Adults only</label>
  <label><input type="radio"> Children and adults</label>
</fieldset>

<fieldset>
  <legend>Personal Statement</legend>
  <label>Please briefly describe your reasons for applying for this role and any appropriate experience:<textarea rows="6" required></textarea></label>
  <label>Do you have any questions or concerns about the role that you would like to discuss?<textarea rows="4"></textarea></label>
</fieldset>

<fieldset>
  <legend>References</legend>
  <strong>Reference 1</strong>
  <label>Name:<input type="text" class="name" required></label>
  <label>Relationship to you:<input type="text" class="short-input" required></label>
  <label>Address:<textarea class="address" rows="2" required></textarea></label>
  <label>Phone:<input type="tel" placeholder="Optional"></label>
  <label>E-mail address:<input type="email" placeholder="Optional"></label>

  <strong>Reference 2</strong>
  <label>Name:<input type="text" class="name" required></label>
  <label>Relationship to you:<input type="text" class="short-input"></label>
  <label>Address:<textarea class="address" rows="2" required></textarea></label>
  <label>Phone:<input type="tel" placeholder="Optional"></label>
  <label>E-mail address:<input type="email" placeholder="Optional"></label>
</fieldset>

<fieldset>
  <legend>Self-Declaration</legend>
  <label>Do you have any criminal convictions that would affect your ability to perform this role?</label>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>

  <label>Is your state of physical, mental, emotional, and spiritual health adequate to fulfil this role?</label>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>

  <label>If the role involves working with children, young people, or vulnerable adults, are you, or have you ever been barred from such work?</label>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>

  <label>Are you a practising Christian, growing in faith as a disciple and helping others to grow in their faith too?</label>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>

  <label>Do you agree to abide by the policies, procedures, codes of conduct, risk assessments etc relevant to this role?</label>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>

  <label>Is there anything you wish to add or that you wish us to consider in relation to this self-declaration?<textarea rows="4"></textarea></label>

  <label><input type="checkbox" required> I confirm that typing my name below acts as my electronic signature.</label>
  <label>Signature:<input type="text" class="name" required></label>
  <label>Date:<input type="date" class="autofill-today" required></label>
</fieldset>
