// netlify/functions/save_edit.js
import fs from "fs";
import path from "path";
import { requireBindingAuth } from "./authHelper.js";

const editsRoot = path.join(process.cwd(), "edits");
const contentRoot = path.join(process.cwd(), "content");

function resolveEditTarget(filePath) {
  const rel = String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel) return "";
  // Reject any path component that could escape the edits root
  if (rel.includes("..")) return "";
  if (rel.endsWith(".md")) return rel;

  const contentPath = path.join(contentRoot, rel);
  // Ensure computed path remains inside contentRoot (guard against double-encoding etc.)
  if (!contentPath.startsWith(contentRoot + path.sep) && contentPath !== contentRoot) return "";

  try {
    if (fs.existsSync(contentPath) && fs.statSync(contentPath).isDirectory()) {
      return path.posix.join(rel, "_index.md");
    }
  } catch (err) {
    // fall through to folder-style default
  }
  return path.posix.join(rel, "_index.md");
}

export async function handler(event) {
  const auth = await requireBindingAuth(event, "edit_website");
  if (auth.unauthorized) return auth.response;

  try {
    const { file, content } = JSON.parse(event.body || "{}");
    if (!file) {
      return { statusCode: 400, body: "Missing file" };
    }

    const targetRel = resolveEditTarget(file);
    if (!targetRel) {
      return { statusCode: 400, body: "Invalid file path" };
    }

    const dst = path.join(editsRoot, targetRel);
    // Final path-traversal guard: resolved destination must be inside editsRoot
    if (!dst.startsWith(editsRoot + path.sep)) {
      return { statusCode: 400, body: "Invalid file path" };
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, content || "", "utf8");

    return {
      statusCode: 200,
      body: JSON.stringify({ saved: true, file: targetRel }),
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}

