// /netlify/functions/getFormFrontMatter.js
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

  // Normalize validation to array
  if (Array.isArray(metadata.validation)) {
    metadata.validation = metadata.validation.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof metadata.validation === "string") {
    metadata.validation = metadata.validation
      .split(/[\s,;|]+/)
      .map(s => s.trim())
      .filter(Boolean);
  } else {
    metadata.validation = ["none"];
  }

  // Normalize access to array
  if (Array.isArray(metadata.access)) {
    metadata.access = metadata.access.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof metadata.access === "string") {
    metadata.access = [metadata.access.trim()];
  } else {
    metadata.access = [];
  }

  // Build new object with lower-case field names and values, except title and summary values
  const result = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "title" || lowerKey === "summary") {
      result[lowerKey] = value;
    } else if (lowerKey === "validation" && Array.isArray(metadata.validation)) {
      result[lowerKey] = metadata.validation.map(v => v.toLowerCase());
    } else if (lowerKey === "access" && Array.isArray(metadata.access)) {
      result[lowerKey] = metadata.access.map(v => v.toLowerCase());
    } else if (typeof value === "string") {
      result[lowerKey] = value.toLowerCase();
    } else if (Array.isArray(value)) {
      result[lowerKey] = value.map(v => typeof v === "string" ? v.toLowerCase() : v);
    } else {
      result[lowerKey] = value;
    }
  }

  return result; // all field names and values lower-case except title and summary values
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
