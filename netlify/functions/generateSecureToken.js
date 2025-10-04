// netlify/functions/generateSecureToken.js
import crypto from "crypto";

export function generateSecureToken(email) {
  const secret = process.env.TOKEN_SECRET || "supersecret";
  const today = new Date().toISOString().split("T")[0];
  return crypto.createHmac("sha256", secret).update(email + today).digest("hex");
}

