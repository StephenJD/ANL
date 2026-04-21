// netlify/functions/testJsonbin.js
export async function handler(event) {
  const BIN_KEY = process.env.USER_ACCESS_KEY;
  const API_KEY = process.env.JSONBIN_API_KEY;
  const url = `https://api.jsonbin.io/v3/b/${BIN_KEY}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY,
      },
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      body: JSON.stringify({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        text,
        url,
        apiKey: API_KEY ? API_KEY.slice(0, 6) + "..." : null // Only log prefix for safety
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, url, apiKey: API_KEY ? API_KEY.slice(0, 6) + "..." : null }),
    };
  }
}
