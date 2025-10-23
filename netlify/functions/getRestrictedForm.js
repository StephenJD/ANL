// /netlify/functions/getRestrictedForm.js
require('dotenv').config();
const { getSecureItem } = require("./multiSecureStore");
const { readFormMetadata } = require("./getFormMetadata");

async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formPath } = JSON.parse(event.body || "{}");
    const loginToken = event.headers["x-login-token"];
    if (!loginToken) return { statusCode: 401, body: "Unauthorized" };

    // Get list of all user logins
    const usersArray = await getSecureItem(process.env.USER_ACCESS_BIN_KEY, "user_logins");
    if (!Array.isArray(usersArray)) return { statusCode: 401, body: "Unauthorized" };

    const currentUser = usersArray.find(u => u.login_token === loginToken);
    if (!currentUser) {
      return { statusCode: 401, body: JSON.stringify({ success: false, error: "Unauthorized" }) };
    }

    // Get form metadata using shared helper
    const metadata = await readFormMetadata(formPath);

    // Enforce role restrictions
    if (metadata.restrict_users) {
      const requiredRole = metadata.restrict_users.toLowerCase();
      const userRole = (currentUser.role || "").toLowerCase();
      if (userRole !== requiredRole) {
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Forbidden: insufficient permissions" }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, metadata }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
};

exports.handler = handler;
