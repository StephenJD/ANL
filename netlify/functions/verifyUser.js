// /netlify/functions/verifyUser.js
import 'dotenv/config';

// --- Import local modules as ESM ---
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";
import { generateUserToken, generateTempAccessToken } from "./generateSecureToken.js";
import { check_userLoginToken as _authCheck, requireAuth } from "./authHelper.js";

// --- Bin keys from .env ---
const USER_ACCESS_BIN = process.env.USER_ACCESS_BIN;
const ACCESS_TOKEN_BIN = process.env.ACCESS_TOKEN_BIN;
const PERMITTED_USERS_KEY = process.env.PERMITTED_USERS_KEY;
const ADMIN_SUPERUSER_HASH = process.env.ADMIN_SUPERUSER_HASH;
const USER_ACCESS_TIMEOUT_mS = process.env.USER_ACCESS_TIMEOUT_HRS * 60 * 60 * 1000;
const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 40;
const authAttemptCache = new Map();

function getClientKey(event) {
  const forwarded = String(event?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const nfIp = String(event?.headers?.["x-nf-client-connection-ip"] || "").trim();
  const ip = forwarded || nfIp || "unknown";
  const ua = String(event?.headers?.["user-agent"] || "unknown").slice(0, 120);
  return `${ip}|${ua}`;
}

function isRateLimited(event, action) {
  const now = Date.now();
  const key = `${action}|${getClientKey(event)}`;
  let bucket = authAttemptCache.get(key);
  if (!bucket || now - bucket.startedAt > AUTH_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
  }
  bucket.count += 1;
  authAttemptCache.set(key, bucket);
  return bucket.count > AUTH_MAX_ATTEMPTS;
}

// --- 1) Check if email is in permitted_users ---
export async function checkIsPermittedUser(email) {
  try {
    //console.log("[verifyUser] checkIsPermittedUser:", email); 
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const permitted = permittedUsers.some(u => u.Email.toLowerCase() === email.toLowerCase());
    if (permitted) return permitted;
    else {
      console.log("[verifyUser] checkIsPermittedUser: False for request");
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
    if (!userEntry) return { status: "failed" };

    const loginToken = generateUserToken(userName, password);
    userEntry.login_token = loginToken;
    userEntry["User name"] = userName;
    await setSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY, permittedUsers);
    return { status: "success", loginToken, role: userEntry["Role"] };
  } catch (err) {
    console.error("[verifyUser] addUserLogin error:", err);
    return { status: "error" };
  }
}

// --- 3) Get a userlogin token  ---
export async function get_UserLoginToken(userName, password, deviceId = null, userAgent = null) {
  try {
    console.log("[verifyUser] get_UserLoginToken:", userName); 
    const loginToken = generateUserToken(userName, password);
    const usersArray = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];

    let currentUser = usersArray.find(u => u.login_token === loginToken);
    if (!currentUser) {
	currentUser = usersArray.find(u => u["User name"] === userName);
      if (currentUser) {
        if (currentUser.login_token) {
		console.log("[verifyUser] get_UserLoginToken invalid login_token for:", userName );
    return { status: "invalid_credentials" };
        } else {
		console.log("[verifyUser] get_UserLoginToken No login_token for:", userName );
    return { status: "invalid_credentials" };
	  }
	} else {
		console.log("[verifyUser] get_UserLoginToken Not Registered:", userName );	
    return { status: "invalid_credentials" };
	}
    }

    const userLoginToken = generateTempAccessToken(loginToken);
    await setSecureItem(
      ACCESS_TOKEN_BIN,
      userLoginToken,
      {
        user_name: currentUser["User name"],
        role: currentUser["Role"],
        deviceId: deviceId || null,
        userAgent: userAgent || null
      },
      USER_ACCESS_TIMEOUT_mS
    );

    return { status: "success", userLoginToken, role: currentUser["Role"] };
  } catch (err) {
    console.error("[verifyUser] get_UserLoginToken error:", err);
    return { status: "error" };
  }
}

// --- 4) Check userLogin token is valid ---
// Delegates to authHelper which enforces exact role match, device binding, and caching.
export async function check_userLoginToken(userLogin_token, deviceId = null, userAgent = null) {
  return _authCheck(userLogin_token, deviceId, userAgent);
}

// --- 5) Delete a user login ---
export async function deleteUserLogin(email) {
  try {
    const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
    const userEntry = permittedUsers.find(u => u.Email.toLowerCase() === email.toLowerCase());
    if (!userEntry) return { status: "Not found" };

    userEntry.login_token = null;
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
    const { action, email, userName, password, userLogin_token, deviceId } = JSON.parse(event.body || "{}");
    const userAgent = (event.headers?.["user-agent"] || "").trim() || null;
    let result;

    const rateLimitedActions = new Set(["checkIsPermittedUser", "addUserLogin", "get_UserLoginToken", "check_userLoginToken"]);
    if (rateLimitedActions.has(action) && isRateLimited(event, action)) {
      return { statusCode: 429, body: JSON.stringify({ status: "error", error: "Too many requests" }) };
    }

    switch (action) {
      case "checkIsPermittedUser":
        result = await checkIsPermittedUser(email);
        // Enumeration-resistant: never reveal if an email exists.
        return { statusCode: 200, body: JSON.stringify({ success: true }) };
      case "addUserLogin":
        result = await addUserLogin(email, userName, password);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "get_UserLoginToken":
        result = await get_UserLoginToken(userName, password, deviceId || null, userAgent);
        return { statusCode: 200, body: JSON.stringify(result) };
      case "deleteUserLogin": {
        // Requires authentication — only the account owner or an admin may call this
        const auth = await requireAuth(event, []);
        if (auth.unauthorized) return auth.response;
        // Non-admins may only delete their own login
        if (auth.user.role !== "admin" && auth.user.userName.toLowerCase() !== (userName || "").toLowerCase()) {
          return { statusCode: 403, body: JSON.stringify({ status: "error", error: "Forbidden" }) };
        }
        result = await deleteUserLogin(email);
        return { statusCode: 200, body: JSON.stringify(result) };
      }
      case "check_userLoginToken":
        result = await check_userLoginToken(userLogin_token, deviceId || null, userAgent);
        return { statusCode: 200, body: JSON.stringify(result) };
      default:
        return { statusCode: 400, body: JSON.stringify({ status: "error", error: "Invalid action" }) };
    }
  } catch (err) {
    console.error("[verifyUser] handler exception:", err);
    return { statusCode: 500, body: JSON.stringify({ status: "error", error: err.message }) };
  }
}
