// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-10");

let treeRoot = null;
let buttonsInitialised = false;

export function renderTree(
    nodes,
    startEditCallback,        // unused for buttons now
    editButtonsContainerId = "editButtons",
    selectedNodePath = null,
    fullTreeRoot = null,
    depth = 0,
    onNodeSelect = null       // NEW: callback when node is clicked
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

        // Colouring
        span.style.color = node.edit?.moved ? "orange" : "blue";
        if (selectedNodePath === node.path) {
            span.style.fontWeight = "bold";
            span.style.backgroundColor = "#def";
        }

        span.onclick = () => {
            if (typeof onNodeSelect === "function") onNodeSelect(node.path);
        };

        li.appendChild(span);

        if (node.children?.length) {
            li.appendChild(
                renderTree(
                    node.children,
                    startEditCallback,
                    editButtonsContainerId,
                    selectedNodePath,
                    treeRoot,
                    depth + 1,
                    onNodeSelect
                )
            );
        }

        ul.appendChild(li);
    });

    // Top-level: initialize buttons once
    if (depth === 0 && !buttonsInitialised) {
        window.log("[renderTree] TOP LEVEL COMPLETE → initialise buttons");
        import("./editButtons.js").then(({ initEditButtons }) => {
            initEditButtons(editButtonsContainerId, treeRoot, startEditCallback);
        });
        buttonsInitialised = true;
    }

    return ul;
}
