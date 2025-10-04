// netlify/functions/verifyFormAccessToken.js
import { generateSecureToken } from "./generateSecureToken"; // correct relative path

export async function handler(event) {
  try {
    const { token, email } = JSON.parse(event.body);
    if (!token || !email) {
      console.log("Missing token or email");
      return { statusCode: 400, body: JSON.stringify({ valid: false }) };
    }

    const expected = generateSecureToken(email);
    const valid = token === expected;
    console.log(`verifyToken: token=${token}, expected=${expected}, valid=${valid}`);

    return { statusCode: 200, body: JSON.stringify({ valid }) };
  } catch (err) {
    console.error("verifyToken error:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};
