// static/js/webeditor/renderTree.js

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

// Stub actions in renderTree itself
function copyNodeUrl(node) {
    window.log(`[stub] Copy URL for node: ${node.path}`);
}
function saveNode(node) {
    window.log(`[stub] Save node: ${node.path}`);
}
function publishNode(node) {
    window.log(`[stub] Publish node: ${node.path}`);
}

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null
) {
    window.log("[renderTree] Called with nodes:", nodes);

    if (!nodes) {
        window.log("[renderTree] Tree data missing");
        return document.createTextNode("Tree data missing");
    }

    if (!fullTreeRoot) fullTreeRoot = nodes;

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "15px";

    nodes.forEach((node) => {
        if (!node) {
            window.log("[renderTree] Warning: null/undefined node encountered");
            return;
        }

        const li = document.createElement("li");
        li.style.position = "relative";

        const displayTitle = node.qualification + " " + (node.title || node.rawName);
        const titleSpan = document.createElement("span");
        titleSpan.textContent = displayTitle;
        titleSpan.style.display = "inline-block";
        titleSpan.style.cursor = "pointer";
        titleSpan.style.padding = "2px 4px";

        // Colour based on edit flags
        if (node.edit && node.edit.moved) {
            titleSpan.style.color = "orange";
            window.log(`[renderTree] Node ${node.path} coloured orange (moved)`);
        } else if (node.edit) {
            titleSpan.style.color = "blue";
            window.log(`[renderTree] Node ${node.path} coloured blue (edited)`);
        } else {
            titleSpan.style.color = "black";
        }

        if (selectedNodePath === node.path) {
            titleSpan.style.fontWeight = "bold";
            titleSpan.style.backgroundColor = "#def";
            window.log(`[renderTree] Node ${node.path} is selected`);
        }

        titleSpan.onclick = (e) => {
            e.preventDefault();
            window.selectedNodePath = node.path;
            window.log(`[renderTree] Node clicked: ${node.path}`);
            if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
        };

        li.appendChild(titleSpan);

        // Recursively render children
        if (node.children && node.children.length) {
            const childrenUl = renderTree(
                node.children,
                startEditCallback,
                editButtonsContainerId,
                selectedNodePath,
                fullTreeRoot
            );
            li.appendChild(childrenUl);
        }

        ul.appendChild(li);
    });

    // Bottom bar buttons
    const btnContainer = document.getElementById(editButtonsContainerId);
    if (btnContainer) {
        window.log("[renderTree] Setting up bottom-bar buttons");
        btnContainer.innerHTML = "";

        const isNodeSelected = !!selectedNodePath;
        window.log(`[renderTree] Node selected: ${isNodeSelected}`);

        const buttons = [
            { id: "up", label: "↑", action: (n) => moveNode(n, "up", fullTreeRoot) },
            { id: "down", label: "↓", action: (n) => moveNode(n, "down", fullTreeRoot) },
            { id: "left", label: "←", action: (n) => moveNode(n, "left", fullTreeRoot) },
            { id: "right", label: "→", action: (n) => moveNode(n, "right", fullTreeRoot) },
            { id: "after", label: "→|", action: (n) => moveAfterNextSelected(n, fullTreeRoot, window.nextSelectedPath) },
            { id: "copyUrl", label: "🔗", action: (n) => copyNodeUrl(n) },
            { id: "edit", label: "✎", action: (n) => startEditCallback(n.path) },
            { id: "save", label: "💾", action: (n) => saveNode(n) },
            { id: "drop", label: "↺", action: (n) => dropMove(n) },
            { id: "publish", label: "📤", action: (n) => publishNode(n) },
        ];

        buttons.forEach((btn) => {
            const b = document.createElement("button");
            b.textContent = btn.label;
            b.disabled = !isNodeSelected;
            b.onclick = (e) => {
                e.stopPropagation();
                if (!isNodeSelected) {
                    window.log(`[renderTree] Button ${btn.id} clicked but no node selected`);
                    return;
                }
                const node = findNodeByPath(fullTreeRoot, selectedNodePath);
                if (!node) {
                    window.log(`[renderTree] Button ${btn.id} clicked but selected node not found`);
                    return;
                }
                window.log(`[renderTree] Button ${btn.id} clicked on node ${node.path}`);
                btn.action(node);
                if (typeof renderTree.reRender === "function") {
                    window.log("[renderTree] Re-rendering tree after button action");
                    renderTree.reRender(selectedNodePath);
                }
            };
            btnContainer.appendChild(b);
        });
    } else {
        window.log(`[renderTree] No button container found with id '${editButtonsContainerId}'`);
    }

    return ul;
}

// Utility to find node by path
function findNodeByPath(nodes, path) {
    for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children && n.children.length) {
            const found = findNodeByPath(n.children, path);
            if (found) return found;
        }
    }
    return null;
              }
