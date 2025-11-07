// \netlify\functions\gatedForm.js
import fs from "fs";
import path from "path";
import { check_userLoginToken } from "./verifyUser.js";

function findFileCaseInsensitive(dir, targetName) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const found = files.find(f => f.toLowerCase() === targetName.toLowerCase());
  return found ? path.join(dir, found) : null;
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = event.headers["authorization"]?.replace("Bearer ", "");

const queryformName = event.queryStringParameters?.form;
const formName = queryformName?.replace(/^\/|\/$/g, ""); // trim slashes
console.log("[DEBUG gatedForm] Raw query form:", queryformName);
console.log("[DEBUG gatedForm] Normalized formName:", formName);

// Compute initial paths
let htmlPath = path.join(process.cwd(), "private_html", `${formName}.html`);
let metadataPath = path.join(process.cwd(), "private_html", `${formName}.json`);
console.log("[DEBUG gatedForm] Computed htmlPath:", htmlPath);
console.log("[DEBUG gatedForm] Computed metadataPath:", metadataPath);

// Case-insensitive resolution
const resolvedHtmlPath = findFileCaseInsensitive(path.dirname(htmlPath), path.basename(htmlPath));
const resolvedMetadataPath = findFileCaseInsensitive(path.dirname(metadataPath), path.basename(metadataPath));
console.log("[DEBUG gatedForm] Resolved HTML file:", resolvedHtmlPath);
console.log("[DEBUG gatedForm] Resolved metadata file:", resolvedMetadataPath);

// Replace htmlPath / metadataPath with resolved versions
htmlPath = resolvedHtmlPath || htmlPath;
metadataPath = resolvedMetadataPath || metadataPath;


  if (!formName) {
    return { statusCode: 400, body: "Form name missing" };
  }

  console.log("[DEBUG gatedForm] Incoming request:", event.httpMethod, event.url);
  console.log("[DEBUG gatedForm] Requested formName:", formName);
  console.log("[DEBUG gatedForm] Authorization token present:", !!token);

  const formDir = path.join(process.cwd(), "private_html", path.dirname(formName));
  const formBase = path.basename(formName);

  // 1. Load frontMatter JSON
  let frontMatter;
  try {
    if (!metadataPath) {
      console.warn(`[DEBUG gatedForm] Metadata not found, defaulting to unrestricted`);
      frontMatter = { restrict_users: [], validation: [] };
    } else {
      console.log("[DEBUG gatedForm] Found frontMatter JSON:", metadataPath);
      frontMatter = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    }
  } catch (err) {
    console.error("[DEBUG gatedForm] Failed to read frontMatter:", err);
    return { statusCode: 500, body: "Server error loading form metadata" };
  }

  const restrictUsers = Array.isArray(frontMatter.restrict_users) &&
                        frontMatter.restrict_users.some(r => r && r.toLowerCase() !== "none");
  console.log("[DEBUG gatedForm] restrictUsers computed:", restrictUsers);

  // 2. Check token if restricted
  let userStatus = { valid: false, roles: [] };
  if (restrictUsers && token) {
    try {
      const check = await check_userLoginToken(token);
      userStatus.valid = check.status === "success";
      userStatus.roles = (check.entry?.roles || []).map(r => String(r).toLowerCase());
    } catch (err) {
      console.error("[DEBUG gatedForm] check_userLoginToken failed:", err);
      userStatus = { valid: false, roles: [] };
    }
  }

  // 3. Redirect to login if restricted & invalid
  if (restrictUsers && !userStatus.valid) {
    console.log("[DEBUG gatedForm] Redirecting to login: restricted & invalid token");
    return {
      statusCode: 302,
      headers: { Location: `/user-login?redirect=${encodeURIComponent(`/gatedForm?form=${formName}`)}` },
      body: "Redirecting to login..."
    };
  }

  // 4. Role check
  if (restrictUsers) {
    const allowedRoles = frontMatter.restrict_users
      .filter(r => r && r.toLowerCase() !== "none")
      .map(r => r.toLowerCase());

    if (!userStatus.roles.some(r => allowedRoles.includes(r))) {
      return {
        statusCode: 403,
        body: `
          <div style="margin:3em auto;max-width:600px;text-align:center;font-family:sans-serif;">
            <h2 style="color:red;">Access Denied</h2>
            <p>Your role "<strong>${userStatus.roles.join(", ")}</strong>" does not have permission to access this form.</p>
            <p>Allowed roles: <strong>${allowedRoles.join(", ")}</strong></p>
          </div>
        `
      };
    }
  }

  // 5. Serve HTML
  try {
    if (!htmlPath) {
      console.error("[DEBUG gatedForm] Form not found:", path.join(formDir, `${formBase}.html`));
      return { statusCode: 404, body: "Form not found" };
    }

    console.log("[DEBUG gatedForm] Serving HTML:", htmlPath);
    const html = fs.readFileSync(htmlPath, "utf-8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };
  } catch (err) {
    console.error("[DEBUG gatedForm] Error reading HTML:", err);
    return { statusCode: 500, body: "Server error reading form" };
  }
}
