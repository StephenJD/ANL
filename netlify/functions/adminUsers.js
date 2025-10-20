// /netlify/functions/adminUsers.js
require('dotenv').config();
const { getSecureItem, setSecureItem } = require("./multiSecureStore"); 

function urlize(str) {
  return str.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "");
}

const ACCESS_TOKEN_BIN_KEY = process.env.ACCESS_TOKEN_BIN;
const USER_ACCESS_BIN_KEY = process.env.USER_ACCESS_BIN;

exports.handler = async (event) => {
  console.log("=== ADMIN USERS FUNCTION START ===");
  console.log("Event received:", {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    body: event.body
  });

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
      console.log("[DEBUG] Parsed body:", body);
    } catch(e) {
      console.error("[ERROR] Invalid JSON body:", e);
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
    }

    const sessionKey = event.headers["x-admin-token"];
    console.log("[DEBUG] Session key:", sessionKey);

    if (!sessionKey) {
      console.error("[ERROR] Missing session key");
      return { statusCode: 401, body: JSON.stringify({ success: false, error: "Missing session key" }) };
    }

    console.log("[DEBUG] ACCESS_TOKEN_BIN_KEY:", ACCESS_TOKEN_BIN_KEY);
    const session = await getSecureItem(ACCESS_TOKEN_BIN_KEY, sessionKey);
    console.log("[DEBUG] Retrieved session:", session);

    if (!session) {
      console.error("[ERROR] Invalid or expired session");
      return { statusCode: 401, body: JSON.stringify({ success: false, error: "Invalid or expired session" }) };
    }

    const { action, username, role, email, formTitle } = body;
    console.log("[DEBUG] Action:", action);
    console.log("[DEBUG] Params:", { username, role, email, formTitle });

    if (!formTitle) {
      console.error("[ERROR] Missing formTitle");
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formTitle" }) };
    }

    const FORM_KEY = urlize(formTitle);
    console.log("[DEBUG] Computed FORM_KEY:", FORM_KEY);
    console.log("[DEBUG] USER_ACCESS_BIN_KEY:", USER_ACCESS_BIN_KEY);

    // Fetch current users for this form
    let usersArray = await getSecureItem(USER_ACCESS_BIN_KEY, FORM_KEY);
    console.log("[DEBUG] Raw usersArray from store:", usersArray);

    if (!Array.isArray(usersArray)) {
      console.warn("[WARN] usersArray was not an array. Resetting to []. Type:", typeof usersArray);
      usersArray = [];
    }

    switch(action) {
      case "list":
        console.log("[ACTION] list");
        return { statusCode: 200, body: JSON.stringify({ success: true, users: usersArray }) };

      case "add":
        console.log("[ACTION] add");
        if (!username || !role || !email) {
          console.error("[ERROR] Missing fields on add:", { username, role, email });
          return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing fields" }) };
        }
        usersArray.push({ username, role, email });
        console.log("[DEBUG] usersArray after add:", usersArray);
        await setSecureItem(USER_ACCESS_BIN_KEY, FORM_KEY, usersArray);
        console.log("[DEBUG] Successfully saved updated usersArray to store");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case "edit":
        console.log("[ACTION] edit");
        if (!username) {
          console.error("[ERROR] Missing username for edit");
          return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing username" }) };
        }
        const idx = usersArray.findIndex(u => u.username === username);
        console.log("[DEBUG] Edit index:", idx);
        if (idx === -1) {
          console.error("[ERROR] User not found:", username);
          return { statusCode: 400, body: JSON.stringify({ success: false, error: "User not found" }) };
        }
        if (role) usersArray[idx].role = role;
        if (email) usersArray[idx].email = email;
        console.log("[DEBUG] usersArray after edit:", usersArray);
        await setSecureItem(USER_ACCESS_BIN_KEY, FORM_KEY, usersArray);
        console.log("[DEBUG] Successfully saved updated usersArray to store");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case "delete":
        console.log("[ACTION] delete");
        if (!username) {
          console.error("[ERROR] Missing username for delete");
          return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing username" }) };
        }
        usersArray = usersArray.filter(u => u.username !== username);
        console.log("[DEBUG] usersArray after delete:", usersArray);
        await setSecureItem(USER_ACCESS_BIN_KEY, FORM_KEY, usersArray);
        console.log("[DEBUG] Successfully saved updated usersArray to store");
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      default:
        console.error("[ERROR] Invalid action:", action);
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid action" }) };
    }

  } catch (err) {
    console.error("AdminUsers error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  } finally {
    console.log("=== ADMIN USERS FUNCTION END ===");
  }
};
