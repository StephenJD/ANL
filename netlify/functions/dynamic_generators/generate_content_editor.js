// file: generateTree.js

const fs = require('fs');
const path = require('path');
const fm = require('front-matter');

function walkDir(dirPath, parent = null, parentType = null) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            const indexFile = path.join(fullPath, '_index.md');
            let folderNode = {
                parent: parent,
                rawName: path.basename(dirPath),
                title: '',
                qualification: '',
                path: path.relative(process.cwd(), fullPath),
                children: []
            };

            if (fs.existsSync(indexFile)) {
                const content = fs.readFileSync(indexFile, 'utf-8');
                const frontMatter = fm(content);
                folderNode.title = frontMatter.attributes.title || folderNode.rawName;
                folderNode.qualification = frontMatter.attributes.qualification || '';
            }

            if (parent) parent.children.push(folderNode);

            walkDir(fullPath, folderNode, determineFolderType(folderNode));

        } else if (stats.isFile() && item.endsWith('.md')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const frontMatter = fm(content);
            const fileNode = {
                parent: parent,
                rawName: item.replace('.md', ''),
                title: frontMatter.attributes.title || item.replace('.md', ''),
                qualification: frontMatter.attributes.qualification || '',
                path: path.relative(process.cwd(), fullPath),
                children: []
            };

            if (parent) parent.children.push(fileNode);
        }
    }
    return parent;
}

function determineFolderType(node) {
    if (!node.parent) return null;
    if (node.qualification === 'Navigation:') return 'document-folder';
    if (node.qualification === 'Collated:') return 'collated-page';
    return 'dynamic';
}

// entry point
function generateTree(rootDir) {
    const rootNode = {
        parent: null,
        rawName: path.basename(rootDir),
        title: '',
        qualification: '',
        path: path.relative(process.cwd(), rootDir),
        children: []
    };
    walkDir(rootDir, rootNode, null);
    return rootNode;
}

module.exports = { generateTree };
