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
    // ...existing code...
    // Base content directory
    const contentDir = path.join(process.cwd(), "content");
    // Reject path-traversal attempts before joining
    const rel = String(file || "").replace(/\\/g, "/").replace(/^\/+/ , "");
    if (!rel || rel.includes("..")) {
      return { statusCode: 400, body: "Invalid file path" };
    }
    // Full path
    let fullPath = path.join(contentDir, rel);
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
      return { statusCode: 404, body: "File not found" };
    }
    const rawContent = fs.readFileSync(fullPath, "utf-8");
    // Extract front matter (simple split for now)
    const frontMatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const rawFrontMatterBlock = frontMatterMatch ? frontMatterMatch[0] : "";
    const rawFrontMatterInner = frontMatterMatch ? frontMatterMatch[1] : "";
    const rawFrontMatter = rawFrontMatterBlock || "";
    let frontMatterFields = {};
    try {
      frontMatterFields = normalizeFrontMatter(rawContent);
      console.log('[start_edit] parsed frontMatterFields:', frontMatterFields);
    } catch (e) {
      frontMatterFields = {};
    }
    // Remove front matter from content
    const contentWithoutFrontMatter = rawFrontMatterBlock ? rawContent.slice(rawFrontMatterBlock.length).replace(/^\s*\n/, "") : rawContent;
    // Find parent _index.md
    let parentPath = null;
    let parentRawContent = null;
    let parentRawFrontMatter = null;
    let parentFileName = null;
    let parent_frontMatterFields = {};
    const isIndex = fullPath.endsWith("_index.md");
    let parentDir = isIndex ? path.dirname(path.dirname(fullPath)) : path.dirname(fullPath);
    let parentIndexPath = path.join(parentDir, "_index.md");
    if (fs.existsSync(parentIndexPath)) {
      parentPath = parentIndexPath;
      parentRawContent = fs.readFileSync(parentIndexPath, "utf-8");
      const parentFMMatch = parentRawContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      parentRawFrontMatter = parentFMMatch ? parentFMMatch[1] : "";
      try {
        parent_frontMatterFields = normalizeFrontMatter(parentRawContent);
      } catch (e) {
        parent_frontMatterFields = {};
      }
      parentFileName = path.basename(parentIndexPath);
    }
    const responseObj = {
      frontMatterFields,
      rawFrontMatter,
      content: contentWithoutFrontMatter,
      parent: parentPath ? {
        frontMatterFields: parent_frontMatterFields,
        fileName: parentFileName
      } : null
    };
    return {
      statusCode: 200,
      body: JSON.stringify(responseObj),
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}

