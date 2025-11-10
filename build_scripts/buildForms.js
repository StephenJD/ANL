// \build_scripts\buildForms.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import matter from "gray-matter";

console.log("[buildForms] Starting...");

const contentDir = path.join(process.cwd(), "content");
const outputDir = path.join(process.cwd(), "private_html");

console.log("[buildForms] contentDir:", contentDir);
console.log("[buildForms] outputDir:", outputDir);

// Remove Hugo shortcodes ({{< ... >}} or {{% ... %}})
function stripShortcodes(content) {
  return content
    .replace(/{{<[\s\S]+?>}}/g, "")
    .replace(/{{%[\s\S]+?%}}/g, "");
}

function processDir(dir) {
  console.log("[buildForms] Scanning directory:", dir);
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      console.log("[buildForms] Found markdown:", fullPath);
      processFile(fullPath);
    }
  });
}

function processFile(filePath) {
  try {
    const md = fs.readFileSync(filePath, "utf-8");
    const { data: frontMatter, content: rawContent } = matter(md);

    console.log("[buildForms] Processing:", filePath, "type:", frontMatter.type);

    if (frontMatter.type === "form") {
      const cleanContent = stripShortcodes(rawContent);
      const html = marked.parse(cleanContent);

      const relPath = path
        .relative(contentDir, filePath)
        .replace(/\.md$/, ".html")
	  .toLowerCase();
      const outHtmlPath = path.join(outputDir, relPath);
      const outJsonPath = outHtmlPath.replace(/\.html$/, ".json");

      fs.mkdirSync(path.dirname(outHtmlPath), { recursive: true });
      fs.writeFileSync(outHtmlPath, html);

      const json = {
        title: frontMatter.title || "",
        summary: frontMatter.summary || "",
        validation: [].concat(frontMatter.validation || []),
        restrict_users: [].concat(frontMatter.restrict_users || [])      };
	  
      fs.writeFileSync(outJsonPath, JSON.stringify(json, null, 2));

      console.log("[buildForms] Wrote:", outHtmlPath);
      console.log("[buildForms] Metadata:", outJsonPath);
    }
  } catch (err) {
    console.error("[buildForms] Error processing", filePath, err);
  }
}

process.on("uncaughtException", (err) => {
  console.error("[buildForms] Fatal error:", err);
  process.exit(1);
});

try {
  processDir(contentDir);
  console.log("[buildForms] Done. private_html exists?", fs.existsSync(outputDir));
} catch (err) {
  console.error("[buildForms] Top-level error:", err);
  process.exit(1);
}
