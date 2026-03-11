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
        if(node.editState === "moved"){
  span.style.color = "red";
}

if(node.editState === "staged"){
  span.style.color = "orange";
}
        // bold if selected
        if (selectedNodePath === node.path) {
            span.style.fontWeight = "bold";
            span.style.backgroundColor = "#def";
        }

        span.onclick = () => {
            if (typeof onSelectNode === "function") {
                onSelectNode(node.path);
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
