// netlify/functions/start_edit.js
import fs from "fs";
import path from "path";
import { requireBindingAuth } from "./authHelper.js";

export async function handler(event) {
  const auth = await requireBindingAuth(event, "content_editor");
  if (auth.unauthorized) return auth.response;

  try {

    const { file } = JSON.parse(event.body);
    console.log('[start_edit] Incoming file param:', file);


    // Base content directory
    const contentDir = path.join(process.cwd(), "content");
    console.log('[start_edit] contentDir:', contentDir);

    // Reject path-traversal attempts before joining
    const rel = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!rel || rel.includes("..")) {
      return { statusCode: 400, body: "Invalid file path" };
    }

    // Full path

    let fullPath = path.join(contentDir, rel);
    console.log('[start_edit] Resolved fullPath:', fullPath);

    // Guard: resolved path must stay within contentDir
    if (!fullPath.startsWith(contentDir + path.sep) && fullPath !== contentDir) {
      return { statusCode: 400, body: "Invalid file path" };
    }

    // If path is a folder, append _index.md
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(fullPath, "_index.md");
    }

    // Read file

    if (!fs.existsSync(fullPath)) {
      console.log('[start_edit] File not found:', fullPath);
      return { statusCode: 404, body: "File not found" };
    }


    const rawContent = fs.readFileSync(fullPath, "utf-8");
    console.log('[start_edit] File loaded, length:', rawContent.length);

    // Extract front matter (simple split for now)
    const frontMatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const rawFrontMatter = frontMatterMatch ? frontMatterMatch[0] : "";

    return {
      statusCode: 200,
      body: JSON.stringify({ rawFrontMatter, content: rawContent }),
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}

