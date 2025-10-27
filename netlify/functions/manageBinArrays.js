// /netlify/functions/manageBinArrays.js
const isLocal = !process.env.SMTP_HOST;

if (isLocal) {
  try {
    require('dotenv').config();
    console.log("[verifyUser] Loaded .env locally");
  } catch (err) {
    console.warn("[verifyUser] dotenv not available in production");
  }
}
const { getSecureItem, setSecureItem } = require("./multiSecureStore");

const USER_ACCESS_BIN_KEY = process.env.USER_ACCESS_BIN;

exports.handler = async (event) => {
  console.log("=== manageBinArrays (first-field index) START ===");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: "Method Not Allowed" }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
    console.log("[DEBUG] Parsed body:", body);
  } catch (e) {
    console.error("[ERROR] Invalid JSON body:", e);
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Invalid JSON" }),
    };
  }

  const { action, section_key, record, keyValue } = body;
  if (!section_key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, error: "Missing section_key" }),
    };
  }

  let dataArray = await getSecureItem(USER_ACCESS_BIN_KEY, section_key);
  if (!Array.isArray(dataArray)) dataArray = [];

  const firstField = dataArray[0] ? Object.keys(dataArray[0])[0] : null;

  switch (action) {
    case "list":
      return { statusCode: 200, body: JSON.stringify({ success: true, records: dataArray }) };

    case "add":
      if (!record || typeof record !== "object") {
        return {
          statusCode: 400,
          body: JSON.stringify({ success: false, error: "Missing or invalid record" }),
        };
      }
      dataArray.push(record);
      await setSecureItem(USER_ACCESS_BIN_KEY, section_key, dataArray);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    case "edit":
      if (!firstField) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "No records to edit" }) };
      }
      if (!keyValue || !record) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing keyValue or record" }) };
      }
      const editIdx = dataArray.findIndex(r => r[firstField] === keyValue);
      if (editIdx === -1) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Record not found" }) };
      dataArray[editIdx] = record;
      await setSecureItem(USER_ACCESS_BIN_KEY, section_key, dataArray);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    case "delete":
      if (!firstField) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "No records to delete" }) };
      }
      if (!keyValue) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing keyValue" }) };
      }
      const deleteIdx = dataArray.findIndex(r => r[firstField] === keyValue);
      if (deleteIdx === -1) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Record not found" }) };
      dataArray.splice(deleteIdx, 1);
      await setSecureItem(USER_ACCESS_BIN_KEY, section_key, dataArray);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    default:
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid action" }) };
  }
};
