// netlify/functions/start_edit.js
import fs from "fs";
import path from "path";
import { requireBindingAuth } from "./authHelper.js";

import { normalizeFrontMatter } from "../../static/js/webeditor/normalizeFrontMatter.js";

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

    // Find parent _index.md
    let parentPath = null;
    let parentRawContent = null;
    let parentRawFrontMatter = null;
    let parentTitle = null;
    let parentFileName = null;

    const isIndex = fullPath.endsWith("_index.md");
    let parentDir = isIndex ? path.dirname(path.dirname(fullPath)) : path.dirname(fullPath);
    let parentIndexPath = path.join(parentDir, "_index.md");
    if (fs.existsSync(parentIndexPath)) {
      parentPath = parentIndexPath;
      parentRawContent = fs.readFileSync(parentIndexPath, "utf-8");
      const parentFMMatch = parentRawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      parentRawFrontMatter = parentFMMatch ? parentFMMatch[0] : "";
      // Use normalizeFrontMatter to extract clean title
      let parentFMObj = {};
      try {
        parentFMObj = normalizeFrontMatter(parentRawContent);
      } catch (e) {
        parentFMObj = {};
      }
      parentTitle = typeof parentFMObj.title === "string" ? parentFMObj.title : null;
      parentFileName = path.basename(parentIndexPath);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        rawFrontMatter,
        content: rawContent,
        parent: parentPath ? {
          ...parentFMObj,
          fileName: parentFileName
        } : null
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}

