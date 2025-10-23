// /netlify/functions/verifyUser.js
require("dotenv").config();
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
      console.log("[verifyUser] User not permitted");
      return { status: "Not permitted" };
    }

    const loginToken = generateUserToken(userName, password);
    userEntry.login_token = loginToken;

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
  console.log("[verifyUser] getLogin_SessionToken: userName =", userName);
  try {
    const loginToken = generateUserToken(userName, password);
    console.log("[verifyUser] Generated loginToken:", loginToken);

    // Check permitted users
    const usersArray = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    console.log("[verifyUser] Users array:", usersArray);
    let currentUser = usersArray.find(u => u.login_token === loginToken);

    // Check superuser
    if (!currentUser && loginToken === ADMIN_SUPERUSER_HASH) {
      currentUser = { role: "SuperUser", userName: userName, email: userName }; // UN is email
      console.log("[verifyUser] SuperUser login");
    }

    if (!currentUser) {
      console.log("[verifyUser] Login not permitted");
      return { status: "Not permitted" };
    }

    // Generate temporary session key
    const sessionKey = generateTempAccessToken(loginToken);
    await setSecureItem(
      ACCESS_TOKEN_BIN,
      sessionKey,
      { userName: currentUser.userName, role: currentUser.role },
      30 * 60 * 1000
    );
    console.log("[verifyUser] Session key generated:", sessionKey);

    return { status: "success", sessionKey, role: currentUser.role };
  } catch (err) {
    console.error("[verifyUser] getLogin_SessionToken error:", err);
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
    const { action, email, userName, password } = JSON.parse(event.body || "{}");
    console.log("[verifyUser] Parsed action:", action);

    switch (action) {
      case "checkIsPermittedUser":
        const check = await checkIsPermittedUser(email);
        console.log("[verifyUser] checkIsPermittedUser result:", check);
        return { statusCode: 200, body: JSON.stringify({ success: check }) };

      case "addUserLogin":
        const addResult = await addUserLogin(email, userName, password);
        console.log("[verifyUser] addUserLogin result:", addResult);
        return { statusCode: 200, body: JSON.stringify(addResult) };

      case "getLogin_SessionToken":
        const sessionResult = await getLogin_SessionToken(userName, password);
        console.log("[verifyUser] getLogin_SessionToken result:", sessionResult);
        return { statusCode: 200, body: JSON.stringify(sessionResult) };

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
