// netlify/functions/imageUtils.js
// Shared utilities for image-related Netlify functions.
import fs from "fs";
import path from "path";

export const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp"
]);

// ── Path helpers ──────────────────────────────────────────────────────────────

export function toPosix(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

/** Given a content-relative filePath, return the folder portion. */
export function resolveFolderRel(filePath) {
  const rel = toPosix(filePath);
  if (!rel) return "";
  if (rel.endsWith(".md")) return path.posix.dirname(rel);
  return rel;
}

export function isSafeRelative(relPath) {
  const rel = toPosix(relPath);
  return !!rel && !rel.includes("..") && !path.isAbsolute(rel);
}

// ── File-name helpers ─────────────────────────────────────────────────────────

export function sanitizeBaseName(name) {
  const base = path.basename(String(name || ""));
  const replaced = base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return replaced || `image-${Date.now()}.png`;
}

export function inferExtension(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/gif") return ".gif";
  if (type === "image/svg+xml") return ".svg";
  if (type === "image/webp") return ".webp";
  return "";
}

export function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
}

/** Resolve a safe filename, correcting extension from MIME type if needed. */
export function resolveFilename(rawName, contentType) {
  let filename = sanitizeBaseName(rawName);
  const ext = path.extname(filename).toLowerCase();
  const inferred = inferExtension(contentType);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    filename = filename.replace(/\.[^/.]+$/, "") + (inferred || ".png");
  }
  return filename;
}

// ── Site-root resolution ──────────────────────────────────────────────────────

export function getCurrentDir() {
  try {
    if (typeof import.meta !== "undefined" && typeof import.meta.url === "string" && import.meta.url) {
      const url = import.meta.url;
      if (url.startsWith("file://")) {
        return path.dirname(new URL(url).pathname.replace(/^\/[A-Za-z]:/, m => m.slice(1)));
      }
    }
  } catch (_) {}
  if (typeof __dirname === "string" && __dirname) return __dirname;
  return "";
}

export function isSiteRoot(dir) {
  return fs.existsSync(path.join(dir, "content")) && fs.existsSync(path.join(dir, "static"));
}

export function resolveSiteRoot() {
  const candidates = [
    process.env.LOCAL_GIT_ROOT,
    process.env.INIT_CWD,
    process.env.PWD,
    process.cwd(),
    getCurrentDir()
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    let dir = path.resolve(candidate);
    while (true) {
      if (isSiteRoot(dir)) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return path.resolve(process.cwd());
}

// ── Mirror helpers (keep public/ in sync for local-dev preview) ───────────────

/**
 * Mirror one or more files from static/images/shared/ → public/images/shared/.
 * @param {string} siteRoot
 * @param {string|string[]} fileNames  - bare filename(s), e.g. "logo.png"
 */
export function mirrorSharedImagesToPublic(siteRoot, fileNames) {
  try {
    const names = Array.isArray(fileNames) ? fileNames : [fileNames];
    const srcDir = path.join(siteRoot, "static", "images", "shared");
    const dstDir = path.join(siteRoot, "public", "images", "shared");
    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(dstDir, { recursive: true });
    for (const name of names) {
      const src = path.join(srcDir, name);
      const dst = path.join(dstDir, name);
      if (!fs.existsSync(src)) continue;
      const shouldCopy = !fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs;
      if (shouldCopy) fs.copyFileSync(src, dst);
    }
  } catch (_) {}
}

/**
 * Mirror a content-folder image to the corresponding public/ path so the
 * browser can preview it immediately without a full Hugo rebuild.
 * e.g. content/01_whats_on/photo.jpg → public/01_whats_on/photo.jpg
 * @param {string} siteRoot
 * @param {string} folderRel  - posix-style relative folder, e.g. "01_whats_on"
 * @param {string} filename   - bare filename, e.g. "photo.jpg"
 */
export function mirrorPageFolderImageToPublic(siteRoot, folderRel, filename) {
  try {
    const src = path.join(siteRoot, "content", folderRel, filename);
    if (!fs.existsSync(src)) return;
    const dstDir = path.join(siteRoot, "public", folderRel);
    fs.mkdirSync(dstDir, { recursive: true });
    fs.copyFileSync(src, path.join(dstDir, filename));
  } catch (_) {}
}
