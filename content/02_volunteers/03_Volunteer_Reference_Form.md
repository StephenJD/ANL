---
title: "Volunteer Reference Form"
summary: Reference form for volunteers working with children or vulnerable adults
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
---

<form 
name="{{< getPageTitle >}}" 
class="verified-form"
netlify
>
<h1>{{< getPageTitle >}}</h1>

<input type="hidden" name="form-name" value="volunteer-reference">

<!-- Honeypot field -->
<p style="display:none">
  <label>Don’t fill this out: <input name="bot-field"></label>
</p>

<h2>Referee and Volunteer Details</h2>
<div class="textCols">
  <label for="referee_name_address" class="required">Name and address of referee:</label>
  <input class="short-input" type="text" id="referee_name_address" name="referee_name_address" required>

  <label for="volunteer_name_address" class="required">Name and address of volunteer requesting reference:</label>
  <input class="short-input" type="text" id="volunteer_name_address" name="volunteer_name_address" required>
</div>

<h2>Applicant Information</h2>

<p>Dear</p>
<p><strong>Request for reference for a voluntary worker with children or vulnerable adults</strong></p>
<p>Re:</p>
<p><strong>Post applicant applying for:</strong> Director, Prayer Room Leader or Helper for Adults, Prayer Room Leader or Helper for Young People</p>

<p>
  The above person has given your name as someone who may be contacted in relation to their application for the above role, 
  which may involve working with children or vulnerable adults (i.e. adults experiencing, or at risk of, abuse or neglect).
</p>

<p>
  Guidelines suggest that all voluntary organisations must take steps to safeguard the children or vulnerable adults entrusted to their care. 
I would be grateful if you could comment on the following factors, in confidence, as they apply to the applicant:
</p>

<ul>
<li>Previous experience of working with children or vulnerable adults</li>
<li>Their ability to provide kind and consistent care</li>
<li>Evidence of their willingness to respect the background and culture of children and vulnerable adults in their care</li>
  <li>Their commitment to treat all children or vulnerable adults as individuals and with equal concern</li>
  <li>Any evidence or concern that they would not be suitable to work with children or vulnerable adults</li>
  <li>Their leadership qualities, skills and ability to work as part of a team in their role as director</li>
  <li>Their Christian faith</li>
</ul>

<p>Thank you for your assistance.</p>
<p>Yours sincerely, <strong>Cheryl Cross</strong></p>
<p>On behalf of Ascend Next Level Directors</p>

<h2>Reference Details</h2>
<div class="textCols">
  <label for="applicant_name" class="required">Applicant’s Name:</label>
  <input class="short-input" type="text" id="applicant_name" name="applicant_name" required>

  <label for="years_known" class="required">How long have you known the applicant? (years)</label>
  <input class="short-input" type="number" id="years_known" name="years_known" min="0" required>

  <label for="capacity_known" class="required">In what capacity have you known the volunteer?</label>
  <textarea id="capacity_known" name="capacity_known" rows="2" required></textarea>

  <label for="experience" class="required">Please share what you know about their previous experience of working with children or vulnerable adults:</label>
  <textarea id="experience" name="experience" rows="3" required></textarea>

  <label for="care_ability" class="required">Please share about their ability to provide kind, consistent and safe care:</label>
  <textarea id="care_ability" name="care_ability" rows="3" required></textarea>

  <label for="respect_culture" class="required">Evidence of their willingness to respect the background and culture of children or vulnerable adults in their care:</label>
  <textarea id="respect_culture" name="respect_culture" rows="3" required></textarea>

  <label for="equal_concern" class="required">Their commitment to treat all children or vulnerable adults as individuals and with equal concern:</label>
  <textarea id="equal_concern" name="equal_concern" rows="3" required></textarea>

  <label for="character_qualities">Their character qualities:</label>
  <textarea id="character_qualities" name="character_qualities" rows="3"></textarea>

  <label for="christian_commitment">Their Christian commitment and experience:</label>
  <textarea id="christian_commitment" name="christian_commitment" rows="3"></textarea>

  <label for="other_comments">Are there any other comments you would like to make about the volunteer?</label>
  <textarea id="other_comments" name="other_comments" rows="3"></textarea>

  <label for="health_comments">Any health-related comments which would affect their work with children/young people?</label>
  <textarea id="health_comments" name="health_comments" rows="2"></textarea>

  <label for="limitations">Any reservations you have, or any limitations we should bear in mind?</label>
  <textarea id="limitations" name="limitations" rows="2"></textarea>

  <fieldset>
  <legend>Signature</legend>

  <label for="RefereeName" class="required">Signed:</label>
  <input type="text" id="RefereeName" name="referee_name" class="short-input" required>

  <label for="RefereeDate" class="required">Date:</label>
  <input type="date" id="RefereeDate" name="referee_date" class="short-input autofill-today" required>

  <label class="checkbox-inline required">
  <input type="checkbox" name="RefereeSignatureConfirm" required>
  I confirm that typing my name above acts as my electronic signature.
  </label>
  </fieldset>
</div>

<button type="submit">Send</button>
</form>
