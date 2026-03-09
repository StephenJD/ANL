import fs from "fs";
import path from "path";
import { qualifyTitle } from "./qualifyTitle.js";

/*
KISS front-matter parser
Reads lines between the first two --- markers
*/
function parseFrontMatter(md, filePath = "") {
  const fm = { title: null, type: null };

  if (!md) {
    console.log("[FM] Empty markdown:", filePath);
    return fm;
  }

  const lines = md.split("\n");

  if (lines[0].trim() !== "---") {
    console.log("[FM] No frontmatter start:", filePath);
    return fm;
  }

  console.log("[FM] Reading frontmatter:", filePath);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "---") break;

    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();

    console.log("[FM] line:", key, "=", value);

    if (key === "title") fm.title = value;
    if (key === "type") fm.type = value;
  }

  console.log("[FM] Result:", fm);

  return fm;
}

/*
Sort entries
*/
function sortEntries(entries) {
  const priority = name =>
    name === "_index.md" ? 0 :
    name === "home.md" ? 1 :
    name === "user_login.md" ? 2 :
    10;

  return entries.sort((a, b) => {
    const pa = priority(a.name);
    const pb = priority(b.name);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

/*
Directory walker
*/
export function walkDir(dir, parentType = null) {

  console.log("[walkDir] Entering:", dir);

  let folderNode = null;
  const children = [];

  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error("[walkDir] Failed reading dir:", dir, err);
    return [];
  }

  entries = sortEntries(entries);

  for (const entry of entries) {

    const fullPath = path.join(dir, entry.name);

    /*
    Handle subdirectories
    */
    if (entry.isDirectory()) {

      const sub = walkDir(fullPath, parentType);

      if (sub.length) {
        children.push(...sub);
      }

      continue;
    }

    /*
    Only process markdown
    */
    if (!entry.name.endsWith(".md")) continue;

    console.log("[walkDir] Reading file:", fullPath);

    let content = "";

    try {
      content = fs.readFileSync(fullPath, "utf8");
    } catch (err) {
      console.error("[walkDir] Failed reading file:", fullPath, err);
      continue;
    }

    const fm = parseFrontMatter(content, fullPath);

    const rawTitle = fm.title || path.basename(entry.name, ".md");

    console.log("[walkDir] Raw title:", rawTitle);

    const title = qualifyTitle(rawTitle);

    console.log("[walkDir] Qualified title:", title);

    const type = fm.type || parentType;

    /*
    Folder definition
    */
    if (entry.name === "_index.md") {

      folderNode = {
        name: path.basename(dir),
        path: dir,
        title,
        type,
        children: []
      };

      continue;
    }

    /*
    Normal document
    */
    children.push({
      name: path.basename(entry.name, ".md"),
      path: fullPath,
      title,
      type
    });
  }

  if (folderNode) {
    folderNode.children = children;
    return [folderNode];
  }

  return children;
      }
