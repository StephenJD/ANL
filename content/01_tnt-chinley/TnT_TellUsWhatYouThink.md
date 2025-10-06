---
title: "TnT Feedback"
summary: "Tell us what you think..."
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Cheryl Cross
type: form
---

<form 
  name="{{< getPageTitle >}}" 
  class="verified-form"
  data-netlify="true"
  netlify
>

<input type="hidden" name="_gotcha" style="display:none !important">

<hr>
<h2>TnT is provided as a safe place for secondary school children to chill and chat.</h2>
<p>Please select:</p>

<fieldset>
  <legend>Your opinion on the idea</legend>
  <label><input type="radio" name="Idea" value="Good Idea"> I think that is a good idea</label>
  <label><input type="radio" name="Idea" value="Bad Idea"> I don't think it is needed in Chinley</label>

  <label for="idea_other">Other comments about the idea:</label>
  <textarea id="idea_other" name="Idea_Other" rows="2"></textarea>
</fieldset>

<h2>TnT meets in the Parish Room opposite the shops in Chinley</h2>
<p>Please tick:</p>

<fieldset>
  <legend>Location feedback</legend>
  <label><input type="checkbox" name="Convenient" value="yes"> The location is convenient</label>
  <label><input type="checkbox" name="Small" value="yes"> The room is too small</label>
  <label><input type="checkbox" name="Uninviting" value="yes"> The room is not very inviting</label>
  <label><input type="checkbox" name="CommunityCentre" value="yes"> Prefer to meet at the Community Centre</label>

  <label for="location_other">Other comments about the location:</label>
  <textarea id="location_other" name="Location_Other" rows="2"></textarea>
</fieldset>

<h2>TnT meets after school on Fridays</h2>

<fieldset>
  <legend>Timing feedback</legend>
  <label for="day_preference">I prefer a different day: When?</label>
  <input id="day_preference" name="Day" type="text">

  <label for="time_preference">I prefer a different time: When?</label>
  <input id="time_preference" name="Time" type="text">

  <label for="daytime_other">Other comments about the day or time:</label>
  <textarea id="daytime_other" name="DayTime_Other" rows="2"></textarea>
</fieldset>

<h2>TnT offers hot and cold drinks and buttered toast</h2>

<fieldset>
  <legend>Snacks and drinks feedback</legend>
  <label><input type="checkbox" name="Takeaway" value="yes"> I would like takeaway drinks</label>
  <label><input type="checkbox" name="Toast" value="yes"> I like toast</label>
  <label><input type="checkbox" name="Crumpets" value="yes"> I would like crumpets</label>
  <label><input type="checkbox" name="Waffles" value="yes"> I would like waffles</label>

  <label for="snacks_other">Other comments about the snacks/drinks:</label>
  <textarea id="snacks_other" name="Snacks_Other" rows="2"></textarea>
</fieldset>

<h2>TnT offers various activities</h2>

<fieldset>
  <legend>Activity preferences</legend>
  <label><input type="checkbox" name="Card_Games" value="yes"> I like card games</label>
  <label><input type="checkbox" name="Boardgames" value="yes"> I would like board games</label>
  <label><input type="checkbox" name="Music" value="yes"> I would like music</label>
  <label><input type="checkbox" name="Homework" value="yes"> I would like space to do homework</label>
  <label><input type="checkbox" name="SmartPhone" value="yes"> I would like to play on my phone</label>
  <label><input type="checkbox" name="Chat_Friends" value="yes"> I like to chat with my friends</label>
  <label><input type="checkbox" name="Chat_Adult" value="yes"> I like to chat with a friendly adult</label>

  <label for="activity_other">Other comments about activities:</label>
  <textarea id="activity_other" name="Activity_Other" rows="4"></textarea>
</fieldset>

<fieldset>
  <legend>Your details</legend>
  <label for="firstName">First Name</label>
  <input class="name" id="firstName" name="Name" type="text" required>
</fieldset>

<button type="submit">Send</button>
</form>
