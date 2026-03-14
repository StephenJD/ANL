// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-11");

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
        if (node.edit?.staged) span.classList.add("tree-node--staged");
        else if (node.edit?.local) span.classList.add("tree-node--local");
        else if (node.edit?.moved) span.classList.add("tree-node--moved");
        else if (node.edit?.edited) span.classList.add("tree-node--edited");
        else span.classList.add("tree-node--default");
        // bold if selected
        
        if (selectedNodePath === node.path) {
            span.classList.add("tree-node--selected");
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
