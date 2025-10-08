---
title: "TnT Parental Consent Form"
summary: ""
last_reviewed: 2025-09-20
review_period: 1m
reviewed_by: Cheryl Cross
type: form
include_unselected_options: true
restrict_users: false
validation: submit
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

<p>This form should be completed by the child’s parent or other adult with delegated parental responsibility. Parental Consent Forms will be renewed annually at the start of the school year so that the data held is up to date. Please complete the consent form below to enable your child to attend the group.</p>

<fieldset>
  <legend>Young Person’s Information</legend>
  <label>Child's Full Name:<input type="text" class="name" required></label>
  <label>Date of Birth:<input type="date" autocomplete="off" required></label>
  <label>Address & Postcode:<input type="text" class="address" required></label>
  <label>If the child does not live with the parent(s)/guardian(s), who do they live with?<input type="text" class="name" value="N/A"></label>
  <label>Relationship to Child:<input type="text" class="short-input" value="N/A"></label>
</fieldset>

<fieldset>
  <legend>Emergency Contact Details</legend>
  <label>Name of Parent(s) / other adult(s) with delegated parental authority:<input type="text" class="name" required></label>
  <label>Relationship to Child:<input type="text" class="short-input" required></label>
  <label>Phone Number(s):<input type="tel" required></label>
  <label>Email Address:<input required id="submitted_by" type="email" placeholder="you@example.com"></label>
  <label>Alternative Contact Name:<input type="text" class="name"></label>
  <label>Alternative Contact Number:<input type="tel"></label>
</fieldset>

<fieldset>
  <legend>Medical Information</legend>
  <label>Name of family doctor:<input type="text" class="name"></label>
  <label>Practice Address:<input type="text" class="address"></label>
  <label>Practice phone number:<input type="tel"></label>
  <label>Any details of your child's health issues, medical conditions, allergies, or dietary requirements:<input type="text" value="None"></label>
  <label>Any additional needs that we should be aware of:<input type="text" value="None"></label>
  <label>Date of last anti-tetanus injection (if known):<input type="text" class="short-input" value="None"></label>
</fieldset>

<fieldset>
  <legend>Permission for sticking plasters</legend>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>
</fieldset>

<fieldset>
  <legend>Weekly Activities Consent</legend>
  <label><input type="checkbox" required> I give permission for my child to take part in the normal weekly activities of Chinley TnT.</label>
</fieldset>

<fieldset>
  <legend>First Aid Consent</legend>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>
</fieldset>

<fieldset>
  <legend>Emergency Medical Consent</legend>
  <label><input type="radio" required> Yes</label>
  <label><input type="radio"> No</label>
</fieldset>

<fieldset>
  <legend>Parent/Guardian Consent</legend>
  <label><input type="checkbox" required> I give explicit permission for Chinley TnT to process personal/medical data.</label>
  <label><input type="checkbox" required> I confirm the information provided is accurate.</label>
  <label><input type="checkbox" required> I confirm that typing my name below acts as my electronic signature.</label>
  <label>Name:<input type="text" class="name" required></label>
  <label>Date:<input type="date" class="autofill-today" required></label>
</fieldset>

<fieldset>
  <legend>Child Consent (if aged 13 or over)</legend>
  <label><input type="checkbox"> I confirm that typing my name below acts as my electronic signature.</label>
  <label>Name:<input type="text" class="name"></label>
  <label>Date:<input type="date" class="autofill-today"></label>
</fieldset>
