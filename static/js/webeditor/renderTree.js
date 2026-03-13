// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-11");

export function renderTree(nodes, selectedNodePath = null, onSelectNode = null) {

    if (!nodes) return document.createTextNode("Tree missing");

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "15px";

    nodes.forEach((node) => {

        const li = document.createElement("li");
        const span = document.createElement("span");

        const displayTitle =
            (node.qualification ? node.qualification + " " : "") +
            (node.title || node.rawName);

        span.textContent = displayTitle;
        span.style.cursor = "pointer";
        span.style.padding = "2px 4px";

        // colour based on edit state
        if (!node.edit) span.style.color = "blue"; // default color
        else if (node.edit.staged) span.style.color = "orange";
        else if (node.edit.moved || node.edit.edited) span.style.color = "red";
        else span.style.color = "blue";
        // bold if selected
        
        if (selectedNodePath === node.path) {
            span.style.fontWeight = "bold";
            span.style.backgroundColor = "#def";
          window.log(`[renderTreeView] Rendering node: ${node.title} moved=${!!node.edit?.moved} edited=${!!node.edit?.edited} staged=${!!node.edit?.staged}`);
      
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
