// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.title}`);

    // Find the parent array that contains the node
    const parentArray = findParentArray(treeData, nodeObj);
    if (!parentArray) {
        window.log("[moveNode] Node not found in treeData");
        return false;
    }

    const idx = parentArray.indexOf(nodeObj);
    if (idx === -1) return false;

    let moved = false;

    if (direction === "up") {
        if (idx === 0) {
            window.log("[moveNode] Cannot move up, already first in parent");
            return false;
        }
        parentArray.splice(idx, 1);
        parentArray.splice(idx - 1, 0, nodeObj);
        moved = true;

    } else if (direction === "down") {
        if (idx === parentArray.length - 1) {
            window.log("[moveNode] Cannot move down, already last in parent");
            return false;
        }
        parentArray.splice(idx, 1);
        parentArray.splice(idx + 1, 0, nodeObj);
        moved = true;

    } else if (direction === "left") {
        // Move out to grandparent
        const parentNode = findParentNode(treeData, nodeObj);
        if (!parentNode) {
            window.log("[moveNode] Cannot move left, node has no parent");
            return false;
        }
        const grandParentArray = findParentArray(treeData, parentNode);
        if (!grandParentArray) {
            window.log("[moveNode] Cannot move left, parent has no parent (top level)");
            return false;
        }

        // Remove from current parent and insert after parent in grandparent
        parentArray.splice(idx, 1);
        const parentIdx = grandParentArray.indexOf(parentNode);
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
        moved = true;

    } else if (direction === "right") {
        if (idx === 0) {
            window.log("[moveNode] Cannot move right, no previous sibling");
            return false;
        }
        const newParent = parentArray[idx - 1];
        if (!["navigation", "collated"].includes(newParent.qualification)) {
            window.log("[moveNode] Cannot move right, previous sibling not navigation/collated");
            return false;
        }
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
        moved = true;
    }

    if (moved) {
        nodeObj.edit = nodeObj.edit || {};
        nodeObj.editState = "moved"; // red handled by renderTree
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    }

    return moved;
}

// Helper: find parent node (not array)
function findParentNode(arr, targetNode) {
    let result = null;
    function recurse(currentArr, parent = null) {
        if (currentArr.includes(targetNode)) {
            result = parent;
            return true;
        }
        for (const n of currentArr) {
            if (n.children?.length) {
                if (recurse(n.children, n)) return true;
            }
        }
        return false;
    }
    recurse(arr);
    return result;
}

// Helper: find array containing nodeObj
function findParentArray(arr, targetNode) {
    let result = null;
    function recurse(currentArr) {
        if (currentArr.includes(targetNode)) {
            result = currentArr;
            return true;
        }
        for (const n of currentArr) {
            if (n.children?.length) {
                if (recurse(n.children)) return true;
            }
        }
        return false;
    }
    recurse(arr);
    return result;
}

// Helper: flatten tree into array
export function flattenTree(nodes, out = []) {
    for (const n of nodes) {
        out.push(n);
        if (n.children?.length) flattenTree(n.children, out);
    }
    return out;
}

// Helper: find node by path
export function findNodeByPath(nodes, path) {
    for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children?.length) {
            const found = findNodeByPath(n.children, path);
            if (found) return found;
        }
    }
    return null;
}
