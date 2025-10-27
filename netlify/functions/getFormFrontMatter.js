// /.netlify/functions/getFormFrontMatter.js
const fetch = require("node-fetch");

async function getFormFrontMatter({ formPath, baseURL }) {
  if (!formPath) throw new Error("Missing formPath");
  if (!baseURL) throw new Error("Missing baseURL");

  const url = `${baseURL}/${formPath}/form_metadata.json`;

  let raw;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    raw = await res.text();
  } catch (err) {
    throw new Error(`Cannot fetch form metadata from ${url}: ${err.message}`);
  }

  let metadata;
  try {
    metadata = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in form metadata for path: ${formPath}`);
  }

  let validation;
  if (Array.isArray(metadata.validation)) {
    validation = metadata.validation.map(String).filter(Boolean);
  } else if (typeof metadata.validation === "string") {
    validation = metadata.validation.split(/[\s,;|]+/).map(s => s.trim()).filter(Boolean);
  } else {
    validation = ["none"];
  }

  return {
    validation,
    title: metadata.title,
    path: metadata.path,
    restrict_users: metadata.restrict_users || false,
    include_unselected_options: metadata.include_unselected_options || false,
    summary: metadata.summary || "",
    last_reviewed: metadata.last_reviewed || "",
    review_period: metadata.review_period || "",
    reviewed_by: metadata.reviewed_by || "",
    type: metadata.type || "form"
  };
}

async function handler(event) {
  console.log("[DEBUG] event.body:", event.body);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formPath } = JSON.parse(event.body || "{}");
    const baseURL = process.env.SITE_URL || "https://ascendnextlevel.org.uk"; // set environment variable for deploy
    console.log("[DEBUG] formPath received:", formPath);

    const result = await getFormFrontMatter({ formPath, baseURL });
    console.log("[DEBUG] metadata result:", result);

    return { statusCode: 200, body: JSON.stringify({ success: true, ...result }) };
  } catch (err) {
    console.error("[ERROR] getFormFrontMatter exception:", err.stack);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
}

exports.getFormFrontMatter = getFormFrontMatter;
exports.handler = handler;
