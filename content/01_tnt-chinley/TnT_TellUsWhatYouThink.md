---
title: "TnT Feedback"
summary: "Tell us what you think..."
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Stephen Dolley
type: form
include_unselected_options: false
access: public
validation: [none] # options: requestLink, submit, none (default)
qrCode: true
background_image: "/images/shared/pagewash.jpg"
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

<h2>TnT is provided as a safe place for secondary school pupils to chill and chat.</h2>

<fieldset>
   <legend>Where you have attended TnT</legend>
   <label><input type="checkbox">Chinley</label>
   <label><input type="checkbox">Whaley Bridge</label>
</fieldset>

<fieldset>
   <legend>Your opinion on the idea</legend>
   <label><input type="radio">I think that is a good idea</label>
   <label><input type="radio">I don't think it is needed</label>
   <label>Other comments about the idea:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Location feedback</legend>
   <label><input type="checkbox">The location is convenient</label>
   <label><input type="checkbox">The place is welcoming</label>
   <label>I think another TnT should be started in...<input type="text" class="short-input"></label>
   <label>Other comments about the location:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Timing feedback</legend>
   <label>I prefer a different day: When?<input type="text" class="short-input"></label>
   <label>I prefer a different time: When?<input type="text" class="short-input"></label>
   <label>Other comments about the day or time:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Comments about snacks and drinks</legend>
   <textarea rows="2"></textarea>
</fieldset>

<fieldset>
   <legend>What is good about TnT</legend>
   <label><input type="checkbox">I look forward to it each week</label>
   <label><input type="checkbox">I love being able to chill with my friends</label>
   <label><input type="checkbox">I like meeting other people at TnT</label>
   <label><input type="checkbox">I feel safe, accepted and loved at TnT</label>
   <label><input type="checkbox">I enjoy chatting with the helpers at TnT</label>
   <label>Other comments about your experience at TnT:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Activity preferences</legend>
   <label><input type="checkbox"> I like card games</label>
   <label><input type="checkbox"> I would like energetic fun games</label>
   <label><input type="checkbox"> I would like time for serious conversation</label>
   <label><input type="checkbox"> I would like board games</label>
   <label><input type="checkbox"> I would like music</label>
   <label><input type="checkbox"> I would like to do homework at TnT</label>
   <label>Other comments about activities<textarea rows="4"></textarea></label>
</fieldset>

<fieldset>
   <legend>Your details</legend>
   <label>First Name<input required class="name" type="text" ></label>
</fieldset>
