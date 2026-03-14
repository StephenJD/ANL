// netlify/functions/list_shared_images.js
import fs from "fs";
import path from "path";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

function getCurrentDir() {
  try {
    if (typeof import.meta !== "undefined" && typeof import.meta.url === "string" && import.meta.url) {
      const url = import.meta.url;
      if (url.startsWith("file://")) {
        return path.dirname(new URL(url).pathname.replace(/^\/[A-Za-z]:/, match => match.slice(1)));
      }
    }
  } catch (err) {
    // ignore runtime-specific import.meta issues
  }
  if (typeof __dirname === "string" && __dirname) return __dirname;
  return "";
}

function isSiteRoot(dir) {
  return fs.existsSync(path.join(dir, "content")) && fs.existsSync(path.join(dir, "static"));
}

function resolveSiteRoot() {
  const candidates = [process.env.LOCAL_GIT_ROOT, process.env.INIT_CWD, process.env.PWD, process.cwd(), getCurrentDir()];
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

function mirrorStaticSharedToPublic(siteRoot, fileNames) {
  try {
    const srcDir = path.join(siteRoot, "static", "images", "shared");
    const dstDir = path.join(siteRoot, "public", "images", "shared");
    if (!fs.existsSync(srcDir)) return;
    fs.mkdirSync(dstDir, { recursive: true });

    for (const name of fileNames) {
      const src = path.join(srcDir, name);
      const dst = path.join(dstDir, name);
      if (!fs.existsSync(src)) continue;
      const shouldCopy = !fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs;
      if (shouldCopy) fs.copyFileSync(src, dst);
    }
  } catch (err) {
    // keep listing resilient even if mirror fails
  }
}

export async function handler() {
  try {
    const siteRoot = resolveSiteRoot();
    const sharedDir = path.join(siteRoot, "static", "images", "shared");
    if (!fs.existsSync(sharedDir)) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    const files = fs.readdirSync(sharedDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    mirrorStaticSharedToPublic(siteRoot, files);

    const urls = files.map(name => `/images/shared/${name}`);

    return {
      statusCode: 200,
      body: JSON.stringify(urls)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to list shared images", details: err.message })
    };
  }
}
