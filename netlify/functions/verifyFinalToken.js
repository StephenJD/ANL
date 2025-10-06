// netlify/functions/verifyFinalToken.js
const { retrieveFinalForm } = require("./tempStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body);
    const stored = retrieveFinalForm(token);

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: !!stored }),
    };
  } catch (err) {
    console.error("verifyFinalToken error:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};
