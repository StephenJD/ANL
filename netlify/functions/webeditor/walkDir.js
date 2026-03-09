// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "./qualifyTitle.js";

export async function walkDir(dir, parentType = null) {
    console.log(`[walkDir] Entering: ${dir} | parentType: ${parentType}`);

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folderNodes = [];
    const fileNodes = [];
    let homeNode = null;
    let loginNodes = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const indexPath = path.join(fullPath, "_index.md");
            let fm = {};
            let type = "document-folder";

            if (fs.existsSync(indexPath)) {
                console.log(`[walkDir] Reading file: ${indexPath}`);
                fm = readFrontMatter(indexPath);
                type = fm.type || type;
            }

            const folderNode = {
                name: path.basename(fullPath),
                path: fullPath,
                title: fm.title || path.basename(fullPath),
                type,
                children: []
            };

            folderNode.qualifiedTitle = qualifyTitle(folderNode, parentType);
            console.log(`[walkDir] Raw title: ${folderNode.title}`);
            console.log(`[walkDir] Qualified title: ${folderNode.qualifiedTitle}`);

            folderNode.children = await walkDir(fullPath, type);

            if (type === "home" && !parentType) {
                homeNode = folderNode;
            } else {
                folderNodes.push(folderNode);
            }
        }
        else if (entry.isFile() && entry.name.endsWith(".md")) {
            if (entry.name === "_index.md") continue;

            console.log(`[walkDir] Reading file: ${fullPath}`);
            const fm = readFrontMatter(fullPath);

            const node = {
                name: path.basename(entry.name, ".md"),
                path: fullPath,
                title: fm.title || path.basename(entry.name, ".md"),
                type: fm.type || "document"
            };

            node.qualifiedTitle = qualifyTitle(node, parentType);
            console.log(`[walkDir] Raw title: ${node.title}`);
            console.log(`[walkDir] Qualified title: ${node.qualifiedTitle}`);

            if (!parentType && node.type === "login") {
                loginNodes.push(node);
            } else {
                fileNodes.push(node);
            }
        }
    }

    folderNodes.sort((a, b) => a.name.localeCompare(b.name));
    fileNodes.sort((a, b) => a.name.localeCompare(b.name));
    loginNodes.sort((a, b) => a.name.localeCompare(b.name));

    const result = [];

    if (!parentType) {
        if (homeNode) result.push(homeNode);
        result.push(...loginNodes);
    }

    result.push(...folderNodes, ...fileNodes);

    return result;
}

function readFrontMatter(filePath) {
    console.log(`[FM] Reading frontmatter: ${filePath}`);
    const content = fs.readFileSync(filePath, "utf8");
    const fm = {};
    const lines = content.split(/\r?\n/);

    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(/^([\w_]+)\s*=\s*(.+)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            fm[key] = value;
            console.log(`[FM] line: ${line}`);
        }
    }

    console.log(`[FM] Result:`, fm);
    return fm;
              }
