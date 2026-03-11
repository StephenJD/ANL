// static/js/webeditor/treeMoveActions.js

// Check if node is in its original disk-path location and order
function isHome(node) {
    if (!node.path) return true;

    const correctParent = findParentForPath(node);
    if (node.parent !== correctParent) return false;

    const siblings = correctParent.children || [];
    const sortedSiblings = [...siblings].sort((a, b) => a.path.localeCompare(b.path));

    const idx = sortedSiblings.indexOf(node);
    if (idx === -1) return false;

    return true;
}

// Recursively mark moved state
function markMovedState(node) {
    const moved = !isHome(node);
    node.edit = node.edit || {};
    node.editState = moved ? "moved" : null;

    if (node.children?.length) {
        for (const child of node.children) markMovedState(child);
    }
}

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
    } else if (direction === "left") {
        const grandParentArray = nodeObj.parent.parent?.children;
        if (!grandParentArray) return false;
        parentArray.splice(idx, 1);
        const parentIdx = grandParentArray.indexOf(nodeObj.parent);
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
        nodeObj.parent = nodeObj.parent.parent;
        moved = true;
    } else if (direction === "right") {
        if (idx === 0) return false;
        const newParent = parentArray[idx - 1];
        if (!["navigation", "collated"].includes(newParent.qualification)) return false;
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
        nodeObj.parent = newParent;
        moved = true;
    }

    if (moved) {
        markMovedState(nodeObj);
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    } else {
        window.log(`[moveNode] No move performed for ${nodeObj.title}`);
    }

    return moved;
}

// Drop node back to its disk-path home
export function dropMove(nodeObj) {
    if (!nodeObj.path) return false;

    const correctParent = findParentForPath(nodeObj);
    if (!correctParent.children) correctParent.children = [];

    // Remove from current parent if present
    const currParentArray = nodeObj.parent?.children || [];
    const idx = currParentArray.indexOf(nodeObj);
    if (idx !== -1) currParentArray.splice(idx, 1);

    // Insert into correct parent's children in file-name order
    const siblings = correctParent.children;
    const insertIdx = siblings.findIndex(s => s.path.localeCompare(nodeObj.path) > 0);
    if (insertIdx === -1) siblings.push(nodeObj);
    else siblings.splice(insertIdx, 0, nodeObj);

    nodeObj.parent = correctParent;

    markMovedState(nodeObj);

    window.log(`[dropMove] Dropped node back to correct location: ${nodeObj.title}`);
    return true;
}

// Move node after another selected node
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
    return true;
}

// Utility: find correct parent for a node based on its disk path
function findParentForPath(node) {
    const pathParts = node.path.split("/").slice(0, -1); // remove last segment (file)
    let current = window.treeData; // root of in-memory tree
    let parent = null;
    for (const part of pathParts) {
        const next = current.find(n => n.path.endsWith(part));
        if (!next) break;
        parent = next;
        current = next.children || [];
    }
    return parent || { children: window.treeData, title: "(root)" };
}
