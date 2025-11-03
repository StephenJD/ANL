// /.netlify/functions/generateSecureToken.js
import crypto from "crypto";

export function generateTempAccessToken(request_origin) {
  const secret = process.env.TOKEN_SECRET;
  const today = Date.now();
  return crypto
    .createHmac("sha256", secret)
    .update(request_origin + "|" + today)
    .digest("hex");
}

export function generateUserToken(userName, password) {
  const secret = process.env.TOKEN_SECRET;
  return crypto
    .createHmac("sha256", secret)
    .update(userName + "|" + password)
    .digest("hex");
}
