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
    //console.log("[verifyUser] checkIsPermittedUser:", email); 
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const permitted = permittedUsers.some(u => u.Email.toLowerCase() === email.toLowerCase());
    if (permitted) return permitted;
    else {
      console.log("[verifyUser] checkIsPermittedUser: False:", email, permittedUsers); 
      return false;
    }
  } catch (err) {
    console.error("[verifyUser] checkIsPermittedUser error:", err);
    return false;
  }
}

// --- 2) Add a user login if permitted ---
export async function addUserLogin(email, userName, password) {
  try {
    //console.log("[verifyUser] addUserLogin:", email, userName, password); 
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const userEntry = permittedUsers.find(u => u.Email.toLowerCase() === email.toLowerCase());
    if (!userEntry) return { status: "Not permitted" };

    const loginToken = generateUserToken(userName, password);
    userEntry.login_token = loginToken;
    userEntry["User Name"] = userName;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    return { status: "success", loginToken, role: userEntry["Role"] };
  } catch (err) {
    console.error("[verifyUser] addUserLogin error:", err);
    return { status: "error" };
  }
}

// --- 3) Get a userlogin token  ---
export async function get_UserLoginToken(userName, password) {
  try {
    console.log("[verifyUser] get_UserLoginToken:", userName); 
    const loginToken = generateUserToken(userName, password);
    const usersArray = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];

    let currentUser = usersArray.find(u => u.login_token === loginToken);
    if (!currentUser) {
	currentUser = usersArray.find(u => u["User name"] === userName);
      if (currentUser) {	
		console.log("[verifyUser] get_UserLoginToken invalid login_token for:", userName, loginToken, usersArray );
		return { status: "Invalid login_token" };
	} else {
		console.log("[verifyUser] get_UserLoginToken Not Registered:", userName, usersArray );	
		return { status: "Not Registered" };
	}
    }

    const userLoginToken = generateTempAccessToken(loginToken);
    await setSecureItem(
      ACCESS_TOKEN_BIN,
      userLoginToken,
      { user_name: currentUser["User name"], role: currentUser["Role"] },
      30 * 60 * 1000
    );

    return { status: "success", userLoginToken, role: currentUser["Role"] };
  } catch (err) {
    console.error("[verifyUser] get_UserLoginToken error:", err);
    return { status: "error" };
  }
}

// --- 4) Check userLogin token is valid ---
export async function check_userLoginToken(userLogin_token) {
  try {
    const entry = await getSecureItem(ACCESS_TOKEN_BIN, userLogin_token);
    if (!entry) return { status: "Not found" };

    if (entry.expires > Date.now()) {
      return { status: "success", entry };
    } else {
      return { status: "expired" };
    }
  } catch (err) {
    console.error("[verifyUser] check_userLoginToken error:", err);
    return { status: "error" };
  }
}

// --- 5) Delete a user login ---
export async function deleteUserLogin(email) {
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const userEntry = permittedUsers.find(u => u.Email.toLowerCase() === email.toLowerCase());
    if (!userEntry) return { status: "Not found" };

    userEntry.login_token = null;
    userEntry["User Name"] = null;
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
    const { action, email, userName, password, userLogin_token } = JSON.parse(event.body || "{}");
    let result;

    switch (action) {
      case "checkIsPermittedUser":
        result = await checkIsPermittedUser(email);
        return { statusCode: 200, body: JSON.stringify({ success: result }) };
      case "addUserLogin":
        result = await addUserLogin(email, userName, password);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "get_UserLoginToken":
        result = await get_UserLoginToken(userName, password);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "deleteUserLogin":
        result = await deleteUserLogin(email);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "check_userLoginToken":
        result = await check_userLoginToken(userLogin_token);
        return { statusCode: 200, body: JSON.stringify(result) };
      default:
        return { statusCode: 400, body: JSON.stringify({ status: "error", error: "Invalid action" }) };
    }
  } catch (err) {
    console.error("[verifyUser] handler exception:", err);
    return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
  }
}
