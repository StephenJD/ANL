---
title: "Volunteer Application Form"
summary: "To be completed by all staff and volunteers of ANL"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
restrict_users: false
#include_unselected_options: false # options: "true", "false" (default)
validation: requestLink submit # options: "requestLink" &| "submit", "none" (default)
---

<!--
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
-->

<fieldset>
   <legend>Contact Details</legend>
   <label>Full name:<input required class="name" type="text"></label>
   <label>Address:<textarea required class="address" rows="2"></textarea></label>
   <label>Phone number:<input required type="tel"></label>
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
   <label><input required type="checkbox">Administrator</label>
   <label><input required type="checkbox">Adult-Only ministry</label>
   <label><input required type="checkbox">Childrens ministry</label>
   <label><input required type="checkbox">TnT</label>
   <label><input required type="checkbox">Prayer Room</label>
   <label><input required type="checkbox">Prophetic/Deliverance Ministry</label>
</fieldset>
   
<fieldset>   
   <legend>DBS Requirement</legend>
   <label><input required type="radio">None</label>
   <label><input type="radio">Children only</label>
   <label><input type="radio">Adults only</label>
   <label><input type="radio">Children and adults</label>
</fieldset>

<fieldset>
   <legend>Personal Statement</legend>
   <label>Please briefly describe your reasons for applying for this role and any appropriate experience:<textarea required rows="6"></textarea></label>
   <label>Do you have any questions or concerns about the role that you would like to discuss?<textarea rows="4"></textarea></label>
</fieldset>

<fieldset>
   <legend>Reference 1</legend>
   <label>Name:<input required class="name" type="text"></label>
   <label>Relationship to you:<input required class="short-input" type="text"></label>
   <label>Address:<textarea required class="address" rows="2"></textarea></label>
   <label>Phone:<input required type="tel"></label>
   <label>E-mail address:<input required type="email"></label>
</fieldset>

<fieldset>
   <legend>Reference 2</legend>
   <label>Name:<input required class="name" type="text"></label>
   <label>Relationship to you:<input required class="short-input" type="text"></label>
   <label>Address:<textarea required class="address" rows="2"></textarea></label>
   <label>Phone:<input required type="tel"></label>
   <label>E-mail address:<input required type="email"></label>
</fieldset>

<fieldset>
   <legend>Self-Declaration</legend>
   <label>Do you have any criminal convictions that would affect your ability to perform this role?</label>
   <label><input required type="radio"> Yes</label>
   <label><input type="radio"> No</label>

   <label>Is your state of physical, mental, emotional, and spiritual health adequate to fulfil this role?</label>
   <label><input required type="radio"> Yes</label>
   <label><input type="radio"> No</label>

   <label>If the role involves working with children, young people, or vulnerable adults, are you, or have you ever been barred from such work?</label>
   <label><input required type="radio"> Yes</label>
   <label><input type="radio"> No</label>

   <label>Are you a practising Christian, growing in faith as a disciple and helping others to grow in their faith too?</label>
   <label><input required type="radio"> Yes</label>
   <label><input type="radio"> No</label>

   <label>Do you agree to abide by the policies, procedures, codes of conduct, risk assessments etc relevant to this role?</label>
   <label><input required type="radio"> Yes</label>
   <label><input type="radio"> No</label>

   <label>Is there anything you wish to add or that you wish us to consider in relation to this self-declaration?<textarea rows="4"></textarea></label>
</fieldset>

<fieldset>
   <legend>Signature</legend>
   <label><input required type="checkbox"> I confirm that typing my name below acts as my electronic signature.</label>
   <label>Signature:<input required class="name" type="text"></label>
   <label>Date:<input required class="autofill-today" type="date"></label>
</fieldset>
