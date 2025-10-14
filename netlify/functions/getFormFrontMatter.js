// Server-Side: /.netlify/functions/getFormFrontMatter.js
// - Returns front-matter metadata for a form
// - Reads from form_metadata.json

const fs = require("fs").promises;
const path = require("path");

async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  const formDir = path.join(process.cwd(), "public", formPath);
  const metadataFile = path.join(formDir, "form_metadata.json");

  const raw = await fs.readFile(metadataFile, "utf-8");
  const metadata = JSON.parse(raw);

  let validationRaw = metadata.validation;
  let validation;

  if (Array.isArray(validationRaw)) {
    validation = validationRaw.map(String).filter(Boolean);
  } else if (typeof validationRaw === "string") {
    validation = validationRaw.split(/[\s,;|]+/).map(s => s.trim()).filter(Boolean);
  } else {
    validation = ["none"];
  }
  console.debug("[DEBUG] Raw metadata loaded:", metadata);
  console.debug("[DEBUG] validation field type:", Array.isArray(metadata.validation) ? "array" : typeof metadata.validation);
  console.debug("[DEBUG] Parsed validation result:", validation);
  console.debug("[DEBUG] title:", metadata.title);
  console.debug("[DEBUG] path:", metadata.path);

  return {
    validation,
    title: metadata.title,
    path: metadata.path
  };

}

// Netlify export
async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { formPath } = JSON.parse(event.body || "{}");
    const result = await getFormFrontMatter({ formPath });
    return { statusCode: 200, body: JSON.stringify({ success: true, ...result }) };
  } catch (err) {
    console.error("[ERROR] getFormFrontMatter exception:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}

exports.handler = handler;
