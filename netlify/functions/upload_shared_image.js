// netlify/functions/upload_shared_image.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp"
]);

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

function mirrorStaticSharedToPublic(siteRoot, filename) {
  try {
    const src = path.join(siteRoot, "static", "images", "shared", filename);
    if (!fs.existsSync(src)) return;
    const dstDir = path.join(siteRoot, "public", "images", "shared");
    fs.mkdirSync(dstDir, { recursive: true });
    const dst = path.join(dstDir, filename);
    fs.copyFileSync(src, dst);
  } catch (err) {
    // preview can still work after next full build
  }
}

function sanitizeBaseName(name) {
  const base = path.basename(String(name || ""));
  const replaced = base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
  return replaced || `image-${Date.now()}.png`;
}

function inferExtension(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type === "image/png") return ".png";
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/gif") return ".gif";
  if (type === "image/svg+xml") return ".svg";
  if (type === "image/webp") return ".webp";
  return "";
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
}

function runGit(command, cwd) {
  return execSync(command, { cwd, stdio: "pipe" }).toString("utf8").trim();
}

async function githubGetFile(repo, relPath, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${relPath}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPutFile(repo, relPath, base64Content, token, message, sha = null) {
  const body = { message, content: base64Content };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${relPath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${relPath} failed: ${res.status} ${text}`);
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const name = body.name || body.filename || "";
    const dataUrl = body.dataUrl || "";
    const forceLocal = body.forceLocal === true || String(body.forceLocal || "").toLowerCase() === "true";

    const parsed = parseDataUrl(dataUrl);
    if (!parsed?.base64 || !parsed?.contentType) {
      return { statusCode: 400, body: "Missing or invalid dataUrl" };
    }
    if (!ALLOWED_MIME.has(parsed.contentType)) {
      return { statusCode: 400, body: "Unsupported image type" };
    }

    let filename = sanitizeBaseName(name);
    const ext = path.extname(filename).toLowerCase();
    const inferred = inferExtension(parsed.contentType);
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      filename = filename.replace(/\.[^/.]+$/, "");
      filename = filename + (inferred || ".png");
    }
    if (!ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
      return { statusCode: 400, body: "Invalid file extension" };
    }

    const relPath = `static/images/shared/${filename}`;

    const token = process.env.GITHUB_TOKEN || "";
    const repo = process.env.GITHUB_REPO || "StephenJD/ANL";

    if (token && !forceLocal) {
      const existing = await githubGetFile(repo, relPath, token);
      const sha = existing?.sha || null;
      await githubPutFile(repo, relPath, parsed.base64, token, `Upload ${filename}`, sha);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, url: `/images/shared/${filename}`, filename })
      };
    }

    const repoRoot = resolveSiteRoot();
    const gitDir = path.join(repoRoot, ".git");
    const hasGit = fs.existsSync(gitDir);

    const outDir = path.join(repoRoot, "static", "images", "shared");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, Buffer.from(parsed.base64, "base64"));
    mirrorStaticSharedToPublic(repoRoot, filename);

    if (hasGit) {
      try {
        runGit(`git add "static/images/shared/${filename}"`, repoRoot);
        const staged = runGit("git diff --cached --name-only", repoRoot);
        if (staged) {
          runGit(`git commit -m "Upload shared image ${filename}"`, repoRoot);
        }
      } catch (e) {
        // ignore git errors
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, url: `/images/shared/${filename}`, filename })
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
