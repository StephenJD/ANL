// static/js/webeditor/treeMoveActions.js

// Determine if a node's URL has changed (Hugo-style) based on its position
function hasNewURL(node) {
    if (!node.parent) return false; // root node

    const siblings = node.parent.children || [];
    // Build correctly sorted sibling order
    const sorted = [...siblings].sort((a, b) => a.path.localeCompare(b.path));

    const currentIndex = siblings.indexOf(node);
    const correctIndex = sorted.indexOf(node);

    const moved = currentIndex !== correctIndex;

    window.log(`[hasNewURL] ${node.title} | currentIndex=${currentIndex} | correctIndex=${correctIndex} | moved=${moved}`);

    node.edit = node.edit || {};
    node.editState = moved ? "moved" : "home";

    if (node.children?.length) {
        for (const child of node.children) hasNewURL(child);
    }

    return moved;
}

// Recursively mark moved state for node and children
function markMovedState(node) {
    hasNewURL(node);
}

// Utility: find correct parent for a node based on its disk path
function findParentForPath(node) {
    if (!node.path) return { children: window.treeData, title: "(root)" };

    const pathParts = node.path.split("/").slice(0, -1); // remove last segment (file)
    let current = window.treeData;
    let parent = null;

    for (const part of pathParts) {
        const next = current.find(n => n.path.endsWith(part));
        if (!next) break;
        parent = next;
        current = next.children || [];
    }

    return parent || { children: window.treeData, title: "(root)" };
}

// Core move function (up/down only)
export function moveNode(nodeObj, direction) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.title}`);

    if (!nodeObj.parent) {
        window.log("[moveNode] Node has no parent, cannot move");
        return false;
    }

    const parentArray = nodeObj.parent.children;
    if (!parentArray || parentArray.length === 0) return false;

    const idx = parentArray.indexOf(nodeObj);
    if (idx === -1) return false;

    let moved = false;

    if (direction === "up" && idx > 0) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx - 1, 0, nodeObj);
        moved = true;
    } else if (direction === "down" && idx < parentArray.length - 1) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx + 1, 0, nodeObj);
        moved = true;
    }

    if (moved) {
        markMovedState(nodeObj);
        window.log(`[state] ${nodeObj.title} editState=${nodeObj.editState}`);
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    } else {
        window.log(`[moveNode] No move performed for ${nodeObj.title}`);
    }

    // Save scroll position
    const treeDiv = document.getElementById("tree");
    const scrollTop = treeDiv?.scrollTop || 0;

    // Force UI update
    if (window.updateTreeView) window.updateTreeView();
    if (treeDiv) treeDiv.scrollTop = scrollTop;

    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return moved;
}

// Drop node back to correct location based on disk path
export function dropMove(nodeObj) {
    if (!nodeObj.path) return false;
window.log(`[dropMove] Remove node "${nodeObj.title}"`);
  
    // Remove from any current parent
    if (nodeObj.parent?.children) {
        const idx = nodeObj.parent.children.indexOf(nodeObj);
        if (idx !== -1) {
            nodeObj.parent.children.splice(idx, 1);
            window.log(`[dropMove] Removed node "${nodeObj.title}" from old parent "${nodeObj.parent.title}" at index ${idx}`);
        }
    }
window.log(`[dropMove] Find correct parent`);
  
    // Find correct parent
    const correctParent = findParentForPath(nodeObj);
    if (!correctParent.children) correctParent.children = [];

    // Insert node into correct position in sorted sibling array
    const siblings = correctParent.children;
    siblings.push(nodeObj); // temporarily append
    siblings.sort((a, b) => a.path.localeCompare(b.path));
    nodeObj.parent = correctParent;

    // Log full sibling order
    window.log(`[dropMove] Parent "${correctParent.title}" children after sort: ${siblings.map(n => n.title).join(", ")}`);

    // Recalculate editState for node and children
    markMovedState(nodeObj);

    const newIndex = siblings.indexOf(nodeObj);
    window.log(`[dropMove] Dropped node "${nodeObj.title}" into parent "${correctParent.title}" at index ${newIndex}`);
    window.log(`[dropMove] Node "${nodeObj.title}" editState after drop: ${nodeObj.editState}`);

    if (nodeObj.children?.length) {
        nodeObj.children.forEach(child => {
            window.log(`[dropMove] Child "${child.title}" editState: ${child.editState}`);
        });
    }

    if (window.updateTreeView) window.updateTreeView();
    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return true;
}

// Move node after next selected node
export function moveAfterNextSelected(nodeObj, nextSelectedNode) {
    if (!nextSelectedNode) return false;

    const parentArray = nodeObj.parent?.children;
    const targetParentArray = nextSelectedNode.parent?.children;
    if (!parentArray || !targetParentArray) return false;

    const idx = parentArray.indexOf(nodeObj);
    if (idx === -1) return false;

    parentArray.splice(idx, 1);

    const targetIdx = targetParentArray.indexOf(nextSelectedNode);
    targetParentArray.splice(targetIdx + 1, 0, nodeObj);
    nodeObj.parent = nextSelectedNode.parent;

    markMovedState(nodeObj);

    window.log(`[moveAfterNextSelected] ${nodeObj.title} moved after ${nextSelectedNode.title}`);

    // Save scroll position
    const treeDiv = document.getElementById("tree");
    const scrollTop = treeDiv?.scrollTop || 0;

    // Force UI update
    if (window.updateTreeView) window.updateTreeView();
    if (treeDiv) treeDiv.scrollTop = scrollTop;

    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return true;
}
