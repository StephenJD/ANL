// /netlify/functions/verifyUser.js
import 'dotenv/config';

// --- Import local modules as ESM ---
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";
import { generateUserToken, generateTempAccessToken } from "./generateSecureToken.js";

// --- Bin keys from .env ---
const USER_ACCESS_BIN = process.env.USER_ACCESS_BIN;
const ACCESS_TOKEN_BIN = process.env.ACCESS_TOKEN_BIN;
const PERMITTED_USERS_KEY = process.env.PERMITTED_USERS_KEY;
const ADMIN_SUPERUSER_HASH = process.env.ADMIN_SUPERUSER_HASH;

// --- 1) Check if email is in permitted_users ---
export async function checkIsPermittedUser(email) {
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    return permittedUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
  } catch (err) {
    console.error("[verifyUser] checkIsPermittedUser error:", err);
    return false;
  }
}

// --- 2) Add a user login if permitted ---
export async function addUserLogin(email, userName, password) {
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const userEntry = permittedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userEntry) return { status: "Not permitted" };

    const loginToken = generateUserToken(userName, password);
    userEntry.login_token = loginToken;
    userEntry.user_name = userName;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    return { status: "success", loginToken, role: userEntry.role };
  } catch (err) {
    console.error("[verifyUser] addUserLogin error:", err);
    return { status: "error" };
  }
}

// --- 3) Get a session token for a login ---
export async function getLogin_SessionToken(userName, password) {
  try {
    const loginToken = generateUserToken(userName, password);
    const usersArray = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];

    const currentUser = usersArray.find(u => u.login_token === loginToken);
    if (!currentUser) return { status: "Not Registered" };

    const sessionToken = generateTempAccessToken(loginToken);
    await setSecureItem(
      ACCESS_TOKEN_BIN,
      sessionToken,
      { user_name: currentUser.user_name, role: currentUser.role },
      30 * 60 * 1000
    );

    return { status: "success", sessionToken, role: currentUser.role };
  } catch (err) {
    console.error("[verifyUser] getLogin_SessionToken error:", err);
    return { status: "error" };
  }
}

// --- 4) Check session token is valid ---
export async function check_SessionToken(session_token) {
  try {
    const entry = await getSecureItem(ACCESS_TOKEN_BIN, session_token);
    if (!entry) return { status: "Not found" };

    if (entry.expires > Date.now()) {
      return { status: "success", entry };
    } else {
      return { status: "expired" };
    }
  } catch (err) {
    console.error("[verifyUser] check_SessionToken error:", err);
    return { status: "error" };
  }
}

// --- 5) Delete a user login ---
export async function deleteUserLogin(email) {
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const userEntry = permittedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!userEntry) return { status: "Not found" };

    userEntry.login_token = null;
    userEntry.user_name = null;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    return { status: "success" };
  } catch (err) {
    console.error("[verifyUser] deleteUserLogin error:", err);
    return { status: "error" };
  }
}

// --- Exported Netlify handler ---
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { action, email, userName, password, session_token } = JSON.parse(event.body || "{}");
    let result;

    switch (action) {
      case "checkIsPermittedUser":
        result = await checkIsPermittedUser(email);
        return { statusCode: 200, body: JSON.stringify({ success: result }) };
      case "addUserLogin":
        result = await addUserLogin(email, userName, password);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "getLogin_SessionToken":
        result = await getLogin_SessionToken(userName, password);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "deleteUserLogin":
        result = await deleteUserLogin(email);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "check_SessionToken":
        result = await check_SessionToken(session_token);
        return { statusCode: 200, body: JSON.stringify(result) };
      default:
        return { statusCode: 400, body: JSON.stringify({ status: "error", error: "Invalid action" }) };
    }
  } catch (err) {
    console.error("[verifyUser] handler exception:", err);
    return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
  }
}
