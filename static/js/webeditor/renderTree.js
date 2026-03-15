// static/js/webeditor/renderTree.js
if (typeof window !== "undefined" && typeof window.log !== "function") {
    window.log = function (...args) { console.log(...args); };
}
window.log("renderTree FILE LOADED 2026-03-11");
import { editStateColors } from "./fieldSchema.js";

function extractTitleFromEditedContent(content) {
    const text = String(content || "");
    if (!text) return "";
    const frontMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const front = frontMatch ? frontMatch[1] : "";
    if (!front) return "";
    const lines = front.split(/\r?\n/);
    for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx <= 0) continue;
        const key = line.slice(0, idx).trim().toLowerCase();
        if (key !== "title") continue;
        let value = line.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        return value;
    }
    return "";
}

function resolveNodeTitle(node) {
    if (node?.edit?.edited) {
        const editedTitle = extractTitleFromEditedContent(node.edit.edited);
        if (editedTitle) return editedTitle;
    }
    const originalTitle = String(node?.frontMatterOriginal?.title || "").trim();
    if (originalTitle) return originalTitle;
    const nodeTitle = String(node?.title || "").trim();
    if (nodeTitle) return nodeTitle;
    return node?.rawName || "";
}

export function renderTree(nodes, selectedNodePath = null, onSelectNode = null) {

    if (!nodes) return document.createTextNode("Tree missing");

    const ul = document.createElement("ul");

    nodes.forEach((node) => {

        const li = document.createElement("li");
        const span = document.createElement("span");

        const resolvedTitle = resolveNodeTitle(node);
        const displayTitle =
            (node.qualification ? node.qualification + " " : "") +
            resolvedTitle;

        span.textContent = displayTitle;
        span.classList.add("tree-node");

        // colour based on edit state
        let color;
        if (node.edit?.edited) color = editStateColors.edited;
        else if (node.edit?.staged) color = editStateColors.staged;
        else if (node.edit?.local) color = editStateColors.local;
        else if (node.edit?.moved) color = editStateColors.moved;
        else color = editStateColors.default;
        span.style.color = color;
        if (node.edit?.deleted) span.style.textDecoration = "line-through";
        // bold if selected
        
        if (selectedNodePath === node.path) {
            span.classList.add("tree-node--selected");
                    window.log(`[renderTreeView] Rendering node: ${resolvedTitle} moved=${!!node.edit?.moved} edited=${!!node.edit?.edited} staged=${!!node.edit?.staged} deleted=${!!node.edit?.deleted}`);
      
        }

        span.onclick = () => {
            if (typeof onSelectNode === "function") {
                onSelectNode(node.path);
            }
        };
        span.ondblclick = () => {
            if (typeof onSelectNode === "function") {
                onSelectNode(node.path);
            }
            if (typeof window.showEditorForSelectedNode === "function") {
                window.showEditorForSelectedNode();
            }
        };

        li.appendChild(span);

        if (node.children?.length) {
            li.appendChild(
                renderTree(
                    node.children,
                    selectedNodePath,
                    onSelectNode
                )
            );
        }

        ul.appendChild(li);

    });

    return ul;
}
