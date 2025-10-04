---
title: "TnT Consent Form"
summary: Parental Consent for TnT
last_reviewed: 2025-09-20
review_period: 1m
reviewed_by: Cheryl Cross
type: form
---

<form 
  name="{{ .Title | urlize }}" 
  class="verified-form"
  netlify
>
<input type="hidden" name="_gotcha" style="display:none !important">

<h1>Parental Consent Form – Chinley TnT</h1>
<p>This form should be completed by the child’s parent or other adult with delegated parental responsibility. Parental Consent Forms will be renewed annually at the start of the school year so that the data held is up to date. Please complete the consent form below to enable your child to attend the group.</p>

<h2>Young Person’s Information</h2>
<div class="textCols">
  <label>Child's Full Name:</label>
  <input class="short-input" type="text" name="child_name" required>

  <label>Date of Birth:</label>
  <input type="date" name="dob" required>

  <label>Address & Postcode:</label>
  <input class="short-input" type="text" name="address" required>

  <label>If the child does not live with the parent(s)/guardian(s), who do they live with?</label>
  <input class="short-input" type="text" name="live_with" value="N/A">

  <label>Relationship to Child:</label>
  <input class="short-input" type="text" name="live_with_relationship" value="N/A">
</div>

<hr>
<h2>Emergency Contact Details</h2>
<div class="textCols">
  <label>Name of Parent(s) / other adult(s) with delegated parental authority:</label>
  <input class="short-input" type="text" name="parent_name" required>

  <label>Relationship to Child:</label>
  <input class="short-input" type="text" name="relationship" required>

  <label>Phone Number(s):</label>
  <input class="short-input" type="text" name="phone" required>

  <label>Email Address:</label>
  <input class="short-input" type="email" name="email">

  <label>Alternative Contact Name:</label>
  <input class="short-input" type="text" name="alt_name">

  <label>Alternative Contact Number:</label>
  <input class="short-input" type="text" name="alt_phone">
</div>

<hr>
<h2>Medical Information</h2>
<div class="textCols">
  <label>Name of family doctor:</label>
  <input class="short-input" type="text" name="doctor_name">

  <label>Practice Address:</label>
  <input class="short-input" type="text" name="Practice_Address">

  <label>Practice phone number:</label>
  <input class="short-input" type="text" name="Practice_phone">

  <label>Any details of your child's health issues, medical conditions, allergies, or dietary requirements:</label>
  <input class="short-input" type="text" name="health_issues" value="None">

  <label>Any additional needs that we should be aware of:</label>
  <input class="short-input" type="text" name="Other_Needs" value="None">

  <label>Date of last anti-tetanus injection (if known):</label>
  <input class="short-input" type="text" name="Tetanus_Date" value="None">

  <fieldset>
    <legend>Permission for sticking plasters</legend>
    <label><input type="radio" name="Plaster_Permission" value="Yes" required> Yes</label>
    <label><input type="radio" name="Plaster_Permission" value="No"> No</label>
  </fieldset>
</div>

<hr>
<h2>Consent</h2>
<div class="textCols">

  <fieldset>
    <legend>Weekly Activities Consent</legend>
    <label class="checkbox-inline">
      <input type="checkbox" name="Weekly_Activities_Consent" required>
      I give permission for my child to take part in the normal weekly activities of Chinley TnT.
    </label>
  </fieldset>

  <fieldset>
    <legend>First Aid Consent</legend>
    <label><input type="radio" name="FirstAid_Consent" value="Yes" required> Yes</label>
    <label><input type="radio" name="FirstAid_Consent" value="No"> No</label>
  </fieldset>

  <fieldset>
    <legend>Emergency Medical Consent</legend>
    <label><input type="radio" name="Medical_Consent" value="Yes" required> Yes</label>
    <label><input type="radio" name="Medical_Consent" value="No"> No</label>
  </fieldset>

<fieldset>
  <legend>Parent/Guardian Consent</legend>

  <label class="checkbox-inline required">
    <input type="checkbox" name="Data_Consent" required>
    I give explicit permission for Chinley TnT to process personal/medical data.
  </label>

  <label class="checkbox-inline required">
    <input type="checkbox" name="Confirm_Accurate" required>
    I confirm the information provided is accurate.
  </label>

  <label for="ParentName" class="required">Name</label>
  <input type="text" id="ParentName" name="ParentName" class="short-input" required>

  <label for="ParentDate" class="required">Date</label>
  <input type="date" id="ParentDate" name="ParentDate" class="short-input autofill-today" required>

  <label class="checkbox-inline required">
    <input type="checkbox" name="ParentSignatureConfirm" required>
    I confirm that typing my name above acts as my electronic signature.
  </label>
</fieldset>

<fieldset>
  <legend>Child Consent (if aged 13 or over)</legend>

  <label for="ChildName">Name</label>
  <input type="text" id="ChildName" name="ChildName" class="short-input">

  <label for="ChildDate">Date</label>
  <input type="date" id="ChildDate" name="ChildDate" class="short-input autofill-today">

  <label class="checkbox-inline">
    <input type="checkbox" name="ChildSignatureConfirm">
    I confirm that typing my name above acts as my electronic signature.
  </label>
</fieldset>


<br><br>
<button type="submit">Send</button>
</form>
