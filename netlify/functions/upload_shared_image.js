import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  ALLOWED_EXTENSIONS, ALLOWED_MIME,
  parseDataUrl, resolveFilename,
  resolveSiteRoot, mirrorSharedImagesToPublic
} from "./imageUtils.js";
import { requireBindingAuth } from "./authHelper.js";

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
  const auth = await requireBindingAuth(event, "content_editor");
  if (auth.unauthorized) return auth.response;

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

    const filename = resolveFilename(name, parsed.contentType);
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
    mirrorSharedImagesToPublic(repoRoot, filename);

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

