// \netlify\functions\gatedPage.js
import fs from "fs";
import path from "path";
import { check_userLoginToken } from "./verifyUser.js";
import { urlizePath } from "../../lib/urlize.js";
import { dynamicRuntimes } from "./dynamic_generators/generator_imports.js";

function jsonResponse(action, extra = {}) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...extra })
  };
}

function branchPathToPageUrl(pagePath) {
  const normalizedPath = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  if (!normalizedPath) return "/";
  if (normalizedPath === "_index") return "/";
  if (normalizedPath.endsWith("/_index")) {
    return `/${normalizedPath.slice(0, -"/_index".length)}/`;
  }
  return `/${normalizedPath}/`;
}

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return jsonResponse("methodNotAllowed");
  }

  const token = event.headers["authorization"]?.replace("Bearer ", "");
  const queryPageName = event.queryStringParameters?.page;
  const pagePath = urlizePath(queryPageName);
  const pageUrl = branchPathToPageUrl(pagePath);

  if (!pagePath) {
    return jsonResponse("pageNameMissing");
  }

  const htmlPath = path.join(process.cwd(), "private_html", `${pagePath}.html`);
  const metadataPath = path.join(process.cwd(), "private_html", `${pagePath}.json`);

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
        url: pageUrl
      })
    };
  }


  // Private page → must have token
  if (!token) {
    return jsonResponse("redirect", {
      location: `/user-login?redirect=${encodeURIComponent(pageUrl)}`
    });
  }

  let userRoles = [];

  try {
    const check = await check_userLoginToken(token);

    if (check.status !== "success") {
      return jsonResponse("redirect", {
        location: `/user-login?redirect=${encodeURIComponent(pageUrl)}`
      });
    }

    userRoles = [].concat(check.entry?.roles || check.entry?.role || []);
    userRoles = userRoles.map(r => String(r).toLowerCase());

  } catch (err) {
    console.error("[gatedPage] Token verification failed:", err);
    return jsonResponse("redirect", {
      location: `/user-login?redirect=${encodeURIComponent(pageUrl)}`
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

  // Extract runtime name from type field
  let runtimeName = null;
  if (frontMatter.type) {
    const parts = String(frontMatter.type).trim().split(/\s+/);
    if (parts[0] === "dynamic" && parts[1]) {
      runtimeName = parts.slice(1).join(" ");
    }
  }

  console.log("[gatedPage] gatedPage:", pagePath, "runtimeName:", runtimeName);

  // Serve runtime-generated or static HTML
  try {
    let html;

    if (runtimeName) {
      const runtimeFn = dynamicRuntimes[runtimeName];
      if (!runtimeFn || typeof runtimeFn !== "function") {
        console.error("[gatedPage] Runtime function not found or not callable:", runtimeName);
        return jsonResponse("notFound");
      }
      console.log("[gatedPage] Invoking runtime:", runtimeName);
      html = await runtimeFn();
    } else {
      // Serve static HTML
      console.log("[gatedPage] pre-built Page:", pagePath);
      if (!fs.existsSync(htmlPath)) {
        console.error("[gatedPage] HTML file not found:", htmlPath);
        return jsonResponse("notFound");
      }
      html = fs.readFileSync(htmlPath, "utf-8");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html
    };
  } catch (err) {
    console.error("[gatedPage] Error:", err);
    return jsonResponse("error", { message: "Server error" });
  }
}
