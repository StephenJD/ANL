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
If it does:
  1. If there is a userLoginToken and the role matches the page-role then the page is served.
  2. If there is a userLoginToken and the role does NOT match the page-role then "No-Access" message shown.
  3. If there is NO userLoginToken they are redirected to /user-login
/user-login flow:
If a user enters UN & PW and clicks "Login":
  4. functions/verifyUser get_UserLoginToken() looks in permitted_users for a login_token for that UN
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
    <label for="username_input">User name</label>
    <input required id="username_input" class="name" type="text" data-lpignore="true">
    
    <label for="password_input">Password</label>
    <input required id="password_input" type="password" autocomplete="current-password" data-lpignore="true">
    
    <button type="button" id="login_btn">Login</button>
  </div>

  <button type="button" id="logout_btn" style="display:none;">Logout</button>

  <br>
  <span id="login_message" style="color:red;margin-top:0.5em;"></span>
  <br>

  <div id="register-div">
    <label for="submitted_by">Email</label>
    <input id="submitted_by" type="email" data-lpignore="true"><br>
    
    <button type="button" id="register_btn">Register</button>
    <button type="button" id="reset_btn">Reset Password</button>
  </div>
</fieldset>

<script type="module">
//console.log("[user-login] Login form script loaded, waiting for access-validated event.");

document.addEventListener("access-validated", async () => {
  //console.log("[user-login] Access validated event triggered.");

  const form = document.querySelector("form[name='login']");
  //console.log([user-login] Login form found:", form);

  const loginBtn = document.getElementById("login_btn");
  const logoutBtn = document.getElementById("logout_btn");
  const registerBtn = document.getElementById("register_btn");
  const resetBtn = document.getElementById("reset_btn");

  const messageBox = document.getElementById("login_message");
  const emailInput = document.getElementById("submitted_by");
  const userNameInput = document.getElementById("username_input");
  const passwordInput = document.getElementById("password_input");

  const loginDiv = document.getElementById("login-div");
  const registerDiv = document.getElementById("register-div");
  
  const userLoginToken = localStorage.getItem("userLogin_token");
  let userName = null;
  let email = null;
  let loginState = null;
  let password = null;
  let urlToken = new URLSearchParams(window.location.search).get("token");
 
  const LoginStates = Object.freeze({
    UNKNOWN: "unknown",
    LOGGING_OUT: "logging_out",
    LOGGED_OUT: "logged_out",
    CHECK_USER_LOGIN_TOKEN: "checking_user_login_token",
    LOGGING_IN: "logging_in",
    SHOWING_USER: "showing_user",
    LOGGED_IN: "logged_in",
    REGISTER_LINK_REQUESTED: "register_link_requested",
    REGISTERING: "registering",
    RESETTING: "resetting"
  });
  
  async function findLogin_State() {
    if (userLoginToken) {
      return LoginStates.CHECK_USER_LOGIN_TOKEN;
    } else if (urlToken) {
      return LoginStates.REGISTERING;
    } else {
      return LoginStates.LOGGED_OUT;
    }
    console.log("[user-login] Initial loginState:", loginState);
  };

  async function runLoginSequence(newState) {
    console.log("[user-login] runLoginSequence() New State:", newState);
    userName = userNameInput.value.trim();
    password = passwordInput.value;
    email = emailInput.value.trim();
 
    switch (newState) {
      case LoginStates.LOGGED_IN:
        const redirect = new URLSearchParams(window.location.search).get("redirect");
        if (redirect) window.location.href = redirect;
        return LoginStates.LOGGED_IN;
  
      case LoginStates.CHECK_USER_LOGIN_TOKEN:
        if (await check_UserLoginToken(userLoginToken)) {
          return LoginStates.SHOWING_USER;
        }
        return LoginStates.LOGGING_OUT;

      case LoginStates.REGISTERING:
        console.log("[user-login] runLoginSequence() REGISTERING: Em,Un,Pw,Tk", email, userName, password, urlToken);
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
        console.log("[user-login] runLoginSequence() REGISTER_LINK_REQUESTED:", email);
        if (await requestAccount(email)) {
          messageBox.textContent = `Registration link emailed to ${email}`;
          return LoginStates.REGISTER_LINK_REQUESTED;
        } else {
          messageBox.textContent = "This email is not authorized to request an account.";
          return LoginStates.LOGGED_OUT;
        }

      case LoginStates.LOGGING_IN:

        console.log("[user-login] runLoginSequence() LOGGING_IN:", userName, password);
        if (!userName || !password) {
          messageBox.textContent = `Please enter your User Name and Password above and click "Login".`;
          return LoginStates.LOGGED_OUT;
        }
        if (await get_UserLoginToken()) {
          return LoginStates.SHOWING_USER;
        } else if (userName) {
          messageBox.textContent = `User Name ${userName} not found. Please enter your email below and click "Register".`;
        }
        return LoginStates.LOGGED_OUT;

      case LoginStates.SHOWING_USER:
        console.log("[user-login] runLoginSequence() SHOWING_USER:", userName);
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
        await removeLogin_token();
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
        console.log("[user-login] Unknown state");
        return loginState;
    }
  }

  async function check_UserLoginToken(token) {
    console.log("[user-login] check_UserLoginToken:", token);

    try {
      console.log("[user-login] Sending check_UserLoginToken request...");
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_userLoginToken", userLogin_token: token })
      });

      const data = await resp.json();
      console.log("[user-login] check_UserLoginToken response:", data);

      if (data.status === "success") {
        userNameInput.value = data.entry.user_name;
        console.log("[user-login] userLoginToken valid for", userNameInput.value);
        return true;
      }

      console.warn("[user-login] userLoginToken invalid", data.status);

    } catch (err) {
      console.error("[user-login] check_UserLoginToken failed:", err);
    }
    return false;
  }

  async function get_UserLoginToken() {
    console.log("[user-login] get_UserLoginToken:", userName, password);
    if (!userName || !password) {
      return false;
    }
    try {
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_UserLoginToken", userName, password })
      });

      const data = await resp.json();
      console.log("[user-login] Parsed verifyUser response:", data);

      if (data.status === "success") {
        console.log("[user-login] Login successful, saving userLoginToken...");
        localStorage.setItem("userLogin_token", data.userLoginToken);
        localStorage.setItem("user_role", JSON.stringify(data.role));
        return true;
      }

      console.warn("[user-login] Login not permitted:", data.status);
      
      /*
      // --- Check superuser ---
      console.log("[user-login] Checking superuser credentials...");
      const suResp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkSuperUser", userName, password })
      });
      const suData = await suResp.json();
      console.log("[user-login] Superuser check response:", suData);

      if (suData.status != "success") {
        console.warn("[user-login] Login failed for non-superuser.");
        registerBtn.style.display = "inline-block";
        resetBtn.style.display = "inline-block";
        //alert("Login failed. Please register or reset your account.");
      }
      */

    } catch (err) {
      console.error("[user-login] Login request failed:", err);
      //alert("[user-login] Login failed. Check console for details.");
    }
    return false;
  }

  function removeLogin_token() {
    console.log("[user-login] removeLogin_token() called, clearing loginToken...");
    localStorage.removeItem("userLogin_token");
    localStorage.removeItem("user_role");
    console.log("[user-login] Login-options buttons restored after logout.");
  }

  async function submit_new_user_login() {
    console.log("[user-login] submit_new_user_login() email/UN/PW:",email, userName, password);

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
      console.error("[user-login] Error adding user login:", err);
      messageBox.textContent = `[user-login] Error trying to verify ${email}`;
    }
    return false;
  }

  async function remove_login_token() {
    console.log("[user-login] remove_login_token() Email:", email);

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
      console.log("[user-login] remove_login_token() data:", data);
      if (data.status !== "success") {
        return false;
      }
      return true;
    } catch (err) {
      console.error("[user-login] Error adding user login:", err);
      messageBox.textContent = `[user-login] Error trying to delete ${userName}`;
    }
    return false;
  }

  async function runStateMachine(triggerState) {
    let newState = await runLoginSequence(triggerState);
    while (newState !== loginState) {
      loginState = newState;
      newState = await runLoginSequence(loginState);
    }
    console.log("[user-login] runLoginSequence() Final State:", loginState);
  }  

  (async () => {
    loginState = await findLogin_State();
    runStateMachine(loginState);
  })();

  loginBtn.addEventListener("click", () => runStateMachine(LoginStates.LOGGING_IN));
  logoutBtn.addEventListener("click", () => runStateMachine(LoginStates.LOGGING_OUT));
  registerBtn.addEventListener("click", () => runStateMachine(LoginStates.REGISTERING));
  resetBtn.addEventListener("click", () => runStateMachine(LoginStates.RESETTING));

  //console.log("[user-login] Event listeners attached for login and logout.");
});
</script>

