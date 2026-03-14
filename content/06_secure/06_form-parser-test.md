---
title: "Form Parser Test"
last_reviewed: 2026-03-06
review_period: 1y
reviewed_by: Stephen Dolley
type: form
include_unselected_options: true
access: draft
validation: [none]
---

{{< comment `
Test Form covering all parsing rules 1–9.
- Simplified: no unnecessary duplicates.
- Includes text inputs, textareas, checkboxes, radios, nested fieldsets, pseudo-legends.
` >}}

<fieldset>
   <label>Submitter Email:<input id="submitted_by" type="email" required></label>
</fieldset>

<fieldset>
   <label>Date:<input class="autofill-today" type="date"></label>
</fieldset>

<fieldset>
   <legend>Basic Info</legend>
   <label>Name:<input class="name" type="text" value="Stephen Dolley"></label>
   <label>Email:<input type="email" value="sjd@example.com"></label>
   <label>Notes:<textarea rows="2">None</textarea></label>
</fieldset>

<fieldset>
   <legend>Preferences</legend>
   <label><input type="checkbox" checked>Option A</label>
   <label><input type="checkbox">Option B</label>

   <label><input type="radio" name="choice" checked>Choice 1</label>
   <label><input type="radio" name="choice">Choice 2</label>

   <label><input type="checkbox" checked>Controlled Fieldset</label>
   <fieldset>
      <label><input type="radio" checked>Nested Radio 1</label>
      <label><input type="radio">Nested Radio 2</label>
      <label>Nested Notes:<textarea rows="2">None</textarea></label>
   </fieldset>

   <label>Fieldset Without Legend</label>
   <fieldset>
      <label><input type="checkbox" checked>Nested Checkbox</label>
      <label>Nested Text:<input type="text" value="Sample"></label>
   </fieldset>
</fieldset>

<fieldset>
   <legend>Multiple Children Array</legend>
   <label>Item 1:<input type="text" value="One"></label>
   <label>Item 2:<input type="text" value="Two"></label>
   <label>Item 3:<input type="text" value="Three"></label>
</fieldset>

<fieldset>
   <legend>Mixed Inputs</legend>
   <label><input type="checkbox" checked>Check A</label>
   <label><input type="checkbox">Check B</label>
   <label><input type="radio" checked>Radio A</label>
   <label><input type="radio">Radio B</label>
   <label>Text Input:<input type="text" value="Text"></label>
   <label>Textarea:<textarea rows="2">Textarea content</textarea></label>
</fieldset>

<fieldset>
   <label>Pseudo Legend Label</label>
   <fieldset>
      <label><input type="checkbox" checked>Child 1</label>
      <label><input type="checkbox">Child 2</label>
   </fieldset>
</fieldset>

<fieldset>
   <legend>Nested Fieldsets</legend>
   <label><input type="checkbox" checked>Parent A</label>
   <fieldset>
      <label><input type="radio" checked>Child A1</label>
      <label><input type="radio">Child A2</label>
   </fieldset>
   <label><input type="checkbox" checked>Parent B</label>
   <fieldset>
      <label><input type="radio">Child B1</label>
      <label><input type="radio" checked>Child B2</label>
   </fieldset>
</fieldset>
