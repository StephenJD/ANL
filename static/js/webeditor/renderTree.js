// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-11");
import { editStateColors } from "./fieldSchema.js";

export function renderTree(nodes, selectedNodePath = null, onSelectNode = null) {

    if (!nodes) return document.createTextNode("Tree missing");

    const ul = document.createElement("ul");

    nodes.forEach((node) => {

        const li = document.createElement("li");
        const span = document.createElement("span");

        const displayTitle =
            (node.qualification ? node.qualification + " " : "") +
            (node.title || node.rawName);

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
          window.log(`[renderTreeView] Rendering node: ${node.title} moved=${!!node.edit?.moved} edited=${!!node.edit?.edited} staged=${!!node.edit?.staged} deleted=${!!node.edit?.deleted}`);
      
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
