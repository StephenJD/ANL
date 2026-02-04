// \build_scripts\buildSecureContent.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import matter from "gray-matter";

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

// Convert string to URL-friendly path (lowercase, hyphens)
function urlize(str) {
  return str
    .trim()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    // allow dots but remove illegal chars
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    // collapse multiple hyphens
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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
    const t = (frontMatter.type || "").toLowerCase();
    if (t !== "form" && t !== "secure_page" && t !== "auth") return;

    const cleanContent = stripShortcodes(rawContent);
    const html = marked.parse(cleanContent);

    let relPath = path.relative(contentDir, filePath).replace(/\.md$/, ".html");
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
      type: frontMatter.type,
      validation: [].concat(frontMatter.validation || []),
      restrict_users: [].concat(frontMatter.restrict_users || []),
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
