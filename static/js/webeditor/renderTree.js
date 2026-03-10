// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-10");

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

let treeRoot = null;
let startEditCallbackRef = null;
let buttonsInitialised = false;
let selectedNodePath = null;

/* --------------------------------------------------
BUTTONS
-------------------------------------------------- */
function updateButtons(nodeSelected) {
    const btnIds = ["up","down","left","right","after","copyUrl","edit","save","drop","publish"];
    btnIds.forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) {
            window.log(`[renderTree] WARNING: button ${id} not found`);
            return;
        }
        btn.disabled = !nodeSelected;
        window.log(`[renderTree] button ${id} disabled=${btn.disabled}`);
    });
}

function setupEditButtons() {
    const container = document.getElementById("editButtons");
    window.log("[renderTree] setupEditButtons START id=editButtons");

    if (!container) {
        window.log("[renderTree] container lookup = NOT FOUND");
        return;
    }

    window.log("[renderTree] container lookup = FOUND");

    // force container to have non-zero size
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "center";
    container.style.height = "auto";
    container.style.width = "100%";
    container.style.minHeight = "2.5em";
    container.style.gap = "0.2em";
    container.style.visibility = "visible";

    window.log(`[renderTree] container display=${container.style.display}`);
    window.log(`[renderTree] container visibility=${container.style.visibility}`);
    window.log(`[renderTree] container height=${container.style.height}`);
    window.log(`[renderTree] container width=${container.style.width}`);
    window.log("[renderTree] children BEFORE="+container.children.length);

    const buttonIds = ["up","down","left","right","after","copyUrl","edit","save","drop","publish"];
    buttonIds.forEach(id => {
        if (!document.getElementById(id)) { // prevent duplicates
            const btn = document.createElement("button");
            btn.id = id;
            btn.disabled = true;
            btn.textContent = id === "up" ? "↑"
                            : id === "down" ? "↓"
                            : id === "left" ? "←"
                            : id === "right" ? "→"
                            : id === "after" ? "→|"
                            : id === "copyUrl" ? "🔗"
                            : id === "edit" ? "✎"
                            : id === "save" ? "💾"
                            : id === "drop" ? "↺"
                            : id === "publish" ? "📤" : id;
            container.appendChild(btn);
            window.log("[renderTree] create button "+id);
        }
    });

    window.log("[renderTree] children AFTER="+container.children.length);
    updateButtons(false);
    window.log("[renderTree] setupEditButtons COMPLETE");
    buttonsInitialised = true;
}

/* --------------------------------------------------
TREE RENDER
-------------------------------------------------- */
function renderNode(node, depth=0) {
    const indent = " ".repeat(depth*2);
    const color = "blue"; // always start blue
    window.log(`[renderTree] Node ${node.path} ${node.type} → ${color}`);

    // optionally render children recursively
    if (node.children && node.children.length>0) {
        node.children.forEach(child => renderNode(child, depth+1));
    }
}

export function renderTree(nodes, startEditCallback=null) {
    window.log("[renderTree] renderTree called with nodes count="+nodes.length);
    startEditCallbackRef = startEditCallback;

    treeRoot = nodes;

    nodes.forEach(node => renderNode(node, 0));

    // create buttons after tree is fully rendered
    if (!buttonsInitialised) {
        window.log("[renderTree] TOP LEVEL COMPLETE → initialise buttons");
        setupEditButtons();
    } else {
        window.log("[renderTree] buttons already initialised");
    }
}

/* --------------------------------------------------
NODE SELECTION
-------------------------------------------------- */
export function selectNode(path) {
    window.log(`[renderTree] selectNode called: ${path}`);
    selectedNodePath = path;

    // here you could add node highlighting logic
    window.log(`[renderTree] Node ${path} is selected`);

    updateButtons(true);
}

/* --------------------------------------------------
UTILITY
-------------------------------------------------- */
export function findNodeByPath(path, nodes=treeRoot) {
    if (!nodes) return null;
    for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
            const res = findNodeByPath(path, node.children);
            if (res) return res;
        }
    }
    return null;
              }
