// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.title}`);

    if (!nodeObj.parent) {
        window.log("[moveNode] Node has no parent, cannot move");
        return false;
    }

    const parentArray = nodeObj.parent.children;

    window.log(`[moveNode] node.parent title: ${nodeObj.parent.title || "(no title)"}`);
    window.log(`[moveNode] node.parent children length: ${parentArray?.length || 0}`);
    if (parentArray?.length) {
        window.log(`[moveNode] node.parent children titles: ${parentArray.map(c => c.title).join(", ")}`);
    }

    if (!parentArray || parentArray.length === 0) {
        window.log("[moveNode] Parent has no children array, cannot move");
        return false;
    }

    const idx = parentArray.indexOf(nodeObj);
    window.log(`[moveNode] index of node in parent.children: ${idx}`);

    if (idx === -1) {
        window.log("[moveNode] Node not found in parent.children, cannot move");
        return false;
    }

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
        window.log(`[moveNode] grandParentArray: ${grandParentArray?.map(c=>c.title).join(", ")}`);
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
        nodeObj.editState = "moved";
        window.log(`[moveNode] Move completed for ${nodeObj.title}`);
    } else {
        window.log(`[moveNode] No move performed for ${nodeObj.title}`);
    }

    return moved;
          }
