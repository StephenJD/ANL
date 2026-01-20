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
User tries to access a restricted page:
/gatedPage.js does:
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
If a user clicks "Reset Account": 
  15. permitted_users login_token and UN are deleted.
  16. Go to step 12.
` >}}


<fieldset>
  <legend>Log-In</legend>
  <div id="login_div" style="display:none;">
   <label>User name<input required class="name" type="text" data-lpignore="true" placeholder="Sammy"></label>
   <label>Password<input required type="password" autocomplete="current-password" data-lpignore="true"></label>
   <button type="button" id="login_btn">Login</button>
  </div>
  
  <button type="button" id="logout_btn" style="display:none;">Logout</button>
  <br><span id="login_message" style="color:red;margin-top:0.5em;"></span><br>

  <div id="register_div" style="display:none;">
   <label id="email_lbl">Email<input id="submitted_by" type="email" data-lpignore="true" placeholder="Samantha@mail.com"></label><br>
   <button type="button" id="register_btn">Register</button>
   <button type="button" id="reset_btn">Reset Account</button>
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
  const emailLabel = document.getElementById("email_lbl");
  const emailInput = document.getElementById("submitted_by");
  const userNameInput = document.querySelector("input[type='text']");
  const passwordInput = document.querySelector("input[type='password']");
  const loginDiv = form.querySelector("#login_div");
  const registerDiv = form.querySelector("#register_div");

  const userLoginToken = localStorage.getItem("userLogin_token");
  const redirect = new URLSearchParams(window.location.search).get("redirect");
  const loginMsg = `Enter UN & PW above and click "Login" or to Register or Reset your account, enter your email below`;
  let urlToken = new URLSearchParams(window.location.search).get("token");
  let userName = null;
  let email = null;
  let loginState = null;
  let password = null;
 
  const LoginStates = Object.freeze({
    UNKNOWN: "unknown",
    DISPLAY_LOGIN: "show login controls",
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
    let iniState = null;
    if (userLoginToken) {
      iniState =  LoginStates.CHECK_USER_LOGIN_TOKEN;
    } else if (urlToken) {
      iniState =  LoginStates.REGISTERING;
    } else if (redirect) {
      iniState =  LoginStates.LOGGING_IN;
    } else {
      iniState =  LoginStates.LOGGING_OUT;
    }
    messageBox.textContent = loginMsg;
    console.log("[user-login] Initial loginState:", iniState);
    return iniState;
  };

  async function hideUI() {
  	  logoutBtn.style.display = "none";
  	  loginDiv.style.display = "none";
  	  registerDiv.style.display = "none";
  }

  async function runLoginSequence(newState) {
    userName = userNameInput.value.trim();
    password = passwordInput.value;
    email = emailInput.value.trim();
    console.log("[user-login] runLoginSequence() New State:", newState, "userName:", userName );
 
    switch (newState) {
      case LoginStates.LOGGED_IN:
        if (redirect) window.location.href = redirect;
        return LoginStates.LOGGED_IN;
  
      case LoginStates.CHECK_USER_LOGIN_TOKEN:
        await hideUI();
        messageBox.textContent = "Checking log-in details...";
        if (await check_UserLoginToken(userLoginToken)) {
          return LoginStates.SHOWING_USER;
        }
        return LoginStates.LOGGING_OUT;

      case LoginStates.REGISTERING:
        console.log("[user-login] runLoginSequence() REGISTERING: Em,Un,Tk", email, userName, urlToken);
        logoutBtn.style.display = "none";
        loginDiv.style.display = "block";
        registerDiv.style.display = "block";

	  if (urlToken && email) {
          if (!userName || !password) {
            messageBox.textContent = `Enter your User-Name and Password above then click "Register"`;
            loginBtn.style.display = "none";
            return LoginStates.REGISTERING;
          }
	    
          await hideUI();
          messageBox.textContent = "Checking log-in details...";

          if (await submit_new_user_login()) return LoginStates.LOGGING_IN;
          else {
            messageBox.textContent = `${email} not allowed to register. Contact admin at ANL.`;
            return LoginStates.DISPLAY_LOGIN;
          }
        } else if (email) {
          messageBox.textContent = `Preparing registration for ${email}`;
          return LoginStates.REGISTER_LINK_REQUESTED;
        } else {
	    messageBox.textContent = "Please enter your email address then click 'Register'";
          return LoginStates.DISPLAY_LOGIN;
        }

      case LoginStates.REGISTER_LINK_REQUESTED:
        console.log("[user-login] runLoginSequence() REGISTER_LINK_REQUESTED:", email);
	  await hideUI();
        if (await requestAccount(email)) {
          messageBox.textContent = `Registration link emailed to ${email}`;
          return LoginStates.REGISTER_LINK_REQUESTED;
        } else {
          messageBox.textContent = "This email is not authorized to request an account.";
	    registerDiv.style.display = "block";
	    return LoginStates.LOGGED_OUT;
        }

      case LoginStates.LOGGING_IN:
        console.log("[user-login] runLoginSequence() LOGGING_IN:", userName);
        if (!userName || !password) {
          messageBox.textContent = loginMsg;
          return LoginStates.DISPLAY_LOGIN;
        }
	  messageBox.textContent = "Checking log-in details...";
        await hideUI();
	  const result = await requestUserLoginToken(userName, password);
	  if (result.status === "success") {
	    return LoginStates.SHOWING_USER;
	  }
	  
	  if (result.status === "Invalid login_token") {
	    messageBox.textContent = "Invalid Password. Reset Account if necessary.";
	    return LoginStates.DISPLAY_LOGIN;
	  }
	  if (result.status === "Missing login_token") {
	    messageBox.textContent = "You need to re-register. Please enter your email below and click 'Register'";
	    registerDiv.style.display = "block";
	    return LoginStates.LOGGED_OUT;
	  }
	  if (result.status === "Not Registered") {
	    messageBox.textContent =
	      `User name ${userName} not found. Please correct, or enter your email below and click "Register".`;
	    return LoginStates.DISPLAY_LOGIN;
        }
        if (result.status === "error") {
          messageBox.textContent = "Your browser failed to get a response. You may have a network problem.";
          return LoginStates.DISPLAY_LOGIN;
        }
        return LoginStates.DISPLAY_LOGIN;

      case LoginStates.SHOWING_USER:
        console.log("[user-login] runLoginSequence() SHOWING_USER:", userName);
        loginDiv.style.display = "none";
        logoutBtn.style.display = "inline-block";
        registerDiv.style.display = "none";
        messageBox.textContent = `${userName} logged in`;
        return LoginStates.LOGGED_IN;
      
      case LoginStates.RESETTING:
        if (email) {
	    messageBox.textContent = "Checking for registered email...";
          await hideUI();
          if (await remove_login_token()) {
	      messageBox.textContent = "Account Reset. Please Re-Register.";
          } else {
            messageBox.textContent = `Acount for ${email} not found`;
          }
        } else {
	      messageBox.textContent = "Please enter your email address, then click 'Reset Account'";
	  }
        return LoginStates.DISPLAY_LOGIN
  
      case LoginStates.LOGGING_OUT:
        await removeSession_Login_token();
        messageBox.textContent = "To Register or Reset your account, enter your email below";
        emailInput.value = "";
        userNameInput.value = "";
        passwordInput.value = "";
        urlToken = null;
        return LoginStates.DISPLAY_LOGIN;

      case LoginStates.DISPLAY_LOGIN:
        logoutBtn.style.display = "none";
        loginDiv.style.display = "block";
        registerDiv.style.display = "block";
        return LoginStates.LOGGED_OUT;

      case LoginStates.LOGGED_OUT:
        return LoginStates.LOGGED_OUT;
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

  async function requestUserLoginToken(userName, password) {
    console.log("[user-login] requestUserLoginToken:", userName);
  
    try {
      const resp = await fetch("/.netlify/functions/verifyUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_UserLoginToken",
          userName,
          password
        })
      });
  
      const data = await resp.json();
      console.log("[user-login] verifyUser response:", data);
  
      if (data.status === "success") {
        localStorage.setItem("userLogin_token", data.userLoginToken);
        localStorage.setItem("user_role", JSON.stringify(data.role));
      }
  
      return data;
  
    } catch (err) {
      console.error("[user-login] requestUserLoginToken failed:", err);
      return { status: "error", error: err.message };
    }
  }

  function removeSession_Login_token() {
    console.log("[user-login] removeSession_Login_token() called, clearing session_loginToken...");
    localStorage.removeItem("userLogin_token");
    localStorage.removeItem("user_role");
    console.log("[user-login] Login-options buttons restored after logout.");
  }

  async function submit_new_user_login() {
    console.log("[user-login] submit_new_user_login() email/UN:",email, userName);

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