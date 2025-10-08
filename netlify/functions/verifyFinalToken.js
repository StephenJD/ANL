// File location: /netlify/functions/verifyFinalToken.js
const { retrieveFinalForm } = require("./tokenStore");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { token } = JSON.parse(event.body);
    const storedForm = await retrieveFinalForm(token);  

    return {
      statusCode: 200,
      body: JSON.stringify({ valid: !!storedForm }),
    };
  } catch (err) {
    console.error("verifyFinalToken error:", err);
    return { statusCode: 500, body: JSON.stringify({ valid: false }) };
  }
};

