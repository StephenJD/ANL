// /.netlify/functions/secureStore_ClientAccess.js
// Read-only public endpoint: clients may verify a form-access token they hold.
// Write access has been removed — only server-side functions may write tokens.
// Only ACCESS_TOKEN_BIN is exposed; USER_ACCESS_BIN is never accessible here.
import { getSecureItem } from "./multiSecureStore.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: "Method Not Allowed" }) };
  }

  try {
    const { token, formPath } = JSON.parse(event.body || "{}");

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: "Missing token" }),
      };
    }

    // Only ACCESS_TOKEN_BIN is allowed — never expose USER_ACCESS_BIN to clients
    const BIN_ID = process.env.ACCESS_TOKEN_BIN;

    const record = await getSecureItem(BIN_ID, token);
    if (!record) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: "Not found" }) };
    }

    if (formPath) {
      const tokenFormPath = String(record?.formPath || "").replace(/\/+$/, "");
      const requestFormPath = String(formPath || "").replace(/\/+$/, "");
      if (tokenFormPath && tokenFormPath !== requestFormPath) {
        return { statusCode: 403, body: JSON.stringify({ success: false, error: "Token not valid for this form" }) };
      }
    }

    // Return only the fields the client legitimately needs (email / formPath).
    // Never return role, deviceId, or internal fields.
    const { email, formPath: recordFormPath, formName } = record;
    return { statusCode: 200, body: JSON.stringify({ valid: true, email, formPath: recordFormPath, formName }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
}
