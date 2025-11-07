// \build_scripts\buildForms.js
import fs from "fs";
import path from "path";
import { marked } from "marked";
import matter from "gray-matter";

const contentDir = path.join(process.cwd(), "content");
const outputDir = path.join(process.cwd(), "private_html");

// Remove Hugo shortcodes ({{< ... >}} or {{% ... %}})
function stripShortcodes(content) {
  // Match {{< anything >}} including backticks and line breaks
  return content.replace(/{{<[\s\S]+?>}}/g, "")
                .replace(/{{%[\s\S]+?%}}/g, "");
}

// Recursively process a directory
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

// Process a single Markdown file
function processFile(filePath) {
  const md = fs.readFileSync(filePath, "utf-8");
  const { data: frontMatter, content: rawContent } = matter(md);

  if (frontMatter.type === "form") {
    const cleanContent = stripShortcodes(rawContent);
    const html = marked.parse(cleanContent);

    // Preserve directory structure
    const relPath = path.relative(contentDir, filePath).replace(/\.md$/, ".html");
    const outHtmlPath = path.join(outputDir, relPath);
    const outJsonPath = outHtmlPath.replace(/\.html$/, ".json");

    fs.mkdirSync(path.dirname(outHtmlPath), { recursive: true });
    fs.writeFileSync(outHtmlPath, html);

    const json = {
      title: frontMatter.title || "",
      summary: frontMatter.summary || "",
      validation: Array.isArray(frontMatter.validation) ? frontMatter.validation : ["none"],
      restrict_users: Array.isArray(frontMatter.restrict_users) ? frontMatter.restrict_users : []
    };
    fs.writeFileSync(outJsonPath, JSON.stringify(json, null, 2));

    //console.log(`[buildForms] Rendered ${filePath} → ${outHtmlPath}`);
    //console.log(`[buildForms] Metadata saved → ${outJsonPath}`);
  }
}

// Start processing
processDir(contentDir);
