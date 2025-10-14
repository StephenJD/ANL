// /.netlify/functions/getFormFrontMatter.js
// - Returns front-matter metadata for any Hugo-generated form JSON

const fs = require("fs").promises;
const path = require("path");

async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  const metadataFile = path.join(process.cwd(), "public", formPath, "form_metadata.json");


  let raw;
  try {
    raw = await fs.readFile(metadataFile, "utf-8");
  } catch (err) {
    console.error(`[ERROR] Cannot read form_metadata.json at ${metadataFile}:`, err.message);
    throw new Error(`Form metadata not found for path: ${formPath}`);
  }

  let metadata;
  try {
    metadata = JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] Invalid JSON in ${metadataFile}:`, err.message);
    throw new Error(`Invalid JSON in form metadata for path: ${formPath}`);
  }

  let validation;
  if (Array.isArray(metadata.validation)) {
    validation = metadata.validation.map(String).filter(Boolean);
  } else if (typeof metadata.validation === "string") {
    validation = metadata.validation
      .split(/[\s,;|]+/)
      .map(s => s.trim())
      .filter(Boolean);
  } else {
    validation = ["none"];
  }

  console.debug("[DEBUG] Loaded metadata:", metadata);
  console.debug("[DEBUG] Parsed validation:", validation);

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
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formPath } = JSON.parse(event.body || "{}");
    const result = await getFormFrontMatter({ formPath });
    return { statusCode: 200, body: JSON.stringify({ success: true, ...result }) };
  } catch (err) {
    console.error("[ERROR] getFormFrontMatter exception:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message || "Server error" })
    };
  }
}

exports.handler = handler;
