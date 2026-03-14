// netlify/functions/save_edit.js
import fs from "fs";
import path from "path";

const editsRoot = path.join(process.cwd(), "edits");
const contentRoot = path.join(process.cwd(), "content");

function resolveEditTarget(filePath) {
  const rel = String(filePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel) return "";
  if (rel.endsWith(".md")) return rel;

  const contentPath = path.join(contentRoot, rel);
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
