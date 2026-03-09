// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "../../../static/js/webeditor/qualifyTitle.js";

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

// Recursively walk directory to build tree with logging
export function walkDir(dir, parentType = null) {
  console.log("[walkDir] Entering dir:", dir);

  let folderNode = null; // will represent the folder if _index.md exists
  const children = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const childNode = walkDir(fullPath, parentType);
        if (childNode) children.push(childNode);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (ext === ".md") {
          const content = fs.readFileSync(fullPath, "utf8");
          const fm = parseFrontMatter(content);

          // If this is an _index.md, treat as folder node
          if (entry.name === "_index.md") {
            folderNode = {
              name: path.basename(dir),
              path: dir,
              title: qualifyTitle(fm.title || path.basename(dir)),
              type: fm.type || parentType,
              children: [],
            };
          } else {
            children.push({
              name: path.basename(entry.name, ext),
              path: fullPath,
              title: qualifyTitle(fm.title || path.basename(entry.name, ext)),
              type: fm.type || parentType,
            });
          }
        }
      }
    }

    if (folderNode) return [folderNode];
    if (children.length) return children;
return [];} catch (err) {
    console.error("[walkDir] Error reading dir:", dir, err);
    return null;
  }
}
