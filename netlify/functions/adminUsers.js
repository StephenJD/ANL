// /netlify/functions/adminUsers.js
require('dotenv').config();
const { getSecureItem, setSecureItem } = require("./multiSecureStore"); 
const { generateSecureToken } = require("./generateSecureToken");

const BIN_KEY = process.env.USER_ACCESS_BIN;
const TTL_MS = 30 * 60 * 1000; // 30 min for session validation

exports.handler = async (event) => {
  try {
    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch(e) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
    }
console.log("adminUsers Request body:", body);

    const sessionKey = event.headers["x-admin-token"];
    if (!sessionKey) return { statusCode: 401, body: JSON.stringify({ success: false, error: "Missing session key" }) };
console.log("Incoming sessionKey:", sessionKey);
    // Validate session
    const session = await getSecureItem(BIN_KEY, sessionKey);
    if (!session) return { statusCode: 401, body: JSON.stringify({ success: false, error: "Invalid or expired session" }) };
console.log("Session fetched from store:", session);
    const { action, username, role, metadata = {} } = body;

    // Fetch current admin users
    let usersEntry = await getSecureItem(BIN_KEY, "record");
    if (!usersEntry) usersEntry = { record: {} };
    const users = usersEntry.record;

    switch(action) {
      case "list":
        return { statusCode: 200, body: JSON.stringify({ success: true, users }) };

      case "add":
        if (!username || !role) return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing username or role" }) };
        users[username] = { role, metadata };
        await setSecureItem(BIN_KEY, "record", { record: users });
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case "edit":
        if (!username || !users[username]) return { statusCode: 400, body: JSON.stringify({ success: false, error: "User not found" }) };
        users[username] = { role: role || users[username].role, metadata: metadata || users[username].metadata };
        await setSecureItem(BIN_KEY, "record", { record: users });
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      case "delete":
        if (!username || !users[username]) return { statusCode: 400, body: JSON.stringify({ success: false, error: "User not found" }) };
        delete users[username];
        await setSecureItem(BIN_KEY, "record", { record: users });
        return { statusCode: 200, body: JSON.stringify({ success: true }) };

      default:
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid action" }) };
    }

  } catch (err) {
    console.error("AdminUsers error:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
