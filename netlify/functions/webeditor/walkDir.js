// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "./qualifyTitle.js";

export async function walkDir(dir, parentType = null) {
    console.log(`[walkDir] Entering: ${dir}`);

    const children = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            console.log(`[walkDir] Entering folder: ${fullPath}`);

            // Check for _index.md in folder
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

            children.push(folderNode);
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

            children.push(node);
        }
    }

    return children;
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
            // Remove surrounding quotes
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
