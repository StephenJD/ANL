// netlify/functions/list_content_tree.js
import fs from "fs";
import path from "path";

function walkDir(dir) {
  const items = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        items.push({
          type: "folder",
          name: entry.name,
          children: walkDir(fullPath)
        });
      } else if (entry.name.endsWith(".md") || entry.name.endsWith(".html") || entry.name.endsWith(".json")) {
        items.push({
          type: "file",
          name: entry.name,
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
    const rootDir = path.join(process.cwd(), "netlify/functions/private_html");
    console.log("Listing private_html at:", rootDir, fs.existsSync(rootDir));

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
