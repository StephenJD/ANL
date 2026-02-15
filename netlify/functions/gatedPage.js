// \netlify\functions\gatedPage.js
import fs from "fs";
import path from "path";
import { check_userLoginToken } from "./verifyUser.js";
import { urlizePath } from "../../lib/urlize.js";

function jsonResponse(action, extra = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra })
  };
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse("methodNotAllowed");
  }

  const token = event.headers["authorization"]?.replace("Bearer ", "");
  const queryPageName = event.queryStringParameters?.page;
  const pageName = urlizePath(queryPageName);

  if (!pageName) {
    return jsonResponse("pageNameMissing");
  }

  let htmlPath = path.join(process.cwd(), "private_html", `${pageName}.html`);
  let metadataPath = path.join(process.cwd(), "private_html", `${pageName}.json`);

console.log("[gatedPage] Looking for HTML:", htmlPath);
console.log("[gatedPage] Exists?", fs.existsSync(htmlPath));

  let frontMatter = { access: "public" };

  try {
    if (metadataPath && fs.existsSync(metadataPath)) {
      frontMatter = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    }
  } catch (err) {
    console.error("[gatedPage] Failed to read metadata:", err);
    return jsonResponse("error", { message: "Server error loading page metadata" });
  }

  // Normalize access to array of lowercase strings
  let requiredAccess = frontMatter.access || "public";
  if (!Array.isArray(requiredAccess)) {
    requiredAccess = [requiredAccess];
  }
  requiredAccess = requiredAccess.map(r => String(r).toLowerCase());

  // Public page
  if (requiredAccess.includes("public")) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "public",
        url: `/${pageName}`   // return clean public URL
      })
    };
  }


  // Private page → must have token
  if (!token) {
    return jsonResponse("redirect", {
      location: `/user-login?redirect=${encodeURIComponent(`/${pageName}/`)}`
    });
  }

  let userRoles = [];

  try {
    const check = await check_userLoginToken(token);

    if (check.status !== "success") {
      return jsonResponse("redirect", {
        location: `/user-login?redirect=${encodeURIComponent(`/${pageName}/`)}`
      });
    }

    userRoles = [].concat(check.entry?.roles || check.entry?.role || []);
    userRoles = userRoles.map(r => String(r).toLowerCase());

  } catch (err) {
    console.error("[gatedPage] Token verification failed:", err);
    return jsonResponse("redirect", {
      location: `/user-login?redirect=${encodeURIComponent(`/${pageName}/`)}`
    });
  }

  // Membership check: does user have at least one page access role?
  const hasPermission = requiredAccess.some(role => userRoles.includes(role));

  if (!hasPermission) {
    return jsonResponse("accessDenied", {
      required: requiredAccess,
      userRoles
    });
  }

  // Serve the HTML for authorized users
  try {
    if (!fs.existsSync(htmlPath)) {
      console.error("[gatedPage] HTML file not found:", htmlPath);
      return jsonResponse("notFound");
    }

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
