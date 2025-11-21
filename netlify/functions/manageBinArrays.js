// /netlify/functions/manageBinArrays.js
import { config as dotenvConfig } from "dotenv";
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";
import { getFormRecord } from "./getRecordFromForm.js";

import 'dotenv/config';

const USER_ACCESS_BIN_KEY = process.env.USER_ACCESS_BIN;

function replyMsg(statusCode, payload) {
  if (statusCode === 200) {
    payload.success = true;
  } else {
    payload = { success: false, error: payload };
  }

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };
}

function similarBy70pc(a, b) {
  a = a.replace(/[^A-Za-z]/g, '').toLowerCase();
  b = b.replace(/[^A-Za-z]/g, '').toLowerCase();

  const m = a.length, n = b.length;
  const dp = Array(m+1).fill().map(()=>Array(n+1).fill(0));

  for (let i=1;i<=m;i++) {
    for (let j=1;j<=n;j++) {
      if (a[i-1] === b[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }

  const lcs = dp[m][n];
  const denom = Math.max(m, n);
  return denom > 0 && (lcs / denom) >= 0.70;
}

function replaceTopKey(obj, section_key) {
  const top = Object.keys(obj)[0];
  if (similarBy70pc(section_key, top)) {
    const topValue = obj[top];

    // If the top value is an array, merge its entries into a single object
    if (Array.isArray(topValue)) {
      const merged = {};
      topValue.forEach(item => {
        if (typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(merged, item);
        }
      });
      return merged;
    }

    // If top value is already an object, just return it
    if (typeof topValue === 'object') return topValue;
  }
  return obj;
}


export async function handler(event) {

  if (event.httpMethod !== "POST") {
    return replyMsg(405, "Method Not Allowed");
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
    //console.log("[manageBinArrays] Parsed body:", body);
  } catch (e) {
    return replyMsg(400, "Invalid JSON");
  }
  //console.log("[manageBinArrays] handler body:", body);

  const { action, bin_id, section_key, keyValue } = body;
  if (!section_key) return replyMsg(400, "Missing section_key"); 
  const BIN_KEY = process.env[bin_id];
  let dataArray = await getSecureItem(BIN_KEY, section_key);
  if (!Array.isArray(dataArray)) dataArray = [];

  const firstField = dataArray[0] ? Object.keys(dataArray[0])[0] : null;

  switch (action) {
    case "list":
      return replyMsg(200, { records: dataArray });
    case "add":
    case "edit":
      if (!body.formHtml || typeof body.formHtml !== "string") {
        return replyMsg(400, "Missing formHtml");
      }
	
      console.log("[manageBinArrays] Action:",action, "firstField", firstField, "keyValue", keyValue);
      let record;
     
      try {
        record = getFormRecord(body.formHtml);
        if (!record || typeof record !== "object") {
        return replyMsg(500, "Failed to get record from Form");
      }
      } catch (e) {
        return replyMsg(500, "Failed calling getFormRecord()");
      }
      console.log("[manageBinArrays] getFormRecord:", record);
	
      const keys = Object.keys(record);
      record = replaceTopKey(record, section_key);
      console.log("[manageBinArrays] reKey FormRecord:", record);

      if (action === "add") {
        dataArray.push(record);
      } else { // edit
        if (!firstField) return replyMsg(400, "No records to edit");
	  console.log("[manageBinArrays] section_key:", section_key,  );
	  console.log("[manageBinArrays] dataArray keys:", firstField );
	  dataArray.forEach(r => console.log(r[firstField]));
        const editIdx = dataArray.findIndex(r => r[firstField] === keyValue);
        if (editIdx === -1) return replyMsg(404, "Edit Record not found");
        dataArray[editIdx] = record;   
      }
      await setSecureItem(BIN_KEY, section_key, dataArray);
      return replyMsg(200, {});

    case "delete":
      if (!firstField) return replyMsg(400, "No records to delete");
      if (!keyValue) return replyMsg(400, "Missing delete keyValue");
      const deleteIdx = dataArray.findIndex(r => r[firstField] === keyValue);
      if (deleteIdx === -1) return replyMsg(404, "Delete record not found");
      dataArray.splice(deleteIdx, 1);
      await setSecureItem(BIN_KEY, section_key, dataArray);
      return replyMsg(200, {});

    default:
      return replyMsg(400, "Invalid action");
  }
}