// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.title}`);

    const parentArray = findParentArray(treeData, nodeObj);
    if (!parentArray) {
        window.log("[moveNode] Node not found in treeData");
        return false;
    }

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
        const grandParentArray = findParentArray(treeData, parentArray[0], true);
        if (!grandParentArray || parentArray === treeData) return false;
        parentArray.splice(idx, 1);
        const parentIdx = grandParentArray.indexOf(parentArray[0]);
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
        moved = true;
    } else if (direction === "right") {
        if (idx === 0) return false;
        const newParent = parentArray[idx - 1];
        if (!["navigation", "collated"].includes(newParent.qualification)) return false;
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
        moved = true;
    }

    if (moved) {
        nodeObj.edit = nodeObj.edit || {};
        nodeObj.editState = "moved"; // red
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    }

    return moved;
}

export function dropMove(nodeObj, treeData) {
    if (!nodeObj.path) return false;

    const currentParent = findParentArray(treeData, nodeObj);
    if (!currentParent) return false;

    // Find original position by path
    const originalNode = findNodeByPath(treeData, nodeObj.path);
    if (!originalNode) return false;

    // Remove from current location
    const idx = currentParent.indexOf(nodeObj);
    if (idx !== -1) currentParent.splice(idx, 1);

    // Insert back to original path's parent array
    const origParentArray = findParentArray(treeData, originalNode);
    if (!origParentArray) return false;
    const origIdx = origParentArray.indexOf(originalNode);
    origParentArray.splice(origIdx, 0, nodeObj);

    nodeObj.editState = "moved"; // red again if unstaged
    delete nodeObj.edit?.staged;

    window.log(`[dropMove] Node dropped back to original path: ${nodeObj.title}`);
    return true;
}

export function moveAfterNextSelected(nodeObj, treeData, nextSelectedPath) {
    const flat = flattenTree(treeData);
    const nextNode = flat.find(n => n.path === nextSelectedPath);
    if (!nextNode) return false;

    const parentArray = findParentArray(treeData, nodeObj);
    if (!parentArray) return false;

    const idx = parentArray.indexOf(nodeObj);
    if (idx === -1) return false;

    // remove from current
    parentArray.splice(idx, 1);

    // insert after next selected in its parent
    const targetParentArray = findParentArray(treeData, nextNode);
    const targetIdx = targetParentArray.indexOf(nextNode);
    targetParentArray.splice(targetIdx + 1, 0, nodeObj);

    nodeObj.edit = nodeObj.edit || {};
    nodeObj.editState = "moved"; // red
    delete nodeObj.edit?.staged;

    window.log(`[moveAfterNextSelected] ${nodeObj.title} moved after ${nextNode.title}`);
    return true;
}

// Helper: find array containing nodeObj
function findParentArray(arr, targetNode, returnGrandParent = false) {
    let result = null;
    function recurse(currentArr, parentArr = null) {
        const idx = currentArr.indexOf(targetNode);
        if (idx !== -1) {
            result = returnGrandParent ? parentArr : currentArr;
            return true;
        }
        for (const n of currentArr) {
            if (n.children && n.children.length) {
                if (recurse(n.children, currentArr)) return true;
            }
        }
        return false;
    }
    recurse(arr);
    return result;
}

// Helper: flatten tree into array
function flattenTree(nodes, out = []) {
    for (const n of nodes) {
        out.push(n);
        if (n.children && n.children.length) flattenTree(n.children, out);
    }
    return out;
}

// Helper: find node by path
function findNodeByPath(nodes, path) {
    for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children?.length) {
            const found = findNodeByPath(n.children, path);
            if (found) return found;
        }
    }
    return null;
}
