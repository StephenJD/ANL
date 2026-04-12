// build_scripts/buildSecureContent.js

import fs from "fs";
import path from "path";
import { marked } from "marked";
import matter from "gray-matter";
import { urlize } from "../lib/urlize.js";

// -----------------------------
// PATHS
// -----------------------------
const contentDir = path.join(process.cwd(), "content");
const outputDir = path.join(process.cwd(), "private_html");

// -----------------------------
// CLEAN OUTPUT
// -----------------------------
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
fs.mkdirSync(outputDir, { recursive: true });

// -----------------------------
// UTIL
// -----------------------------
function normalizeAccess(accessValue) {
  if (Array.isArray(accessValue)) {
    return accessValue.map((a) => String(a).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof accessValue === "string") {
    return accessValue
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);
  }

  return ["public"];
}

function stripShortcodes(content) {
  return content
    .replace(/{{<[\s\S]+?>}}/g, "")
    .replace(/{{%[\s\S]+?%}}/g, "");
}

// -----------------------------
// COLLECT (UNCHANGED)
// -----------------------------
function collectEntries(dir, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectEntries(fullPath, out);
      return;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) return;

    const md = fs.readFileSync(fullPath, "utf-8");
    const { data: frontMatter, content: rawContent } = matter(md);

    const access = normalizeAccess(frontMatter.access ?? "public");

    out.push({
      filePath: fullPath,
      dirPath: path.dirname(fullPath),
      fileName: path.basename(fullPath).toLowerCase(),

      title: frontMatter.title || "",
      summary: frontMatter.summary || "",
      abstract: frontMatter.abstract || "",

      type: String(frontMatter.type || "").toLowerCase(),
      rawType: frontMatter.type || "",

      access,

      rawContent,
      frontMatter,
    });
  });

  return out;
}

// // -----------------------------
// // AST DSL APPLY (NEW CORE)
// // -----------------------------
// function applyClassDSLToTokens(tokens) {
//   const out = [];
//   let currentClass = null;

//   for (const token of tokens) {
//     console.log("[AST]", {
//       type: token.type,
//       raw: token.raw || token.text || "",
//       currentClass
//     });

//     // CLASS ONLY BLOCK
//     if (
//       token.type === "paragraph" &&
//       token.text &&
//       token.text.trim().match(/^\{\.([a-zA-Z0-9_-]+)\}$/)
//     ) {
//       currentClass = token.text.trim().match(/^\{\.([a-zA-Z0-9_-]+)\}$/)[1];

//       console.log("[DSL]", {
//         event: "class_set",
//         class: currentClass
//       });

//       continue;
//     }

//     // INLINE CLASS
//     if (
//       token.type === "paragraph" &&
//       token.text &&
//       token.text.match(/^\{\.([a-zA-Z0-9_-]+)\}\s*(.*)$/)
//     ) {
//       const match = token.text.match(/^\{\.([a-zA-Z0-9_-]+)\}\s*(.*)$/);

//       token.className = match[1];
//       token.text = match[2];

//       console.log("[DSL]", {
//         event: "inline",
//         class: token.className,
//         text: token.text
//       });

//       out.push(token);
//       continue;
//     }

//     // APPLY CURRENT CLASS
//     if (currentClass && (token.type === "paragraph" || token.type === "heading")) {
//       token.className = currentClass;

//       console.log("[DSL]", {
//         event: "apply",
//         class: currentClass,
//         type: token.type
//       });

//       currentClass = null;
//     }

//     out.push(token);
//   }

//   return out;
// }

// // -----------------------------
// // RENDER (AST SAFE)
// // -----------------------------
// function renderTokens(tokens) {
//   const renderer = new marked.Renderer();

//   renderer.paragraph = (text, token = {}) => {
//     const cls = token.className ? ` class="${token.className}"` : "";
//     return `<p${cls}>${text}</p>`;
//   };

//   renderer.heading = (text, token = {}) => {
//     const cls = token.className ? ` class="${token.className}"` : "";
//     return `<h${token.depth || 1}${cls}>${text}</h${token.depth || 1}>`;
//   };

//   return marked.parser(tokens, { renderer });
// }

// // -----------------------------
// // BUILD ENTRY (AST PIPELINE)
// // -----------------------------
// -----------------------------
// BUILD ENTRY (NO DSL)
// -----------------------------
function buildEntry(entry) {
  console.log("[ENTRY] start", entry.filePath);

  // 1. Strip shortcodes
  const clean = stripShortcodes(entry.rawContent);
  console.log("[ENTRY] cleaned length", clean.length);

  // 2. Parse markdown (HTML allowed)
  const html = marked.parse(clean);
  console.log("[MARKED] output length", html.length);

  console.log("[ENTRY] done", entry.filePath);

  return html;
}

// -----------------------------
// WRITE
// -----------------------------
function writeOutput(entry, html) {
  const rel = path
    .relative(contentDir, entry.filePath)
    .replace(/\.md$/i, ".html")
    .split(path.sep)
    .map((p) => urlize(p))
    .join(path.sep);

  const outHtml = path.join(outputDir, rel);
  const outJson = outHtml.replace(/\.html$/i, ".json");

  fs.mkdirSync(path.dirname(outHtml), { recursive: true });

  fs.writeFileSync(outJson, JSON.stringify(entry.frontMatter, null, 2));

  if (!entry.access.includes("public")) {
    fs.writeFileSync(outHtml, html);
  }
}

// -----------------------------
// MAIN PIPELINE
// -----------------------------
try {
  const entries = collectEntries(contentDir);

  for (const entry of entries) {
    const html = buildEntry(entry);
    writeOutput(entry, html);

    console.log("[buildSecureContent] processed:", entry.filePath);
  }
} catch (err) {
  console.error("[buildSecureContent] Fatal error:", err);
  process.exit(1);
}