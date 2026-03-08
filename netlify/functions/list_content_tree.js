// netlify/functions/list_content_tree.js
import fs from "fs";
import path from "path";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function parseFrontmatter(filePath) {

  try {

    const text = fs.readFileSync(filePath, "utf8");

    if (!text.startsWith("---")) return {};

    const end = text.indexOf("---", 3);
    if (end === -1) return {};

    const raw = text.slice(3, end).trim();

    const obj = {};

    raw.split("\n").forEach(line => {

      const i = line.indexOf(":");
      if (i === -1) return;

      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");

      obj[key] = val;

    });

    return obj;

  } catch {
    return {};
  }

}

function getFolderIndexType(dir) {

  try {

    const indexPath = path.join(dir, "_index.md");

    if (!fs.existsSync(indexPath)) return null;

    const fm = parseFrontmatter(indexPath);

    return fm.type || null;

  } catch {
    return null;
  }

}

function walkDir(dir) {

  const items = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a,b)=>a.name.localeCompare(b.name));
  
  const folderIndexType = getFolderIndexType(dir);

  for (const entry of entries) {

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {

      items.push({
        type: "folder",
        name: entry.name,
        children: walkDir(fullPath)
      });

      continue;
    }

    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    const fm = parseFrontmatter(fullPath);

    const title = fm.title || entry.name;

    const isIndex = entry.name.toLowerCase() === "_index.md";

    let role;

    if (isIndex) {

      role = fm.type === "collated_page"
        ? "Collated"
        : "Navigation";

    } else {

      role = folderIndexType === "collated_page"
        ? "Section"
        : "Content";

    }

    items.push({
      type: "file",
      name: entry.name,
      qualifiedTitle: `${role}: ${title}`,
      path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/")
    });

  }

  return items;

}

export default async function handler() {

  try {

    const tree = walkDir(CONTENT_ROOT);

    return new Response(JSON.stringify(tree), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {

    console.error("[list_content_tree]", err);

    return new Response(
      JSON.stringify({ error: "Failed to generate content tree" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );

  }

                }
