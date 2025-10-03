import crypto from "crypto";

export async function handler(event) {
  try {
    const { token, email } = JSON.parse(event.body);
    if (!token || !email) {
      return { statusCode: 400, body: JSON.stringify({ valid: false }) };
    }

    const today = new Date().toISOString().split("T")[0]; 
    const secret = process.env.TOKEN_SECRET || "supersecret";

    const expected = crypto
      .createHmac("sha256", secret)
      .update(email + today)
      .digest("hex");

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: token === expected }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
}
