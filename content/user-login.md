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

{{< comment `
Login Sequence:
User tries to access a restricted page.
/static/js/form_access_controller.js : controlRestrictedAccess() checks to see if page has restricted Access.
If it does:
  1. If there is a session-key and the role matches the page-role then the page is served.
  2. If there is a session-key and the role does NOT match the page-role then "No-Access" message shown.
  3. If there is NO session-key they are redirected to /user-login
/user-login flow:
If a user enters UN & PW and clicks "Login":
  4. functions/verifyUser getLogin_SessionToken() looks in permitted_users for a login_token for that UN
  5. If it finds one, it generates a temporary access-token in accessTokens with the roles for that user.
  6. User is redirected back to the original page, to step 1 above. 
  7. If there is no login_token it displays "Enter email below and click "Register" to apply for an account"
  8. permitted_users is checked for an entry with that email.
  9. If the email is absent, it displays "Account not permitted"
  10. If the email is found it adds the UN and login_token to that permitted_users entry.
  11. It then goes to step 5 above.
If a user clicks "Log-out":
  12. temporary access-token is deleted from accessTokens and local storage.
  13. UN/PW are cleared.
  14. Go to step 7.
If a user clicks "Reset Password": 
  15. permitted_users login_token and UN are deleted.
  16. Go to step 12.
` >}}


<fieldset>
  <div id="login-div">
  <legend>Log-In</legend>
  <label>User name<input required class="name" type="text" data-lpignore="true"></label>
  <label>Password<input required type="password" autocomplete="current-password" data-lpignore="true"></label>
  <button type="button">Login</button>
  </div>
  <button type="button" style="display:none;">Logout</button>
  <br><span id="login_message" style="color:red;margin-top:0.5em;"></span><br>
  <div id="register-div">
  <label>Email<input id="submitted_by" type="email" data-lpignore="true"></label><br>
  <button type="button">Register</button>
  <button type="button">Reset Password</button>
  </div>
</fieldset>

<script type="module">
console.log("Login form script loaded, waiting for access-validated event.");

document.addEventListener("access-validated", async () => {
  console.log("Access validated event triggered.");

  const form = document.querySelector("form[name='login']");
  console.log("Login form found:", form);

  const buttons = Array.from(form.querySelectorAll("button"));
  const loginBtn = buttons.find(b => b.textContent.trim() === "Login");
  const logoutBtn = buttons.find(b => b.textContent.trim() === "Logout");
  const registerBtn = buttons.find(b => b.textContent.trim() === "Register");
  const resetBtn = buttons.find(b => b.textContent.trim() === "Reset Password");
  console.log("Buttons mapped:", { loginBtn, logoutBtn, registerBtn, resetBtn });
  const messageBox = document.getElementById("login_message");
  const emailInput = document.getElementById("submitted_by");
  const emailLabel = emailInput.closest("label");
  let urlToken = new URLSearchParams(window.location.search).get("token");
  const inputs = form.querySelectorAll("input");
  const userNameInput = inputs[0];
  const passwordInput = inputs[1];
  const sessionToken = localStorage.getItem("session_token");
  const loginDiv = form.querySelector("#login-div");
  const registerDiv = form.querySelector("#register-div");

  let userName = null;
  let email = null;
  let loginState = null;
  let password = null;
 
  const LoginStates = Object.freeze({
    UNKNOWN: "unknown",
    LOGGING_OUT: "logging_out",
    LOGGED_OUT: "logged_out",
    CHECK_SESSION_TOKEN: "checking_session_token",
    LOGGING_IN: "logging_in",
    SHOWING_USER: "showing_user",
    LOGGED_IN: "logged_in",
    REGISTER_LINK_REQUESTED: "register_link_requested",
    REGISTERING: "registering",
    RESETTING: "resetting"
  });
  
  async function findLogin_State() {
    if (sessionToken) {
      return LoginStates.CHECK_SESSION_TOKEN;
    } else if (urlToken) {
      return LoginStates.REGISTERING;
    } else {
      return LoginStates.LOGGED_OUT;
    }
    console.log("Initial loginState:", loginState);
  };

  async function runLoginSequence(newState) {
    console.log("runLoginSequence() New State:", newState);
    userName = userNameInput.value.trim();
    password = passwordInput.value;
    email = emailInput.value.trim();
console.log("loginDiv:", loginDiv, "logoutBtn:", logoutBtn, "registerDiv:", registerDiv, "loginBtn:", loginBtn);

    switch (newState) {
      case LoginStates.LOGGED_IN:
        const redirect = new URLSearchParams(window.location.search).get("redirect");
        if (redirect) window.location.href = redirect;
        return LoginStates.LOGGED_IN;
  
      case LoginStates.CHECK_SESSION_TOKEN:
        if (await checkSessionToken(sessionToken)) {
          return LoginStates.SHOWING_USER;
        }
        return LoginStates.LOGGING_OUT;

      case LoginStates.REGISTERING:
        console.log("runLoginSequence() REGISTERING: Em,Un,Pw,Tk", email, userName, password, urlToken);
        if (urlToken && email) {
          if (!userName || !password) {
            messageBox.textContent = `Enter your User-Name and Password above then click "Register"`;
            loginBtn.style.display = "none";
            return LoginStates.REGISTERING;
          }
          if (await submit_new_user_login()) return LoginStates.LOGGING_IN;
          else {
            messageBox.textContent = `${email} not allowed to register. Contact admin at ANL.`;
            return LoginStates.LOGGED_OUT;
          }
        } else if (email) {
          messageBox.textContent = `Register UN/PW for ${email}`;
          return LoginStates.REGISTER_LINK_REQUESTED;
        } else {
          return LoginStates.LOGGED_OUT;
        }

      case LoginStates.REGISTER_LINK_REQUESTED:
        console.log("runLoginSequence() REGISTER_LINK_REQUESTED:", email);
        if (await requestAccount(email)) {
          messageBox.textContent = `Registration link emailed to ${email}`;
          return LoginStates.REGISTER_LINK_REQUESTED;
        } else {
          messageBox.textContent = "This email is not authorized to request an account.";
          return LoginStates.LOGGED_OUT;
        }

      case LoginStates.LOGGING_IN:

        console.log("runLoginSequence() LOGGING_IN:", userName, password);
        if (!userName || !password) {
          messageBox.textContent = `Please enter your User Name and Password above and click "Login".`;
          return LoginStates.LOGGED_OUT;
        }
        if (await getSessionTokenForUser()) {
          return LoginStates.SHOWING_USER;
        } else if (userName) {
          messageBox.textContent = `User Name ${userName} not found. Please enter your email below and click "Register".`;
        }
        return LoginStates.LOGGED_OUT;

      case LoginStates.SHOWING_USER:
        console.log("runLoginSequence() SHOWING_USER:", userName);
        loginDiv.style.display = "none";
        logoutBtn.style.display = "inline-block";
        registerDiv.style.display = "none";
        messageBox.textContent = `${userName} logged in`;
        return LoginStates.LOGGED_IN;
      
      case LoginStates.RESETTING:
        if (email) {
          if (await remove_login_token()) {
            return LoginStates.LOGGING_OUT;
          } else {
            messageBox.textContent = `Acount for ${email} not found`;
          }
        }
        return LoginStates.LOGGED_OUT
  
      case LoginStates.LOGGING_OUT:
        await removeSession_token();
        logoutBtn.style.display = "none";
        loginDiv.style.display = "block";
        registerDiv.style.display = "block";
        messageBox.textContent = "To Register or Reset your account, enter your email below";
        emailInput.value = "";
        userNameInput.value = "";
        passwordInput.value = "";
        urlToken = null;
        return LoginStates.LOGGED_OUT;

      case LoginStates.LOGGED_OUT:
        //messageBox.textContent = "Enter UN & PW above to log-in, or to Register or Reset your account, enter your email below";
        return loginState;

      default:
        console.log("Unknown state");
        return loginState;
    }
  }

  async function checkSessionToken(token) {
    console.log("checkSessionToken:", token);

    try {
      console.log("Sending checkSessionToken request...");
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_SessionToken", session_token: token })
      });

      const data = await resp.json();
      console.log("checkSessionToken response:", data);

      if (data.status === "success") {
        userNameInput.value = data.entry.user_name;
        console.log("SessionToken valid for", userNameInput.value);
        return true;
      }

      console.warn("SessionToken invalid", data.status);

    } catch (err) {
      console.error("checkSessionToken failed:", err);
    }
    return false;
  }

  async function getSessionTokenForUser() {
    console.log("getSessionTokenForUser() called.");

    console.log("getSessionTokenForUser:", userName, password);
    if (!userName || !password) {
      return false;
    }
    try {
      console.log("Sending verifyUser request for login token...");
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getLogin_SessionToken", userName, password })
      });

      const data = await resp.json();
      console.log("Parsed verifyUser response:", data);

      if (data.status === "success") {
        console.log("Login successful, saving session...");
        localStorage.setItem("session_token", data.sessionToken);
        localStorage.setItem("user_role", JSON.stringify(data.role));
        return true;
      }

      console.warn("Login not permitted:", data.status);
      
      /*
      // --- Check superuser ---
      console.log("Checking superuser credentials...");
      const suResp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkSuperUser", userName, password })
      });
      const suData = await suResp.json();
      console.log("Superuser check response:", suData);

      if (suData.status != "success") {
        console.warn("Login failed for non-superuser.");
        registerBtn.style.display = "inline-block";
        resetBtn.style.display = "inline-block";
        //alert("Login failed. Please register or reset your account.");
      }
      */

    } catch (err) {
      console.error("Login request failed:", err);
      //alert("Login failed. Check console for details.");
    }
    return false;
  }

  function removeSession_token() {
    console.log("removeSession_token() called, clearing session...");
    localStorage.removeItem("session_token");
    localStorage.removeItem("user_role");
    console.log("Login-options buttons restored after logout.");
  }

  async function submit_new_user_login() {
    console.log("submit_new_user_login() email/UN/PW:",email, userName, password);

    try {
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addUserLogin",
          email: email,
          userName: userName,
          password: password
        })
      });
      const data = await resp.json();
      if (data.status !== "success") {
        messageBox.textContent = `${email} Not permitted`;
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error adding user login:", err);
      messageBox.textContent = `Error trying to verify ${email}`;
    }
    return false;
  }

  async function remove_login_token() {
    console.log("remove_login_token() Email:", email);

    try {
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteUserLogin",
          email: email
        })
      });
      const data = await resp.json();
      console.log("remove_login_token() data:", data);
      if (data.status !== "success") {
        return false;
      }
      return true;
    } catch (err) {
      console.error("Error adding user login:", err);
      messageBox.textContent = `Error trying to delete ${userName}`;
    }
    return false;
  }

  async function runStateMachine(triggerState) {
    let newState = await runLoginSequence(triggerState);
    while (newState !== loginState) {
      loginState = newState;
      newState = await runLoginSequence(loginState);
    }
    console.log("runLoginSequence() Final State:", loginState);
  }  

  (async () => {
    loginState = await findLogin_State();
    runStateMachine(loginState);
  })();

  loginBtn.addEventListener("click", () => runStateMachine(LoginStates.LOGGING_IN));
  logoutBtn.addEventListener("click", () => runStateMachine(LoginStates.LOGGING_OUT));
  registerBtn.addEventListener("click", () => runStateMachine(LoginStates.REGISTERING));
  resetBtn.addEventListener("click", () => runStateMachine(LoginStates.RESETTING));

  console.log("Event listeners attached for login and logout.");
});
</script>

