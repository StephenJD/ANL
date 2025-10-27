// /.netlify/functions/getFormFrontMatter.js
// - Returns front-matter metadata for any Hugo-generated form JSON
// Called by server: submitFormController
//           client: form_access_controller

// /.netlify/functions/getFormFrontMatter.js
const fs = require("fs").promises;
const path = require("path");

// Safe import: works in both Netlify dev and production
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));


async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  const metadataFile = path.join(__dirname, "../../public", formPath, "form_metadata.json");
  
  const siteURL = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";
  const res = await fetch(`${siteURL}${formPath}form_metadata.json`);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const raw = await res.text();


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

  console.debug("[DEBUG] getFormFrontMatter Parsed validation:", validation);

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
    console.error("[ERROR] getFormFrontMatter exception:", err.stack || err);
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: err.message || "Server error" })
      };
  }
}

exports.handler = handler;
