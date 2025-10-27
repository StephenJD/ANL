// /netlify/functions/verifyUser.js
const isLocal = !process.env.SMTP_HOST;

if (isLocal) {
  try {
    require('dotenv').config();
    console.log("[verifyUser] Loaded .env locally");
  } catch (err) {
    console.warn("[verifyUser] dotenv not available in production");
  }
}

const { getSecureItem, setSecureItem } = require("./multiSecureStore");
const { generateUserToken, generateTempAccessToken } = require("./generateSecureToken");

// --- Bin keys from .env ---
const USER_ACCESS_BIN = process.env.USER_ACCESS_BIN;
const ACCESS_TOKEN_BIN = process.env.ACCESS_TOKEN_BIN;
const PERMITTED_USERS_KEY = process.env.PERMITTED_USERS_KEY;
const ADMIN_SUPERUSER_HASH = process.env.ADMIN_SUPERUSER_HASH;

// --- 1) Check if email is in permitted_users ---
async function checkIsPermittedUser(email) {
  console.log("[verifyUser] checkIsPermittedUser: email =", email);
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] permittedUsers loaded:", permittedUsers);
    return permittedUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
  } catch (err) {
    console.error("[verifyUser] checkIsPermittedUser error:", err);
    return false;
  }
}

// --- 2) Add a user login if permitted ---
async function addUserLogin(email, userName, password) {
  console.log("[verifyUser] addUserLogin: email, userName =", email, userName);
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] permittedUsers loaded:", permittedUsers);
    const userEntry = permittedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userEntry) {
    // // 2) Superuser check: loginToken matches ADMIN_SUPERUSER_HASH
    // if (!currentUser) {
      // console.log("[verifyUser] Comparing loginToken to ADMIN_SUPERUSER_HASH:", ADMIN_SUPERUSER_HASH);
      // if (loginToken === ADMIN_SUPERUSER_HASH) {
        // const superUserRecord = usersArray.find(u => u.email === userName);
        // const roles = superUserRecord ? superUserRecord.role : ["SuperUser"];
        // currentUser = { userName, email: userName, role: roles };
        // console.log("[verifyUser] SuperUser login granted:", currentUser);
      // } else {
        // console.log("[verifyUser] loginToken does NOT match superuser hash");
      // }
    // }
      console.log("[verifyUser] User not permitted");
      return { status: "Not permitted" };
    }

    const loginToken = generateUserToken(userName, password);
    userEntry.login_token = loginToken;
    userEntry.user_name = userName;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    console.log("[verifyUser] User login added, token =", loginToken);
    return { status: "success", loginToken, role: userEntry.role };
  } catch (err) {
    console.error("[verifyUser] addUserLogin error:", err);
    return { status: "error" };
  }
}

// --- 3) Get a session token for a login ---
async function getLogin_SessionToken(userName, password) {
  console.log("[verifyUser] getLogin_SessionToken called with:", { userName, passwordExists: !!password });

  try {
    const loginToken = generateUserToken(userName, password);
    console.log("[verifyUser] Generated loginToken:", loginToken);

    const usersArray = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] Users array:", usersArray);

    // 1) Try to find a user with matching login_token
    let currentUser = usersArray.find(u => u.login_token === loginToken);
    if (currentUser) {
      console.log("[verifyUser] Found user by login_token:", currentUser);
    } else {
      console.log("[verifyUser] Login not registered for user:", userName);
      return { status: "Not Registered" };
    }

    // 3) Generate temporary session key
    const sessionToken = generateTempAccessToken(loginToken);
    console.log("[verifyUser] Generated session key:", sessionToken);

    await setSecureItem(
      ACCESS_TOKEN_BIN,
      sessionToken,
      { user_name: currentUser.user_name, role: currentUser.role },
      30 * 60 * 1000
    );

    console.log("[verifyUser] Session key stored successfully.");
    return { status: "success", sessionToken, role: currentUser.role };

  } catch (err) {
    console.error("[verifyUser] getLogin_SessionToken error:", err);
    return { status: "error" };
  }
}

async function deleteUserLogin(email) {
  console.log("[verifyUser] deleteUserLogin: email =", email);
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] permittedUsers loaded:", permittedUsers);
    const userEntry = permittedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userEntry) {
      console.log("[verifyUser] User not found");
      return { status: "Not found" };
    }

    userEntry.login_token = null;
    userEntry.user_name = null;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    console.log("[verifyUser] User login deleted");
    return { status: "success" };
  } catch (err) {
    console.error("[verifyUser] deleteUserLogin error:", err);
    return { status: "error" };
  }
}

// --- 4) Check session token is valid ---
async function check_SessionToken(session_token) {
  console.log("[verifyUser] check_SessionToken called with:", { session_token });

  try {
    const entry = await getSecureItem(ACCESS_TOKEN_BIN, session_token);
    if (!entry) {
      console.log("[verifyUser] Session token not found.");
      return { status: "Not found" };
    }

    const now = Date.now();
    if (entry.expires > now) {
      console.log("[verifyUser] Session token valid:", entry);
      return { status: "success", entry };
    } else {
      console.log("[verifyUser] Session token expired.");
      return { status: "expired" };
    }
  } catch (err) {
    console.error("[verifyUser] check_SessionToken error:", err);
    return { status: "error" };
  }
}


async function deleteUserLogin(email) {
  console.log("[verifyUser] deleteUserLogin: email =", email);
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] permittedUsers loaded:", permittedUsers);
    const userEntry = permittedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userEntry) {
      console.log("[verifyUser] User not found");
      return { status: "Not found" };
    }

    userEntry.login_token = null;
    userEntry.user_name = null;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    console.log("[verifyUser] User login deleted");
    return { status: "success" };
  } catch (err) {
    console.error("[verifyUser] deleteUserLogin error:", err);
    return { status: "error" };
  }
}


// --- Exported Netlify handler ---
async function handler(event) {
  console.log("[verifyUser] handler called. Event body:", event.body);
  if (event.httpMethod !== "POST") {
    console.log("[verifyUser] Method not allowed:", event.httpMethod);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, email, userName, password, session_token } = JSON.parse(event.body || "{}");
    console.log("[verifyUser] Parsed action:", action);
    let result = null;
    switch (action) {
      case "checkIsPermittedUser":
        const check = await checkIsPermittedUser(email);
        console.log("[verifyUser] checkIsPermittedUser result:", check);
        return { statusCode: 200, body: JSON.stringify({ success: check }) };

      case "addUserLogin":
        result = await addUserLogin(email, userName, password);
        console.log("[verifyUser] addUserLogin result:", result);
        return { statusCode: 200, body: JSON.stringify(result) };

      case "getLogin_SessionToken":
        result = await getLogin_SessionToken(userName, password);
        console.log("[verifyUser] getLogin_SessionToken result:", result);
        return { statusCode: 200, body: JSON.stringify(result) };

      case "deleteUserLogin":
        result = await deleteUserLogin(email);
        console.log("[verifyUser] deleteUserLogin result:", result);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "check_SessionToken":
        result = await check_SessionToken(session_token);
        console.log("[verifyUser] check_SessionToken result:", result);
        return { statusCode: 200, body: JSON.stringify(result) };

      default:
        console.log("[verifyUser] Invalid action:", action);
        return { statusCode: 400, body: JSON.stringify({ status: "error", error: "Invalid action" }) };
    }
  } catch (err) {
    console.error("[verifyUser] handler exception:", err);
    return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
  }
}

exports.handler = handler;
exports.checkIsPermittedUser = checkIsPermittedUser;
exports.addUserLogin = addUserLogin;
exports.getLogin_SessionToken = getLogin_SessionToken;
exports.deleteUserLogin = deleteUserLogin;
