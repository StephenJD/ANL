// static/js/webeditor/treeMoveActions.js

// Determine if a node is back in its "home" location
function isHome(node) {
    if (!node.parent) {
        window.log(`[isHome] ${node.title} -> root node, home=true`);
        return true;
    }

    const siblings = node.parent.children || [];

    const sorted = [...siblings].sort((a, b) => a.path.localeCompare(b.path));

    const currentIndex = siblings.indexOf(node);
    const correctIndex = sorted.findIndex(n => n.path === node.path);

    const home = currentIndex === correctIndex;

    window.log(
        `[isHome] ${node.title} | parent=${node.parent.title} | currentIndex=${currentIndex} | correctIndex=${correctIndex} | home=${home}`
    );

    return home;
}

// Recursively mark moved state for node and children
function markMovedState(node) {
    const moved = !isHome(node);
    node.edit = node.edit || {};
    node.editState = moved ? "moved" : null;
    if (node.children?.length) {
        for (const child of node.children) markMovedState(child);
    }
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

// Core move function
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

        const parentIdx = grandParentArray.indexOf(nodeObj.parent);
        if (parentIdx === -1) return false;

        parentArray.splice(idx, 1);
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
    window.log(`[state] ${nodeObj.title} editState=${nodeObj.editState}`);
    window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    window.log(`[moveNode] node.parent title: ${nodeObj.parent.title}`);
    window.log(`[moveNode] node.parent children titles: ${nodeObj.parent.children.map(c => c.title).join(", ")}`);
} else {
    window.log(`[moveNode] No move performed for ${nodeObj.title}`);
}

    // Force UI update
    if (window.updateTreeView) window.updateTreeView();
    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return moved;
}

// Drop node back to correct location based on disk path
export function dropMove(nodeObj) {
    if (!nodeObj.path || !nodeObj.parent) return false;

    const oldParent = nodeObj.parent;
    let parentArray = oldParent.children || [];
    const idx = parentArray.indexOf(nodeObj);
    if (idx !== -1) parentArray.splice(idx, 1);

    const correctParent = findParentForPath(nodeObj);
    if (!correctParent.children) correctParent.children = [];

    const siblings = correctParent.children;
    const insertIdx = siblings.findIndex(s => s.path.localeCompare(nodeObj.path) > 0);
    if (insertIdx === -1) siblings.push(nodeObj);
    else siblings.splice(insertIdx, 0, nodeObj);

    nodeObj.parent = correctParent;
    markMovedState(nodeObj);

    window.log(`[dropMove] Dropped node "${nodeObj.title}"`);
    window.log(`[dropMove] New parent: ${correctParent.title}`);
    window.log(`[dropMove] Parent children titles: ${correctParent.children.map(c => c.title).join(", ")}`);

    // Force UI update
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

    // Force UI update
    if (window.updateTreeView) window.updateTreeView();
    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return true;
          }
