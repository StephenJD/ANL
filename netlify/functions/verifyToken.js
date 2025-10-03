// netlify/functions/verifyToken.js
import crypto from "crypto";

export async function handler(event) {
  try {
    const { token, email } = JSON.parse(event.body);
    if (!token || !email) {
      console.log("Missing token or email");
      return { statusCode: 400, body: JSON.stringify({ valid: false }) };
    }

    const today = new Date().toISOString().split("T")[0]; 
    const secret = process.env.TOKEN_SECRET || "supersecret";

    const expected = crypto
      .createHmac("sha256", secret)
      .update(email + today)
      .digest("hex");

    const valid = token === expected;
    console.log(`verifyToken: token=${token}, expected=${expected}, valid=${valid}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ valid }),
    };
  } catch (err) {
    console.error("verifyToken error:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
}
