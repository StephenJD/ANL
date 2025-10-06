// netlify/functions/sendFormattedForm.js (DEBUG VERSION)
console.log("sendFormattedForm file loaded"); // Top-level log

let nodemailer, verifySecureToken;

try {
  nodemailer = require("nodemailer");
  console.log("Nodemailer import succeeded");
} catch (err) {
  console.error("Failed to import nodemailer:", err);
}

try {
  verifySecureToken = require("./verifySecureToken");
  console.log("verifySecureToken import succeeded");
} catch (err) {
  console.error("Failed to import verifySecureToken:", err);
}

exports.handler = async (event) => {
  console.log("sendFormattedForm handler invoked");
  console.log("HTTP method:", event.httpMethod);
  console.log("Raw event.body:", event.body);

  // Minimal check to see if imports work
  if (!verifySecureToken) {
    console.error("verifySecureToken not available");
    return { statusCode: 500, body: "verifySecureToken missing" };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true, msg: "Handler ran" }) };
};
