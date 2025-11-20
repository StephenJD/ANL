// \netlify\functions\gatedPage.js
import fs from "fs";
import path from "path";
import { check_userLoginToken } from "./verifyUser.js";

function resolvePathCaseInsensitive(fullPath) {
  const parts = fullPath.split(path.sep);
  let current = parts[0] === "" ? path.sep : parts.shift();
  for (const part of parts) {
    if (!fs.existsSync(current)) return null;
    const entries = fs.readdirSync(current);
    const match = entries.find(f => f.toLowerCase() === part.toLowerCase());
    if (!match) return null;
    current = path.join(current, match);
  }
  return current;
}

// DRY JSON response helper
function jsonResponse(action, extra = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra })
  };
}

export async function handler(event) {

  if (event.httpMethod !== "GET") return jsonResponse("methodNotAllowed");

  const token = event.headers["authorization"]?.replace("Bearer ", "");
  const queryPageName = event.queryStringParameters?.page;
  const pageName = queryPageName?.replace(/^\/|\/$/g, "").toLowerCase();
  console.log("[gatedPage] pageName:", pageName);

  if (!pageName) return jsonResponse("pageNameMissing");

  let htmlPath = path.join(process.cwd(), "private_html", `${pageName}.html`);
  let metadataPath = path.join(process.cwd(), "private_html", `${pageName}.json`);

  htmlPath = resolvePathCaseInsensitive(htmlPath) || htmlPath;
  metadataPath = resolvePathCaseInsensitive(metadataPath) || metadataPath;

  let frontMatter = { restrict_users: [], validation: [] };
  try {
    if (metadataPath && fs.existsSync(metadataPath)) {
      frontMatter = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      console.log("[gatedPage] Loaded frontMatter:", frontMatter);
    } else {
      console.log("[gatedPage] Metadata not found, defaulting to unrestricted");
    }
  } catch (err) {
    console.error("[gatedPage] Failed to read frontMatter:", err);
    return jsonResponse("error", { message: "Server error loading page metadata" });
  }

  const users = frontMatter.restrict_users;
  const restrictUsers = users.some(r => r && r.toLowerCase() !== "none");
  console.log("[gatedPage] Restricted to:", users, "restrictUsers:", restrictUsers);

  let userStatus = { valid: false, roles: [] };
  if (restrictUsers && token) {
    try {
      const check = await check_userLoginToken(token);
      userStatus.valid = check.status === "success";
      userStatus.roles = (check.entry?.role || []).map(r => String(r).toLowerCase());
      console.log("[gatedPage] Token valid?", userStatus.valid, "User roles:", userStatus.roles);
    } catch (err) {
      console.error("[gatedPage] check_userLoginToken failed:", err);
      userStatus = { valid: false, roles: [] };
    }
  }

  if (restrictUsers && !userStatus.valid) {
    console.log("[gatedPage] Redirecting to login due to missing/invalid token");
    return jsonResponse("redirect", { location: `/user-login?redirect=${encodeURIComponent(`/${pageName}/`)}` });
  }

  if (restrictUsers) {
    const allowedRoles = users.filter(r => r && r.toLowerCase() !== "none").map(r => r.toLowerCase());
    console.log("[gatedPage] Allowed roles for this page:", allowedRoles);

    const roleMatch = userStatus.roles.some(r => allowedRoles.includes(r));
    console.log("[gatedPage] Role match:", roleMatch);

    if (!roleMatch) return jsonResponse("accessDenied", { roles: userStatus.roles, allowedRoles });
  }

  try {
    if (!htmlPath || !fs.existsSync(htmlPath)) {
      console.error("[gatedPage] HTML file not found:", htmlPath);
      return jsonResponse("notFound");
    }

    console.log("[gatedPage] Serving HTML");
    const html = fs.readFileSync(htmlPath, "utf-8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };
  } catch (err) {
    console.error("[gatedPage] Error reading HTML:", err);
    return jsonResponse("error", { message: "Server error reading page" });
  }
}
