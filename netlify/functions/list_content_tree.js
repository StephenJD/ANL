// \netlify\functions\list_content_tree.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "../../static/js/webeditor/qualifyTitle.js";

// Parses front matter for title and type
function parseFrontMatter(md) {
  const fm = { title: null, type: null };
  if (!md || typeof md !== "string") return fm;

  const parts = md.split("---");
  if (parts.length < 3) return fm;

  const frontRaw = parts[1];
  frontRaw.split("\n").forEach(line => {
    const i = line.indexOf(":");
    if (i > 0) {
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      const hashIdx = value.indexOf("#");
      if (hashIdx >= 0) value = value.slice(0, hashIdx).trim();
      if (key === "title") fm.title = value;
      if (key === "type") fm.type = value;
    }
  });
  return fm;
}

// Recursively walk directory to build tree
function walkDir(dir, parentType = null) {
  const items = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

    // First, check if _index.md exists in this folder
    const indexEntry = entries.find(e => e.isFile() && e.name.toLowerCase() === "_index.md");
    let folderType = null;
    let folderTitle = null;

    if (indexEntry) {
      const fullIndexPath = path.join(dir, indexEntry.name);
      const raw = fs.readFileSync(fullIndexPath, "utf-8");
      const fm = parseFrontMatter(raw);
      folderType = fm.type || "dynamic";
      folderTitle = fm.title || indexEntry.name;

      // Add the _index.md as a pseudo-folder node
      items.push({
        type: folderType,
        name: indexEntry.name,
        title: folderTitle,
        qualifiedTitle: qualifyTitle({ type: folderType, title: folderTitle, name: indexEntry.name }, parentType),
        path: path.relative(process.cwd(), fullIndexPath).replace(/\\/g, "/"),
        children: []
      });
    }

    // Process all other entries
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const children = walkDir(fullPath, folderType);
        // Use folder name if no _index.md
        const childFolderNode = {
          type: "folder",
          name: entry.name,
          title: entry.name,
          qualifiedTitle: qualifyTitle({ type: folderType || "folder", title: entry.name, name: entry.name }, parentType),
          children
        };
        items.push(childFolderNode);
      } else if (entry.name.toLowerCase().endsWith(".md") && entry.name.toLowerCase() !== "_index.md") {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const fm = parseFrontMatter(raw);
        const nodeType = fm.type || "dynamic";
        const nodeTitle = fm.title || entry.name;
        items.push({
          type: nodeType,
          name: entry.name,
          title: nodeTitle,
          qualifiedTitle: qualifyTitle({ type: nodeType, title: nodeTitle, name: entry.name }, folderType),
          path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
        });
      }
    }

  } catch (err) {
    console.error("[list_content_tree] Error reading dir:", dir, err);
  }
  return items;
}

export default async function handler(event, context) {
  try {
    const rootDir = path.join(process.cwd(), "content");
    console.log("Listing content at:", rootDir, fs.existsSync(rootDir));

    const tree = walkDir(rootDir);

    return new Response(JSON.stringify(tree), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("[list_content_tree] Fatal error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate content tree" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
