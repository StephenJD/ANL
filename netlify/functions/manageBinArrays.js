// /netlify/functions/manageBinArrays.js
import { config as dotenvConfig } from "dotenv";
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";
import { getFormRecord } from "./getRecordFromForm.js";

import 'dotenv/config';

const USER_ACCESS_BIN_KEY = process.env.USER_ACCESS_BIN;

export async function handler(event) {

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ success: false, error: "Method Not Allowed" }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
    //console.log("[manageBinArrays] Parsed body:", body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid JSON" }) };
  }

  const { action, bin_id, section_key, keyValue } = body;
  if (!section_key) return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing section_key" }) };

  const BIN_KEY = process.env[bin_id];
  let dataArray = await getSecureItem(BIN_KEY, section_key);
  if (!Array.isArray(dataArray)) dataArray = [];

  const firstField = dataArray[0] ? Object.keys(dataArray[0])[0] : null;

  switch (action) {
    case "list":
      return { statusCode: 200, body: JSON.stringify({ success: true, records: dataArray }) };

    case "add":
    case "edit":
      if (!body.formHtml || typeof body.formHtml !== "string") {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing formHtml" }) };
      }
      let record;
      try {
        record = getFormRecord(body.formHtml);
      } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: "Failed to extract record" }) };
      }

      if (action === "add") {
        dataArray.push(record);
      } else {
        if (!firstField) return { statusCode: 400, body: JSON.stringify({ success: false, error: "No records to edit" }) };
        const editIdx = dataArray.findIndex(r => r[firstField] === keyValue);
        if (editIdx === -1) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Record not found" }) };
        dataArray[editIdx] = record;   
      }
      await setSecureItem(BIN_KEY, section_key, dataArray);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    case "delete":
      if (!firstField) return { statusCode: 400, body: JSON.stringify({ success: false, error: "No records to delete" }) };
      if (!keyValue) return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing keyValue" }) };
      const deleteIdx = dataArray.findIndex(r => r[firstField] === keyValue);
      if (deleteIdx === -1) return { statusCode: 404, body: JSON.stringify({ success: false, error: "Record not found" }) };
      dataArray.splice(deleteIdx, 1);
      await setSecureItem(BIN_KEY, section_key, dataArray);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };

    default:
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Invalid action" }) };
  }
}