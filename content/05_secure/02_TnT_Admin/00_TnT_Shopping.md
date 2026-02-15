---
title: "TnT Shopping List"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Stephen Dolley
type: form
include_unselected_options: false
access: helper
validation: [none] # options: requestLink, submit, none (default)
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

<fieldset>
   <label>Date:<input class="autofill-today" type="date"></label>
</fieldset>

<fieldset>
   <legend>Required for</legend>
   <label><input type="checkbox">Chinley</label>
   <label><input type="checkbox">Whaley Bridge</label>
</fieldset>

<fieldset>
   <legend>Food Items to Buy</legend>
   <label><input type="checkbox">Milk</label>
   <label><input type="checkbox">Hot Chocolate</label>
   <label><input type="checkbox">Marsh Mallows</label>
   <label><input type="checkbox">Squirty Cream</label>
   <label><input type="checkbox">Orange Squash</label>
   <label><input type="checkbox">Blackcurrent Squash</label>
   <label><input type="checkbox">Ice Lollies</label>
   <label>No of packets of Waffles to get<input class="name" type="text" ></label>
   <label>No of packets of Pancakes to get<input class="name" type="text" ></label>
   <label>No of packets of Crumpets to get<input class="name" type="text" ></label>
   <label>Other food items:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Sauces to Buy</legend>
   <label><input type="checkbox">Strawberry</label>
   <label><input type="checkbox">Caramel</label>
   <label><input type="checkbox">Chocolate</label>
   <label><input type="checkbox">Honey</label>
   <label>Other Sauces:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Non-Food Items to Buy</legend>
   <label><input type="checkbox">Kitchen-Roll</label>
   <label><input type="checkbox">J-Cloths</label>
   <label><input type="checkbox">Surface Cleaner</label>
   <label>Other Items:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>Bring from home</legend>
   <label><input type="checkbox">(Oat) Milk </label>
   <label><input type="checkbox">Squirty Cream</label>
   <label><input type="checkbox">Ice Lollies</label>
   <label><input type="checkbox">Cups</label>
   <label><input type="checkbox">Lids</label>
   <label><input type="checkbox">Kitchen-Roll</label>
   <label><input type="checkbox">Surface Cleaner</label>
   <label>Other Items/Notes:<textarea rows="2"></textarea></label>
</fieldset>

<fieldset>
   <legend>To Order</legend>
   <label><input type="checkbox">Cups</label>
   <label><input type="checkbox">Lids</label>
   <label>Other Items:<textarea rows="2"></textarea></label>
</fieldset>