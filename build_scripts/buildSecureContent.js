// \build_scripts\buildSecureContent.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import matter from "gray-matter";
import { urlize } from "../lib/urlize.js";

const contentDir = path.join(process.cwd(), "content");
const outputDir = path.join(process.cwd(), "private_html");

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

fs.mkdirSync(outputDir, { recursive: true });
console.log("[buildSecureContent] Created private_html?", fs.existsSync(outputDir));

// Remove Hugo shortcodes ({{< ... >}} or {{% ... %}})
function stripShortcodes(content) {
  return content
    .replace(/{{<[\s\S]+?>}}/g, "")
    .replace(/{{%[\s\S]+?%}}/g, "");
}

function processDir(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      processFile(fullPath);
    }
  });
}

function processFile(filePath) {
  try {
    const md = fs.readFileSync(filePath, "utf-8");
    const { data: frontMatter, content: rawContent } = matter(md);

    const type = (frontMatter.type || "").toLowerCase();
    let access = frontMatter.access || "public";
    
    if (!Array.isArray(access)) {
      access = [access];
    }
    
    access = access.map(a => String(a).toLowerCase());

    // Only build private content
    if (access.includes("public")) return;

    const cleanContent = stripShortcodes(rawContent);
    const html = marked.parse(cleanContent);

    let relPath = path
      .relative(contentDir, filePath)
      .replace(/\.md$/, ".html");

    relPath = relPath
      .split(path.sep)
      .map(segment => urlize(segment))
      .join(path.sep);

    const outHtmlPath = path.join(outputDir, relPath);
    const outJsonPath = outHtmlPath.replace(/\.html$/, ".json");


    fs.mkdirSync(path.dirname(outHtmlPath), { recursive: true });
    fs.writeFileSync(outHtmlPath, html);

    const json = {
      title: frontMatter.title || "",
      summary: frontMatter.summary || "",
      type: type,
      access: access
    };

    fs.writeFileSync(outJsonPath, JSON.stringify(json, null, 2));

    console.log("[buildSecureContent] Wrote:", relPath);

  } catch (err) {
    console.error("[buildSecureContent] Error processing", filePath, err);
  }
}

process.on("uncaughtException", (err) => {
  console.error("[buildSecureContent] Fatal error:", err);
  process.exit(1);
});

try {
  processDir(contentDir);
} catch (err) {
  console.error("[buildSecureContent] Top-level error:", err);
  process.exit(1);
}
