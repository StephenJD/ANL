// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData, selectedNode = null) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.title}`);

    const parentArray = findParentArray(treeData, nodeObj);
    if (!parentArray) {
        window.log("[moveNode] Node not found in treeData");
        return false;
    }

    const idx = parentArray.indexOf(nodeObj);
    window.log(`[moveNode] Node current index: ${idx} in parent path: ${parentArray.map(n => n.path).join(', ')}`);

    let moved = false;

    if (!nodeObj.originalIndex && nodeObj.originalIndex !== 0) nodeObj.originalIndex = idx;
    if (!nodeObj.originalParent && nodeObj.originalParent !== 0) nodeObj.originalParent = parentArray;

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
        if (!grandParentArray || parentArray === treeData) {
            window.log("[moveNode] Cannot move left, already at top level");
            return false;
        }
        parentArray.splice(idx, 1);
        const parentIdx = grandParentArray.indexOf(parentArray[0]);
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
        moved = true;
    } else if (direction === "right") {
        if (idx === 0) {
            window.log("[moveNode] Cannot move right, no previous sibling");
            return false;
        }
        const newParent = parentArray[idx - 1];
        if (!["navigation", "collated"].includes(newParent.qualification)) {
            window.log("[moveNode] Right move blocked, previous sibling not navigation/collated");
            return false;
        }
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
        moved = true;
    }

    if (moved) {
        nodeObj.edit = nodeObj.edit || {};
        nodeObj.edit.moved = true;

        // Reset moved if back in original position
        const backInPlace = parentArray === nodeObj.originalParent &&
            parentArray.indexOf(nodeObj) === nodeObj.originalIndex;

        if (backInPlace) {
            if (nodeObj.edit) {
                delete nodeObj.edit.moved;
                if (Object.keys(nodeObj.edit).length === 0) nodeObj.edit = null;
            }
        }

        window.log(`[moveNode] Move ${moved ? "completed" : "skipped"} for ${nodeObj.title}`);
    }

    return moved;
}

export function dropMove(nodeObj) {
    if (!nodeObj.originalParent || nodeObj.originalIndex === undefined) return false;

    const currentParent = findParentArray(nodeObj.originalParent, nodeObj);
    if (!currentParent) return false;

    const idx = currentParent.indexOf(nodeObj);
    if (idx !== -1) currentParent.splice(idx, 1);

    nodeObj.originalParent.splice(nodeObj.originalIndex, 0, nodeObj);

    if (nodeObj.edit) {
        delete nodeObj.edit.moved;
        if (Object.keys(nodeObj.edit).length === 0) nodeObj.edit = null;
    }

    window.log(`[dropMove] Node dropped back to original position: ${nodeObj.title}`);
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
    nodeObj.edit.moved = true;

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
