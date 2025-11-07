// /.netlify/functions/getFormFrontMatter.js
import process from "process";
import path from "path";

export async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  // Use process.cwd() to locate project root
  const metadataFile = path.join(process.cwd(), "public", formPath, "form_metadata.json");

  const siteURL = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8888";
  const normalizedPath = formPath.endsWith("/") ? formPath : `${formPath}/`;

  const res = await fetch(`${siteURL}${normalizedPath}form_metadata.json`);

  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const raw = await res.text();

  let metadata;
  try {
    metadata = JSON.parse(raw);
  } catch (err) {
    console.error(`[ERROR] Invalid JSON in ${metadataFile}:`, err.message);
    throw new Error(`Invalid JSON in form metadata for path: ${formPath}`);
  }

  // Ensure validation is always an array of strings
  if (Array.isArray(metadata.validation)) {
    metadata.validation = metadata.validation.map(String).filter(Boolean);
  } else if (typeof metadata.validation === "string") {
    metadata.validation = metadata.validation
      .split(/[\s,;|]+/)
      .map(s => s.trim())
      .filter(Boolean);
  } else {
    metadata.validation = ["none"];
  }
  
  // Ensure restrict_users is always an array
  if (Array.isArray(metadata.restrict_users)) {
    metadata.restrict_users = metadata.restrict_users.map(String).filter(Boolean);
  } else if (typeof metadata.restrict_users === "string") {
    metadata.restrict_users = [metadata.restrict_users.trim()];
  } else {
    metadata.restrict_users = [];
  }
  
  return metadata; // return everything, with validation and restrict_users normalized
}

export async function handler(event) {
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
