// /netlify/functions/authHelper.js
// Centralised authentication & authorisation for all Netlify functions.
//
// Provides:
//  - requireAuth(event, allowedRoles) — gate any handler behind a role check
//  - check_userLoginToken(token, deviceId) — validate token, enforce exact role match,
//    return cached result when possible
//  - In-memory token cache (survives warm-start reuse of the same Lambda instance)

import 'dotenv/config';
import fs from "fs";
import path from "path";
import { getSecureItem, setSecureItem, deleteRecords } from "./multiSecureStore.js";

const ACCESS_TOKEN_KEY = process.env.ACCESS_TOKEN_KEY;
const USER_ACCESS_KEY  = process.env.USER_ACCESS_KEY;
const PERMITTED_USERS_KEY = process.env.PERMITTED_USERS_KEY;
const USER_ACCESS_TIMEOUT_mS = (process.env.USER_ACCESS_TIMEOUT_HRS || 8) * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// In-memory token cache (reduces DB round-trips on warm Lambda instances).
// Entries are keyed by token string and evicted after CACHE_TTL ms.
// ---------------------------------------------------------------------------
const _tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(token) {
  const cached = _tokenCache.get(token);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    _tokenCache.delete(token);
    return null;
  }
  return cached.result;
}

function cacheSet(token, result) {
  _tokenCache.set(token, { result, cachedAt: Date.now() });
}

function cacheInvalidate(token) {
  _tokenCache.delete(token);
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Extract Bearer token and deviceId from an incoming event.
// ---------------------------------------------------------------------------
export function extractCredentials(event) {
  const token = (event.headers?.["authorization"] || "").replace(/^Bearer\s+/i, "").trim() || null;
  const deviceId = (event.headers?.["x-device-id"] || "").trim() || null;
  const userAgent = (event.headers?.["user-agent"] || "").trim() || null;
  return { token, deviceId, userAgent };
}

// ---------------------------------------------------------------------------
// Validate token, check exact role match against the live permitted-users DB,
// enforce device binding, and slide the expiry.
//
// Returns: { status: "success", entry } | { status: <error-string> }
// Possible error statuses: "missing", "not_found", "expired",
//                          "device_mismatch", "role_mismatch", "error"
// "role_mismatch" means the caller should force a logout.
// ---------------------------------------------------------------------------
export async function check_userLoginToken(token, deviceId, userAgent = null) {
  if (!token) return { status: "missing" };

  // --- Serve from cache if available ---
  const cached = cacheGet(token);
  if (cached) {
    // Still enforce device check from cache
    if (cached.status === "success" && cached.entry?.deviceId && cached.entry.deviceId !== deviceId) {
      console.warn("[authHelper] Device mismatch (cache) token:", token.slice(0, 8));
      return { status: "device_mismatch" };
    }
    if (cached.status === "success" && cached.entry?.userAgent && cached.entry.userAgent !== userAgent) {
      console.warn("[authHelper] User-Agent mismatch (cache) token:", token.slice(0, 8));
      return { status: "device_mismatch" };
    }
    return cached;
  }

  try {
    const entry = await getSecureItem(ACCESS_TOKEN_KEY, token);
    if (!entry) {
      const result = { status: "not_found" };
      cacheSet(token, result);
      return result;
    }

    if (entry.expires && Date.now() > entry.expires) {
      cacheInvalidate(token);
      return { status: "expired" };
    }

    // --- Device binding check ---
    if (entry.deviceId && entry.deviceId !== deviceId) {
      console.warn("[authHelper] Device mismatch for user:", entry.user_name);
      const result = { status: "device_mismatch" };
      cacheSet(token, result);
      return result;
    }
    if (entry.userAgent && entry.userAgent !== userAgent) {
      console.warn("[authHelper] User-Agent mismatch for user:", entry.user_name);
      const result = { status: "device_mismatch" };
      cacheSet(token, result);
      return result;
    }

    // --- Exact role match against live permitted-users record ---
    const permittedUsers = await getSecureItem(USER_ACCESS_KEY, PERMITTED_USERS_KEY) || [];
    const liveUser = permittedUsers.find(
      u => (u["User name"] || "").toLowerCase() === (entry.user_name || "").toLowerCase()
    );

    if (!liveUser) {
      // User removed from permitted list — force logout
      await deleteRecords(ACCESS_TOKEN_KEY, [token]);
      cacheInvalidate(token);
      console.warn("[authHelper] User no longer in permitted list:", entry.user_name);
      return { status: "role_mismatch" };
    }

    const liveRole  = String(liveUser["Role"] || "").toLowerCase().trim();
    const tokenRole = String(entry.role || "").toLowerCase().trim();

    if (liveRole !== tokenRole) {
      // Role changed since token was issued — invalidate token and force logout
      await deleteRecords(ACCESS_TOKEN_KEY, [token]);
      cacheInvalidate(token);
      console.warn("[authHelper] Role mismatch for user:", entry.user_name,
        "token-role:", tokenRole, "live-role:", liveRole);
      return { status: "role_mismatch" };
    }

    // --- Slide expiry (keeps active sessions alive) ---
    await setSecureItem(ACCESS_TOKEN_KEY, token, {
      user_name: entry.user_name,
      role:      entry.role,
      deviceId:  entry.deviceId || null,
      userAgent: entry.userAgent || null
    }, USER_ACCESS_TIMEOUT_mS);

    const result = { status: "success", entry };
    cacheSet(token, result);
    return result;

  } catch (err) {
    console.error("[authHelper] check_userLoginToken error:", err);
    return { status: "error" };
  }
}

// ---------------------------------------------------------------------------
// Gate a handler behind role-based auth.
//
// Usage:
//   const auth = await requireAuth(event, ["admin", "editor"]);
//   if (auth.unauthorized) return auth.response;
//   // ... handler logic using auth.user
//
// allowedRoles: string[] — lowercase role names allowed to call this endpoint.
// Pass [] or omit to require *any* authenticated user regardless of role.
// ---------------------------------------------------------------------------
export async function requireAuth(event, allowedRoles = []) {
  const { token, deviceId, userAgent } = extractCredentials(event);

  if (!token) {
    return {
      unauthorized: true,
      response: {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Authentication required" })
      }
    };
  }

  const check = await check_userLoginToken(token, deviceId, userAgent);

  if (check.status === "role_mismatch" || check.status === "device_mismatch") {
    return {
      unauthorized: true,
      response: {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Session invalidated", logout: true })
      }
    };
  }

  if (check.status !== "success") {
    return {
      unauthorized: true,
      response: {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Invalid or expired session" })
      }
    };
  }

  // Support multiple roles per user (comma-separated or array)
  let userRoles = check.entry?.role;
  if (Array.isArray(userRoles)) {
    userRoles = userRoles.map(r => String(r).toLowerCase().trim());
  } else if (typeof userRoles === "string") {
    userRoles = userRoles.split(",").map(r => r.toLowerCase().trim()).filter(Boolean);
  } else {
    userRoles = [];
  }

  const allowed = allowedRoles.map(r => String(r).toLowerCase().trim());
  const hasRole = userRoles.some(r => allowed.includes(r));

  if (allowed.length > 0 && !hasRole) {
    console.warn("[authHelper] Forbidden: user roles", userRoles, "not in", allowed);
    return {
      unauthorized: true,
      response: {
        statusCode: 403,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Insufficient permissions" })
      }
    };
  }

  return {
    unauthorized: false,
    user: { userName: check.entry.user_name, roles: userRoles }
  };
}

// ---------------------------------------------------------------------------
// Cache for binding-key → roles lookups (scans private_html once per TTL).
// ---------------------------------------------------------------------------
const _bindingCache = new Map();
const BINDING_CACHE_TTL = 60 * 1000; // 1 minute

function scanDirForBinding(dir, bindingKey, roles) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirForBinding(full, bindingKey, roles);
    } else if (entry.name.endsWith(".json")) {
      try {
        const meta = JSON.parse(fs.readFileSync(full, "utf8"));
        if (normalizeRole(meta.function_key) === bindingKey) {
          const access = Array.isArray(meta.access) ? meta.access : (meta.access ? [meta.access] : []);
          for (const role of access) {
            const r = normalizeRole(role);
            if (r && !roles.includes(r)) roles.push(r);
          }
        }
      } catch { /* skip malformed files */ }
    }
  }
}

function getBindingRoles(bindingKey) {
  const key = normalizeRole(bindingKey);
  const cached = _bindingCache.get(key);
  if (cached && Date.now() - cached.cachedAt < BINDING_CACHE_TTL) return cached.roles;
  const roles = [];
  const privateHtmlRoot = path.join(process.cwd(), "private_html");
  try {
    scanDirForBinding(privateHtmlRoot, key, roles);
  } catch (err) {
    console.error("[authHelper] getBindingRoles scan error:", err.message);
  }
  _bindingCache.set(key, { roles, cachedAt: Date.now() });
  return roles;
}

// Gate a handler using the function_key field in page metadata files.
// Each page whose compiled JSON has function_key === bindingKey contributes
// its access roles. The union of all matching pages forms the allowed roles.
// Fails closed (500) if no pages with that binding key exist.
export async function requireBindingAuth(event, bindingKey) {
  if (!bindingKey) {
    console.error("[authHelper] requireBindingAuth called with no binding key");
    return {
      unauthorized: true,
      response: {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Server configuration error" })
      }
    };
  }
  const allowedRoles = getBindingRoles(bindingKey);
  if (!allowedRoles.length) {
    console.error("[authHelper] requireBindingAuth: no roles found for binding:", bindingKey);
    return {
      unauthorized: true,
      response: {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Server configuration error" })
      }
    };
  }
  return requireAuth(event, allowedRoles);
}

// ---------------------------------------------------------------------------
// Gate a handler using access roles read from one or more page metadata files.
// pagePaths are site-relative paths without extension, e.g. "07_secure/04_visit_stats".
// The union of all access arrays across all named pages forms the allowed roles.
// ---------------------------------------------------------------------------
export async function requirePageAuth(event, ...pagePaths) {
  if (!pagePaths.length) {
    console.error("[authHelper] requirePageAuth called with no page paths");
    return {
      unauthorized: true,
      response: {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Server configuration error" })
      }
    };
  }

  const allowedRoles = [];
  for (const pagePath of pagePaths) {
    const safe = String(pagePath).replace(/\.\./g, "").replace(/\\/g, "/").replace(/^\/+/, "");
    const metaPath = path.join(process.cwd(), "private_html", `${safe}.json`);
    try {
      const raw = fs.readFileSync(metaPath, "utf8");
      const meta = JSON.parse(raw);
      const access = Array.isArray(meta.access) ? meta.access : (meta.access ? [meta.access] : []);
      for (const role of access) {
        const r = normalizeRole(role);
        if (r && !allowedRoles.includes(r)) allowedRoles.push(r);
      }
    } catch (err) {
      console.error("[authHelper] requirePageAuth: failed to read metadata for", pagePath, err.message);
    }
  }

  if (!allowedRoles.length) {
    console.error("[authHelper] requirePageAuth: no access roles found for pages:", pagePaths);
    return {
      unauthorized: true,
      response: {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Server configuration error" })
      }
    };
  }

  return requireAuth(event, allowedRoles);
}
