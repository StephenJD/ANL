// /.netlify/functions/getFormFrontMatter.js
const fs = require("fs").promises;
const path = require("path");

async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  const metadataFile = path.join(__dirname, "../../public", formPath, "form_metadata.json");
  let raw;
  try {
    raw = await fs.readFile(metadataFile, "utf-8");
  } catch (err) {
    throw new Error(`Cannot read form metadata: ${err.message}`);
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
    console.log("[DEBUG] formPath received:", formPath);

    const result = await getFormFrontMatter({ formPath });
    console.log("[DEBUG] metadata result:", result);

    return { statusCode: 200, body: JSON.stringify({ success: true, ...result }) };
  } catch (err) {
    console.error("[ERROR] getFormFrontMatter exception:", err.stack);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message }) };
  }
}

exports.getFormFrontMatter = getFormFrontMatter;
exports.handler = handler;
