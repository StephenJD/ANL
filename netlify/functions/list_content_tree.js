// \netlify\functions\list_content_tree.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "../../static/js/webeditor/qualifyTitle.js";

function parseFrontMatter(md) {
  const fm = { title: null, type: null };
  if (!md || typeof md !== "string") return fm;

  const parts = md.split("---");
  if (parts.length < 3) return fm;

  const frontRaw = parts[1];
  frontRaw.split("\n").forEach(line => {
    const i = line.indexOf(":");
    if (i > 0) {
      const key = line.slice(0,i).trim();
      let value = line.slice(i+1).trim();
      const hashIdx = value.indexOf("#");
      if (hashIdx >= 0) value = value.slice(0,hashIdx).trim();
      if (key === "title") fm.title = value;
      if (key === "type") fm.type = value;
    }
  });
  return fm;
}

function walkDir(dir) {
  const items = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=> a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        items.push({
          type: "folder",
          name: entry.name,
          children: walkDir(fullPath)
        });
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const fm = parseFrontMatter(raw);
        items.push({
          type: fm.type || "dynamic",
          name: entry.name,
          title: fm.title || entry.name,
          qualifiedTitle: qualifyTitle({ type: fm.type || "dynamic", title: fm.title || entry.name, name: entry.name }),
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
