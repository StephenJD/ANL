// netlify/functions/getFormFrontMatter.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

async function getFormFrontMatter({ formPath }) {
  if (!formPath) throw new Error("Missing formPath");

  const filePath = path.join(process.cwd(), "public", formPath.replace(/^\//, ""), "index.html");
  console.log("[DEBUG] getFormFrontMatter resolved filePath:", filePath);

  if (!fs.existsSync(filePath)) throw new Error(`Form path does not exist: ${filePath}`);
  const html = fs.readFileSync(filePath, "utf8");

  // --- Try YAML first ---
  const yamlMatch = html.match(/^\s*---([\s\S]*?)---/);
  if (yamlMatch) {
    try {
      const frontmatter = yaml.load(yamlMatch[1]);
      console.log("[DEBUG] Loaded YAML frontmatter keys:", Object.keys(frontmatter));
      return frontmatter;
    } catch (err) {
      console.error("[ERROR] Failed to parse YAML frontmatter:", err.message);
      throw new Error("Invalid YAML frontmatter");
    }
  }

  // --- Fallback: look for window.PAGE_FRONTMATTER ---
  const jsMatch = html.match(/window\.PAGE_FRONTMATTER\s*=\s*({[\s\S]*?});/);
  if (jsMatch) {
    try {
      const obj = eval("(" + jsMatch[1] + ")");
      const params = obj.params ? JSON.parse(obj.params) : {};
      const merged = { ...params, title: JSON.parse(obj.title || "null"), path: JSON.parse(obj.path || "null") };
      console.log("[DEBUG] Parsed window.PAGE_FRONTMATTER keys:", Object.keys(merged));
      return merged;
    } catch (err) {
      console.error("[ERROR] Failed to parse PAGE_FRONTMATTER:", err.message);
      throw new Error("Invalid PAGE_FRONTMATTER");
    }
  }

  console.warn("[WARN] No frontmatter or PAGE_FRONTMATTER found in file:", filePath);
  return {};
}

module.exports = getFormFrontMatter;
