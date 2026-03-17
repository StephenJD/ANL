// build_scripts\buildSecureContent.js
// --- Auto-generate generator_imports.js for dynamic page generators ---
function updateGeneratorImports() {
  const genDir = path.join(process.cwd(), "netlify", "functions", "dynamic_generators");
  const files = fs.readdirSync(genDir).filter(f => f.startsWith("generate_") && f.endsWith(".js"));
  const imports = files.map(f => {
    const base = f.replace(/\.js$/, "");
    return `import ${base} from \"./${f}\";`;
  });
  const exports = files.map(f => f.replace(/\.js$/, "")).join(",\n  ");
  const content = `${imports.join("\n")}
\nexport const dynamicRuntimes = {\n  ${exports}\n};\n`;
  const outPath = path.join(genDir, "generator_imports.js");
  fs.writeFileSync(outPath, content);
  console.log("[buildSecureContent] Updated generator_imports.js with:", files);
}

updateGeneratorImports();
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

function toOutputRelPath(filePath) {
  const rel = path.relative(contentDir, filePath).replace(/\.md$/i, ".html");
  return rel
    .split(path.sep)
    .map((segment) => urlize(segment))
    .join(path.sep);
}

function toPublicHref(filePath) {
  const relNoExt = path.relative(contentDir, filePath).replace(/\.md$/i, "");
  const parts = relNoExt
    .split(path.sep)
    .map((segment) => urlize(segment))
    .filter(Boolean);

  if (parts[parts.length - 1] === "_index") {
    parts.pop();
  }

  const joined = parts.join("/");
  return joined ? `/${joined}/` : "/";
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plainText(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sortByTitleThenPath(a, b) {
  const titleCmp = (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
  if (titleCmp !== 0) return titleCmp;
  return a.filePath.localeCompare(b.filePath);
}

function collectEntries(dir, out = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectEntries(fullPath, out);
      return;
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      return;
    }

    const md = fs.readFileSync(fullPath, "utf-8");
    const { data: frontMatter, content: rawContent } = matter(md);
    const type = String(frontMatter.type || "").toLowerCase();

    out.push({
      filePath: fullPath,
      dirPath: path.dirname(fullPath),
      fileName: path.basename(fullPath).toLowerCase(),
      outRelPath: toOutputRelPath(fullPath),
      href: toPublicHref(fullPath),
      title: frontMatter.title || "",
      summary: frontMatter.summary || "",
      abstract: frontMatter.abstract || "",
      rawType: frontMatter.type || "",
      type,
      access: normalizeAccess(frontMatter.access || "public"),
      last_reviewed: frontMatter.last_reviewed || "",
      review_period: frontMatter.review_period || "",
      reviewed_by: frontMatter.reviewed_by || "",
      rawContent,
      frontMatter // keep all original front matter fields for later merging
    });
  });

  return out;
}

function buildListFolderHtml(currentEntry, allEntries) {
  const html = [];
  html.push(`<h1>${escapeHtml(currentEntry.title)}</h1>`);

  const childSections = allEntries
    .filter((entry) =>
      entry.filePath !== currentEntry.filePath &&
      entry.fileName === "_index.md" &&
      path.dirname(entry.dirPath) === currentEntry.dirPath
    )
    .sort(sortByTitleThenPath);

  const childFolderPages = allEntries
    .filter((entry) =>
      entry.dirPath === currentEntry.dirPath &&
      entry.fileName !== "_index.md" &&
      entry.type === "document-folder"
    )
    .sort(sortByTitleThenPath);

  if (childSections.length || childFolderPages.length) {
    html.push(`<div class="directory-style">`);

    childSections.forEach((entry) => {
      html.push(`<p><a href="${entry.href}">${escapeHtml(entry.title)}/</a></p>`);
    });

    childFolderPages.forEach((entry) => {
      html.push(`<p><a href="${entry.href}">${escapeHtml(entry.title)}/</a></p>`);
    });

    html.push(`</div>`);
  }

  const summaryPages = allEntries
    .filter((entry) =>
      entry.dirPath === currentEntry.dirPath &&
      (["document", "form"].includes(entry.type) || entry.type.startsWith("dynamic"))
    )
    .sort(sortByTitleThenPath);

  summaryPages.forEach((entry) => {
    html.push(`<div class="summary-style">`);
    html.push(`<p><a href="${entry.href}">${escapeHtml(entry.title)}</a></p>`);

    if (entry.summary) {
      html.push(escapeHtml(plainText(entry.summary)));
    } else if (entry.abstract) {
      html.push(escapeHtml(plainText(entry.abstract).slice(0, 250)));
    }

    html.push(`</div>`);
  });

  return html.join("\n");
}

function buildPrivateHtml(entry, allEntries) {
  if (entry.type === "document-folder") {
    return buildListFolderHtml(entry, allEntries);
  }

  // KISS: Treat all HTML (even indented) as raw HTML
  // 1. Extract all HTML blocks (lines starting with optional spaces then <tag ...> ... </tag>), unindent, and join
  // 2. Remove those lines from the Markdown, then pass the rest through marked
  // 3. Concatenate raw HTML and marked output

  const cleanContent = stripShortcodes(entry.rawContent);
  const lines = cleanContent.split(/\r?\n/);
  let htmlBlocks = [];
  let nonHtmlLines = [];
  let inHtmlBlock = false;
  let htmlBuffer = [];
  const htmlOpenTag = /^\s*<([a-zA-Z][\w-]*)(\s|>|$)/;
  const htmlCloseTag = /^\s*<\/[a-zA-Z][\w-]*\s*>/;

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (!inHtmlBlock && htmlOpenTag.test(line)) {
      inHtmlBlock = true;
      htmlBuffer.push(line);
    } else if (inHtmlBlock) {
      htmlBuffer.push(line);
      if (htmlCloseTag.test(line)) {
        // End of HTML block
        // Unindent all lines in htmlBuffer
        const unindented = htmlBuffer.map(l => l.replace(/^\s+/, ""));
        htmlBlocks.push(unindented.join("\n"));
        htmlBuffer = [];
        inHtmlBlock = false;
      }
    } else {
      nonHtmlLines.push(line);
    }
  }
  // If file ends while in HTML block, flush buffer
  if (htmlBuffer.length) {
    const unindented = htmlBuffer.map(l => l.replace(/^\s+/, ""));
    htmlBlocks.push(unindented.join("\n"));
  }

  // Join non-HTML lines and pass through marked
  const nonHtmlContent = nonHtmlLines.join("\n");
  const markedOutput = marked.parse(nonHtmlContent);
  // Concatenate all raw HTML blocks and marked output
  return htmlBlocks.join("\n") + "\n" + markedOutput;
}

process.on("uncaughtException", (err) => {
  console.error("[buildSecureContent] Fatal error:", err);
  process.exit(1);
});

try {
  const entries = collectEntries(contentDir);

  entries.forEach((entry) => {
    const outHtmlPath = path.join(outputDir, entry.outRelPath);
    const outJsonPath = outHtmlPath.replace(/\.html$/i, ".json");
    fs.mkdirSync(path.dirname(outHtmlPath), { recursive: true });

    if (!entry.access.includes("public")) {
      const html = buildPrivateHtml(entry, entries);
      fs.writeFileSync(outHtmlPath, html);
    }

    // Copy all front matter fields, but ensure normalized/required fields are present and correct
    const json = {
      ...entry.frontMatter, // all original front matter fields
      // override/ensure these fields are always present and normalized
      title: entry.title,
      summary: entry.summary,
      type: entry.rawType,
      access: entry.access,
      last_reviewed: entry.last_reviewed,
      review_period: entry.review_period,
      reviewed_by: entry.reviewed_by
    };

    fs.writeFileSync(outJsonPath, JSON.stringify(json, null, 2));
    console.log("[buildSecureContent] Wrote:", entry.outRelPath);
  });
} catch (err) {
  console.error("[buildSecureContent] Top-level error:", err);
  process.exit(1);
}
