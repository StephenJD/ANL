// netlify/functions/webeditor/walkDir.js
import fs from "fs";
import path from "path";
import { qualifyTitle } from "./qualifyTitle.js";

export async function walkDir(dir, parentType = null) {
    console.log(`[walkDir] Entering: ${dir} | parentType: ${parentType}`);

    const children = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    let folders = [];
    let files = [];

    for (const entry of entries) {
        if (entry.isDirectory()) folders.push(entry);
        else if (entry.isFile() && entry.name.endsWith(".md")) files.push(entry);
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const homeIndex = folders.findIndex(f => f.name === "home");
    if (homeIndex > -1) {
        const [homeFolder] = folders.splice(homeIndex, 1);
        folders.unshift(homeFolder);
    }

    const userLoginIndex = files.findIndex(f => f.name === "user-login.md");
    if (userLoginIndex > -1) {
        const [userLoginFile] = files.splice(userLoginIndex, 1);
        files.unshift(userLoginFile);
    }

    for (const entry of folders) {
        const fullPath = path.join(dir, entry.name);
        console.log(`[walkDir] Entering folder: ${fullPath}`);

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

        console.log(`[walkDir] Passing to qualifyTitle | nodeType: ${folderNode.type}, parentType: ${parentType}`);
        folderNode.qualifiedTitle = qualifyTitle(folderNode, parentType);
        console.log(`[walkDir] Raw title: ${folderNode.title}`);
        console.log(`[walkDir] Qualified title: ${folderNode.qualifiedTitle}`);

        folderNode.children = await walkDir(fullPath, type);

        children.push(folderNode);
    }

    for (const entry of files) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === "_index.md") continue;

        console.log(`[walkDir] Reading file: ${fullPath}`);
        const fm = readFrontMatter(fullPath);

        const node = {
            name: path.basename(entry.name, ".md"),
            path: fullPath,
            title: fm.title || path.basename(entry.name, ".md"),
            type: fm.type || "document"
        };

        console.log(`[walkDir] Passing to qualifyTitle | nodeType: ${node.type}, parentType: ${parentType}`);
        node.qualifiedTitle = qualifyTitle(node, parentType);
        console.log(`[walkDir] Raw title: ${node.title}`);
        console.log(`[walkDir] Qualified title: ${node.qualifiedTitle}`);

        children.push(node);
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
