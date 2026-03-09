// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "./qualifyTitle.js";



function sortEntries(entries) {
  const priority = n =>
    n === "_index.md" ? 0 :
    n === "home.md" ? 1 :
    n === "user_login.md" ? 2 : 10;

  return entries.sort((a, b) => {
    const pa = priority(a.name);
    const pb = priority(b.name);
    return pa !== pb ? pa - pb : a.name.localeCompare(b.name);
  });
}

function parseFrontMatter(md) {
  const fm = { title: null, type: null };

  const match = md.match(/^---\s*([\s\S]*?)\s*---/);
  if (!match) return fm;

  const front = match[1];

  front.split("\n").forEach(line => {
    const i = line.indexOf(":");
    if (i === -1) return;

    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();

    const comment = value.indexOf("#");
    if (comment >= 0) value = value.slice(0, comment).trim();

    if (key === "title") fm.title = value;
    if (key === "type") fm.type = value;
  });

  return fm;
}

export function walkDir(dir, parentType = null) {
  const entries = sortEntries(
    fs.readdirSync(dir, { withFileTypes: true })
  );

  let folderNode = null;
  const nodes = [];

  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      nodes.push(...walkDir(full, parentType));
      continue;
    }

    if (!e.name.endsWith(".md")) continue;

    const md = fs.readFileSync(full, "utf8");
    const fm = parseFrontMatter(md);

    const title = qualifyTitle(
      fm.title || path.basename(e.name, ".md")
    );

    const node = {
      name: path.basename(e.name, ".md"),
      path: full,
      title,
      type: fm.type || parentType
    };

    if (e.name === "_index.md") {
      folderNode = {
        ...node,
        name: path.basename(dir),
        path: dir,
        children: []
      };
    } else {
      nodes.push(node);
    }
  }

  if (folderNode) {
    folderNode.children = nodes;
    return [folderNode];
  }

  return nodes;
}
