// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-11");

let treeRoot = null;
let selectedNodePath = null;

export function renderTree(
    nodes,
    selectNodeCallback = null,
    editButtonsContainerId = "editButtons", // unused now
    selectedNode = null,
    fullTreeRoot = null,
    depth = 0
) {
    if (!nodes) return document.createTextNode("Tree missing");
    if (!treeRoot) treeRoot = fullTreeRoot || nodes;

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "15px";

    nodes.forEach((node) => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        const displayTitle = (node.qualification ? node.qualification + " " : "") + (node.title || node.rawName);

        span.textContent = displayTitle;
        span.style.cursor = "pointer";
        span.style.padding = "2px 4px";

        // Node colour depending on edit state
        span.style.color = node.edit?.moved ? "orange" : "blue";
        // Bold if selected
        span.style.fontWeight = selectedNodePath === node.path ? "bold" : "normal";
        if (selectedNodePath === node.path) span.style.backgroundColor = "#def";

        span.onclick = () => {
            selectedNodePath = node.path;
            // Re-render to update bold + colours
            if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
            // Call external callback for button activation, etc.
            if (typeof selectNodeCallback === "function") selectNodeCallback(node.path);
        };

        li.appendChild(span);

        if (node.children?.length) {
            li.appendChild(renderTree(node.children, selectNodeCallback, editButtonsContainerId, selectedNode, treeRoot, depth + 1));
        }

        ul.appendChild(li);
    });

    return ul;
}
