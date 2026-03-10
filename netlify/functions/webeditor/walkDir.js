// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualification } from "./qualification.js";
import { readFrontMatter } from "./readFrontMatter.js";

export async function walkDir(dir, parentType = null, rootDir = dir, parentNode = null) {
  console.log(`[walkDir] Entering: ${dir} | parentType: ${parentType}`);

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folderNodes = [];
  const fileNodes = [];
  let homeNode = null;
  const loginNodes = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const indexPath = path.join(fullPath, "_index.md");
      let fm = {};
      let type = "document";

      if (fs.existsSync(indexPath)) {
        console.log(`[walkDir] Reading _index.md: ${indexPath}`);
        fm = readFrontMatter(indexPath);
        type = fm.type || type;
      }

      const folderNode = {
        parent: parentNode,
        rawName: path.basename(fullPath),
        title: fm.title || "",
        qualification: qualification(type, parentType),
        path: relativePath,
        children: []
      };

      console.log(`[walkDir] Folder node created:`, folderNode);

      folderNode.children = await walkDir(fullPath, type, rootDir, folderNode);

      if (type === "home" && !parentType) {
        homeNode = folderNode;
      } else {
        folderNodes.push(folderNode);
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (entry.name === "_index.md") continue;

      console.log(`[walkDir] Reading file: ${fullPath}`);
      const fm = readFrontMatter(fullPath);
      const type = fm.type || "document";

      const fileNode = {
        parent: parentNode,
        rawName: path.basename(entry.name, ".md"),
        title: fm.title || "",
        qualification: qualification(type, parentType),
        path: relativePath,
        children: []
      };

      console.log(`[walkDir] File node created:`, fileNode);

      if (!parentType && type === "login") {
        loginNodes.push(fileNode);
      } else {
        fileNodes.push(fileNode);
      }
    }
  }

  folderNodes.sort((a, b) => a.rawName.localeCompare(b.rawName));
  fileNodes.sort((a, b) => a.rawName.localeCompare(b.rawName));
  loginNodes.sort((a, b) => a.rawName.localeCompare(b.rawName));

  const result = [];

  if (!parentType) {
    if (homeNode) result.push(homeNode);
    result.push(...loginNodes);
  }

  result.push(...folderNodes, ...fileNodes);

  return result;
}

function readFrontMatter(filePath) {
  console.log(`[FM] Reading frontmatter from: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf8");
  const fm = {};
  const rawLines = [];
  let inFrontMatter = false;

  const lines = content.split(/\r?\n/);
  for (let line of lines) {
    rawLines.push(line);
    line = line.trim();

    if (line === "---") {
      inFrontMatter = !inFrontMatter;
      continue;
    }

    if (!inFrontMatter) continue;
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([\w_]+)\s*:\s*(.+)$/) || line.match(/^([\w_]+)\s*=\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      fm[key] = value;
    } else {
      console.log(`[FM] Unparsed line: "${line}"`);
    }
  }

  //console.log(`[FM] Raw frontmatter lines for ${filePath}:`);
  //rawLines.forEach((l, i) => console.log(`  ${i + 1}: ${l}`));

  //console.log(`[FM] Parsed frontmatter object:`, fm);
  return fm;
                                     }
