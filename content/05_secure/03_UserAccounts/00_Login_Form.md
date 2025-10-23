---
title: "Login"
summary: "User Login"
last_reviewed: 2025-09-28
review_period: 1y
reviewed_by: Stephen Dolley
type: form
restrict_users: [none]
validation: [noSend]
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
  <legend>Log-In</legend>
  <label>User name<input required class="name" type="text"></label>
  <label>Password<input required type="password" autocomplete="current-password"></label>
  <button type="button">Login</button>
  <button type="button" style="display:none;">Logout</button>
  <label style="display:none;>E-mail<input id="submitted_by" type="email" style="display:none;"></label>
  <button type="button" style="display:none;">Register</button>
  <button type="button" style="display:none;">Reset Password</button>
</fieldset>

<script type="module">
const form = document.querySelector("form[name='Login']");
const [loginBtn, logoutBtn, registerBtn, resetBtn] = form.querySelectorAll("button");

async function handleLogin() {
  const inputs = form.querySelectorAll("input");
  const userName = inputs[0].value.trim();
  const email = inputs[1].value.trim();
  const password = inputs[2].value;

  if (!userName || !email || !password) {
    alert("Please fill all required fields.");
    return;
  }

  try {
    const resp = await fetch("/.netlify/functions/verifyUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getLogin_SessionToken", userName, password })
    });

    const data = await resp.json();

    if (data.status === "success") {
      localStorage.setItem("session_key", data.sessionKey);
      localStorage.setItem("user_role", data.role);
      alert("Login successful.");

      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      registerBtn.style.display = "none";
      resetBtn.style.display = "none";
    } else {
      alert("Login failed.");
      registerBtn.style.display = "inline-block";
      resetBtn.style.display = "inline-block";
    }
  } catch (err) {
    console.error(err);
    alert("Login failed. Check console for details.");
  }
}

function handleLogout() {
  localStorage.removeItem("session_key");
  localStorage.removeItem("user_role");

  loginBtn.style.display = "inline-block";
  logoutBtn.style.display = "none";
  registerBtn.style.display = "none";
  resetBtn.style.display = "none";

  alert("You have been logged out.");
}

loginBtn.addEventListener("click", handleLogin);
logoutBtn.addEventListener("click", handleLogout);
</script>
