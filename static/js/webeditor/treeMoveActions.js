// static/js/webeditor/treeMoveActions.js

function updateEditState(node) {
    if (!node.parent) return;

    // Determine natural position by path/file name ordering
    const sorted = [...node.parent.children].sort((a, b) => a.path.localeCompare(b.path));

    // Node is back home if it occupies the position it would have in sorted array
    const isBackHome = sorted.some((n, i) => n === node && i === sorted.indexOf(node));
    node.editState = isBackHome ? null : "moved";
}

// --- moveNode ---
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
        nodeObj.edit = nodeObj.edit || {};
        updateEditState(nodeObj);           // <-- recalc color/state
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    }

    return moved;
}

// --- moveAfterNextSelected ---
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

    nodeObj.edit = nodeObj.edit || {};
    updateEditState(nodeObj);             // <-- recalc color/state
    delete nodeObj.edit?.staged;

    window.log(`[moveAfterNextSelected] ${nodeObj.title} moved after ${nextSelectedNode.title}`);
    return true;
}

// --- dropMove ---
export function dropMove(nodeObj) {
    if (!nodeObj.path || !nodeObj.originalParent) return false;

    const currentParentArray = nodeObj.parent?.children;
    if (!currentParentArray) return false;

    const idx = currentParentArray.indexOf(nodeObj);
    if (idx !== -1) currentParentArray.splice(idx, 1);

    if (!nodeObj.originalParent.children) nodeObj.originalParent.children = [];
    nodeObj.originalParent.children.push(nodeObj);
    nodeObj.parent = nodeObj.originalParent;

    nodeObj.editState = null;              // dropped back home
    delete nodeObj.edit?.staged;

    window.log(`[dropMove] Node dropped back to original parent: ${nodeObj.title}`);
    return true;
}
