// \netlify\functions\gatedForm.js
import fs from "fs";
import path from "path";
import { check_userLoginToken } from "./verifyUser.js";

function resolvePathCaseInsensitive(fullPath) {
  const parts = fullPath.split(path.sep);
  let current = parts[0] === "" ? path.sep : parts.shift(); // handle absolute paths
  for (const part of parts) {
    if (!fs.existsSync(current)) return null;
    const entries = fs.readdirSync(current);
    const match = entries.find(f => f.toLowerCase() === part.toLowerCase());
    if (!match) return null;
    current = path.join(current, match);
  }
  return current;
}

export async function handler(event) {

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = event.headers["authorization"]?.replace("Bearer ", "");
  const queryformName = event.queryStringParameters?.form;
  const formName = queryformName?.replace(/^\/|\/$/g, "").toLowerCase();
  console.log("[gatedForm] formName:", formName);

  if (!formName) {
    console.log("[gatedForm] Missing form name in query");
    return { statusCode: 400, body: "Form name missing" };
  }

  // Compute paths
  let htmlPath = path.join(process.cwd(), "private_html", `${formName}.html`);
  let metadataPath = path.join(process.cwd(), "private_html", `${formName}.json`);

  // Case-insensitive resolution
  htmlPath = resolvePathCaseInsensitive(htmlPath) || htmlPath;
  metadataPath = resolvePathCaseInsensitive(metadataPath) || metadataPath;

  // Load frontMatter
  let frontMatter = { restrict_users: [], validation: [] };
  try {
    if (metadataPath && fs.existsSync(metadataPath)) {
      frontMatter = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      console.log("[gatedForm] Loaded frontMatter:", frontMatter);
    } else {
      console.log("[gatedForm] Metadata not found, defaulting to unrestricted");
    }
  } catch (err) {
    console.error("[gatedForm] Failed to read frontMatter:", err);
    return { statusCode: 500, body: "Server error loading form metadata" };
  }

  const restrictUsers = frontMatter.restrict_users.some(r => r && r.toLowerCase() !== "none");
  console.log("[gatedForm] Restricted to:", users, "restrictUsers:", restrictUsers);

  // Verify token if restricted
  let userStatus = { valid: false, roles: [] };
  if (restrictUsers && token) {
    try {
      const check = await check_userLoginToken(token);
      userStatus.valid = check.status === "success";
      userStatus.roles = (check.entry?.role || []).map(r => String(r).toLowerCase());
      console.log("[gatedForm] Token valid?", userStatus.valid, "User roles:", userStatus.roles);
    } catch (err) {
      console.error("[gatedForm] check_userLoginToken failed:", err);
      userStatus = { valid: false, roles: [] };
    }
  }

  // Redirect to login if restricted & invalid token or no token
  if (restrictUsers && !userStatus.valid) {
    console.log("[gatedForm] Redirecting to login due to missing/invalid token");
    return {
      statusCode: 302,
      headers: { Location: `/user-login?redirect=${encodeURIComponent(`/gatedForm?form=${formName}`)}` },
      body: "Redirecting to login..."
    };
  }

  // Role check
  if (restrictUsers) {
    const allowedRoles = frontMatter.restrict_users
      .filter(r => r && r.toLowerCase() !== "none")
      .map(r => r.toLowerCase());
    console.log("[gatedForm] Allowed roles for this form:", allowedRoles);

    const roleMatch = userStatus.roles.some(r => allowedRoles.includes(r));
    console.log("[gatedForm] Role match:", roleMatch);

    if (!roleMatch) {
      return {
        statusCode: 403,
        body: `
          <div style="margin:3em auto;max-width:600px;text-align:center;font-family:sans-serif;">
            <h2 style="color:red;">Access Denied</h2>
            <p>Your role "<strong>${userStatus.roles.join(", ") || "None"}</strong>" does not have permission to access this form.</p>
            <p>Allowed roles: <strong>${allowedRoles.join(", ")}</strong></p>
          </div>
        `
      };
    }
  }

  // Serve HTML
  try {
    if (!htmlPath || !fs.existsSync(htmlPath)) {
      console.error("[gatedForm] HTML file not found:", htmlPath);
      return { statusCode: 404, body: "Form not found" };
    }

    console.log("[gatedForm] Serving HTML");
    const html = fs.readFileSync(htmlPath, "utf-8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };
  } catch (err) {
    console.error("[gatedForm] Error reading HTML:", err);
    return { statusCode: 500, body: "Server error reading form" };
  }
}
