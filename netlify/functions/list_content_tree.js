import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");

function walk(dir, rel = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .map(e => {
      const full = path.join(dir, e.name);
      const relative = path.join(rel, e.name);

      if (e.isDirectory()) {
        return {
          type: "folder",
          name: e.name,
          path: relative,
          children: walk(full, relative)
        };
      }

      if (e.isFile() && e.name.endsWith(".md")) {
        return {
          type: "file",
          name: e.name,
          path: relative
        };
      }

      return null;
    })
    .filter(Boolean);
}

export default async function list_content_tree() {

  const tree = walk(contentRoot);

  return JSON.stringify(tree);
}
