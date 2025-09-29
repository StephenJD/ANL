---
title: "Volunteer Application Form"
type: form
geometry: margin=2cm
geometry: a4paper
summary: "To be completed by all staff and volunteers of ANL"
---

<form action="https://getform.io/f/apjzldwa" method="POST" enctype="multipart/form-data">

# Volunteer Application Form

## About You

<label for="fullname">Full name</label>
<input type="text" id="fullname" name="fullname" class="short-input" required />

<label for="address">Address</label>
<textarea id="address" name="address" rows="2" required></textarea>

<label for="phone">Phone number</label>
<input type="text" id="phone" name="phone" class="short-input" required placeholder="e.g. 01234 567890" />

<label for="mobile">Mobile number</label>
<input type="text" id="mobile" name="mobile" class="short-input" placeholder="Optional" />

<label for="email">E-mail address</label>
<input type="email" id="email" name="email" class="short-input" required placeholder="you@example.com" />

---

## About the Role

<label for="department">Department</label>
<input type="text" id="department" name="department" class="short-input" required />

<label for="role">Role applied for</label>
<input type="text" id="role" name="role" class="short-input" required placeholder="e.g. Youth drop in volunteer at Chinley TNT" />

<fieldset required>
  <legend>Is the role subject to a DBS check?</legend>
  <div class="radio-group">
    <label><input type="radio" name="dbs_check" value="Children only" required> Children only</label>
    <label><input type="radio" name="dbs_check" value="Adults only"> Adults only</label>
    <label><input type="radio" name="dbs_check" value="Children and adults"> Children and adults</label>
  </div>
</fieldset>

---

## Personal Statement

<label for="statement">Please briefly describe your reasons for applying for this role and any appropriate experience in similar roles</label>
<textarea id="statement" name="statement" rows="6" required></textarea>

<label for="concerns">Do you have any questions or concerns about the role, or your ability to fulfil it, that you would like to discuss with us?</label>
<textarea id="concerns" name="concerns" rows="4"></textarea>

---

## References

**Reference 1**

<label for="ref1_name">Name</label>
<input type="text" id="ref1_name" name="ref1_name" class="short-input" required />

<label for="ref1_relationship">Relationship to you</label>
<input type="text" id="ref1_relationship" name="ref1_relationship" class="short-input" required />

<label for="ref1_address">Address</label>
<textarea id="ref1_address" name="ref1_address" rows="2" required></textarea>

<label for="ref1_phone">Phone</label>
<input type="text" id="ref1_phone" name="ref1_phone" class="short-input" placeholder="Optional" />

<label for="ref1_email">E-mail address</label>
<input type="email" id="ref1_email" name="ref1_email" class="short-input" placeholder="Optional" />

**Reference 2**

<label for="ref2_name">Name</label>
<input type="text" id="ref2_name" name="ref2_name" class="short-input" required />

<label for="ref2_relationship">Relationship to you</label>
<input type="text" id="ref2_relationship" name="ref2_relationship" class="short-input" />

<label for="ref2_address">Address</label>
<textarea id="ref2_address" name="ref2_address" rows="2" required></textarea>

<label for="ref2_phone">Phone</label>
<input type="text" id="ref2_phone" name="ref2_phone" class="short-input" placeholder="Optional" />

<label for="ref2_email">E-mail address</label>
<input type="email" id="ref2_email" name="ref2_email" class="short-input" placeholder="Optional" />

---

## Self-Declaration

<fieldset required>
  <legend>Do you have any criminal convictions that would affect your ability to perform this role?</legend>
  <div class="radio-group">
    <label><input type="radio" name="convictions" value="Yes" required> Yes</label>
    <label><input type="radio" name="convictions" value="No"> No</label>
  </div>
</fieldset>

<fieldset required>
  <legend>Is your state of physical, mental, emotional, and spiritual health adequate to fulfil this role?</legend>
  <div class="radio-group">
    <label><input type="radio" name="health" value="Yes" required> Yes</label>
    <label><input type="radio" name="health" value="No"> No</label>
  </div>
</fieldset>

<fieldset required>
  <legend>If the role involves working with children, young people, or vulnerable adults, are you, or have you ever been barred from such work?</legend>
  <div class="radio-group">
    <label><input type="radio" name="barred" value="Yes" required> Yes</label>
    <label><input type="radio" name="barred" value="No"> No</label>
  </div>
</fieldset>

<fieldset required>
  <legend>Are you a practising Christian, growing in faith as a disciple and helping others to grow in their faith too?</legend>
  <div class="radio-group">
    <label><input type="radio" name="christian" value="Yes" required> Yes</label>
    <label><input type="radio" name="christian" value="No"> No</label>
  </div>
</fieldset>

<fieldset required>
  <legend>Do you agree to abide by the policies, procedures, codes of conduct, risk assessments etc that are relevant to this role?</legend>
  <div class="radio-group">
    <label><input type="radio" name="policies" value="Yes" required> Yes</label>
    <label><input type="radio" name="policies" value="No"> No</label>
  </div>
</fieldset>

<label for="self_declaration_extra">Is there anything that you wish to add or that you wish us to consider in relation to this self-declaration?</label>
<textarea id="self_declaration_extra" name="self_declaration_extra" rows="4"></textarea>

<fieldset>
  <legend>Signature</legend>

  <!-- Name + electronic signature -->
  <label class="checkbox-inline required">
    Signed:
    <input type="text" id="RefereeName" name="referee_name" class="short-input" required>
  </label>

  <label for="RefereeDate" class="required">Date</label>
  <input type="date" id="RefereeDate" name="referee_date" class="short-input" required>

  <label class="checkbox-inline required">
    <input type="checkbox" name="RefereeSignatureConfirm" required>
    I confirm that typing my name above acts as my electronic signature.
  </label>
</fieldset>

<script>
  document.getElementById('RefereeDate').valueAsDate = new Date();
</script>

---

<button type="submit">Submit Application</button>

</form>
