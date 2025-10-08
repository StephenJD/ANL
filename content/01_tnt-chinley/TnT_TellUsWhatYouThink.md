---
title: "TnT Feedback"
summary: "Tell us what you think..."
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
include_unselected_options: false
restrict_users: false
validation: none # options: "requestLink" &| "submit", "none" (default)
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

<h2>TnT is provided as a safe place for secondary school children to chill and chat.</h2>

<fieldset>
   <legend>Your opinion on the idea</legend>
   <label><input type="radio"> I think that is a good idea</label>
   <label><input type="radio"> I don't think it is needed in Chinley</label>
   <label>Other comments about the idea:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Location feedback</legend>
   <label><input type="checkbox"> The location is convenient</label>
   <label><input type="checkbox"> The room is too small</label>
   <label><input type="checkbox"> The room is not very inviting</label>
   <label><input type="checkbox"> Prefer to meet at the Community Centre</label>
   <label>Other comments about the location:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Timing feedback</legend>
   <label>I prefer a different day: When?<input type="text" class="short-input"></label>
   <label>I prefer a different time: When?<input type="text" class="short-input"></label>
   <label>Other comments about the day or time:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Snacks and drinks feedback</legend>
   <label><input type="checkbox"> I would like takeaway drinks</label>
   <label><input type="checkbox"> I like toast</label>
   <label><input type="checkbox"> I would like crumpets</label>
   <label><input type="checkbox"> I would like waffles</label>
   <label>Other comments about the snacks/drinks:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Activity preferences</legend>
   <label><input type="checkbox"> I like card games</label>
   <label><input type="checkbox"> I would like board games</label>
   <label><input type="checkbox"> I would like music</label>
   <label><input type="checkbox"> I would like space to do homework</label>
   <label><input type="checkbox"> I would like to play on my phone</label>
   <label><input type="checkbox"> I like to chat with my friends</label>
   <label><input type="checkbox"> I like to chat with a friendly adult</label>
   <label>Other comments about activities:<textarea rows="4"></textarea></label>
</fieldset>

<fieldset>
   <legend>Your details</legend>
   <label>First Name<input class="name" type="text" required></label>
</fieldset>
