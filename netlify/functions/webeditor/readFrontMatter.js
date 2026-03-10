// netlify/functions/webeditor/readFrontMatter.js
import fs from "fs";

export function readFrontMatter(filePath) {
  console.log(`[FM] Reading frontmatter from: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf8");
  const fm = {};
  let inFrontMatter = false;

  const lines = content.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();

    if (line === "---") {
      inFrontMatter = !inFrontMatter;
      continue;
    }

    if (!inFrontMatter) continue;
    if (!line || line.startsWith("#")) continue;

    const match =
      line.match(/^([\w_]+)\s*:\s*(.+)$/) ||
      line.match(/^([\w_]+)\s*=\s*(.+)$/);

    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "type") {
      value = value.split(/\s+/)[0];
    }

    fm[key] = value;
  }

  return fm;
}
