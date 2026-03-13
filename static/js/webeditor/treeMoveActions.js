// static/js/webeditor/treeMoveActions.js

// Determine if a node's URL has changed (Hugo-style) based on its position
function hasNewURL(node) {
    if (!node.parent) return false;

    const siblings = node.parent.children || [];
    const sorted = [...siblings].sort((a, b) => a.path.localeCompare(b.path));

    const currentIndex = siblings.indexOf(node);
    const correctIndex = sorted.indexOf(node);

    const pathParts = node.path ? node.path.split("/").slice(0, -1) : [];
    const expectedParentFull = pathParts.join("/") || "(root)";
    const expectedParentLeaf = pathParts.length ? pathParts[pathParts.length - 1] : "(root)";
    const currentParentPath = node.parent?.path ?? "(root)";
    const parentMatchesPath = currentParentPath === expectedParentFull || currentParentPath === expectedParentLeaf;

    const moved = !parentMatchesPath || currentIndex !== correctIndex;

    window.log(`[hasNewURL] ${node.path} | currentIndex=${currentIndex} | correctIndex=${correctIndex} | moved=${moved}`);

    node.editState = moved ? "moved" : "home";

    return moved;
}

// Recursively mark a node and its children
function markNodeAndChildren(node) {
    hasNewURL(node); // always mark node first
    if (node.children?.length) {
        for (const child of node.children) markNodeAndChildren(child);
    }
}

// Find the correct parent node for a given node based on path
function findParentForPath(node, rootTree) {
    if (!node.path) return { children: rootTree, path: "(root)" };

    const pathParts = node.path.split("/").slice(0, -1); // all segments except last (file)
    let cumulative = "";
    let current = rootTree;
    let parent = null;

    for (const part of pathParts) {
        cumulative = cumulative ? `${cumulative}/${part}` : part;
        window.log(`[findParentForPath] current type: ${typeof current} isArray:${Array.isArray(current)} | looking for: ${part}`);
        if (!Array.isArray(current)) break;
        const next = current.find(n => n.path === cumulative || n.path === part);
        if (!next) break;
        parent = next;
        current = next.children || [];
    }

    return parent || { children: rootTree, path: "(root)" };
}

// Move node up or down
export function moveNode(nodeObj, direction) {
    window.log(`[moveNode] Attempting move: ${direction} for node: ${nodeObj.path}`);

    if (!nodeObj.parent) return false;

    const siblings = nodeObj.parent.children;
    if (!siblings || siblings.length === 0) return false;

    const idx = siblings.indexOf(nodeObj);
    if (idx === -1) return false;

    let moved = false;
    if (direction === "up" && idx > 0) {
        siblings.splice(idx, 1);
        siblings.splice(idx - 1, 0, nodeObj);
        moved = true;
    } else if (direction === "down" && idx < siblings.length - 1) {
        siblings.splice(idx, 1);
        siblings.splice(idx + 1, 0, nodeObj);
        moved = true;
    }

    if (moved) {
        markNodeAndChildren(nodeObj);
        window.log(`[state] ${nodeObj.path} editState=${nodeObj.editState}`);
        window.log(`[moveNode] Move completed for ${nodeObj.path}`);
    } else {
        window.log(`[moveNode] No move performed for ${nodeObj.path}`);
    }


    if (window.updateTreeView) window.updateTreeView();

    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return moved;
}

// Drop node into correct parent based on its path
export function dropMove(nodeObj, rootTree) {
    if (!nodeObj.path) return false;

    window.log(`[dropMove] Start for node ${nodeObj.path}`);
    const correctParent = findParentForPath(nodeObj, rootTree);
    if (!correctParent.children) correctParent.children = [];

    const siblings = correctParent.children;

    // Move node if not already in correct folder
    if (!siblings.includes(nodeObj)) {
        if (nodeObj.parent?.children) {
            const idx = nodeObj.parent.children.indexOf(nodeObj);
            if (idx !== -1) {
                nodeObj.parent.children.splice(idx, 1);
                window.log(`[dropMove] Removed ${nodeObj.path} from old parent ${nodeObj.parent.path} at index ${idx}`);
            }
        }
        siblings.push(nodeObj);
        nodeObj.parent = correctParent;
        window.log(`[dropMove] Inserted ${nodeObj.path} into parent ${correctParent.path}`);
    }

    const actualIndex = siblings.indexOf(nodeObj);
    siblings.sort((a, b) => a.path.localeCompare(b.path));
    const sortedIndex = siblings.indexOf(nodeObj);

    window.log(`[dropMove] Parent ${correctParent.path} children after sort: ${siblings.map(n => n.path).join(", ")}`);

    if (actualIndex !== sortedIndex) {
        siblings.splice(sortedIndex, 1);
        siblings.splice(actualIndex, 0, nodeObj);
        siblings.splice(actualIndex, 1);
        siblings.splice(sortedIndex, 0, nodeObj);
        window.log(`[dropMove] Node moved from ${actualIndex} to ${sortedIndex}`);
    }

    // ALWAYS mark node first, then children
    markNodeAndChildren(nodeObj);

    window.log(`[dropMove] Finished drop for ${nodeObj.path} at index ${siblings.indexOf(nodeObj)} | editState=${nodeObj.editState}`);

    if (window.updateTreeView) window.updateTreeView();
    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return true;
}

// Move node to a target selection (folder => first child, content => index of content)
export function moveToTarget(nodeObj, rootTree, targetNode) {
    if (!nodeObj || !targetNode) return false;
    if (nodeObj === targetNode || nodeObj.path === targetNode.path) return false;

    const oldParentArray = nodeObj.parent?.children || rootTree;
    const oldIdx = oldParentArray.indexOf(nodeObj);
    if (oldIdx === -1) return false;

    const isFolderTarget = !targetNode.path?.endsWith(".md");

    // Remove from old parent first
    oldParentArray.splice(oldIdx, 1);

    if (isFolderTarget) {
        if (!targetNode.children) targetNode.children = [];
        targetNode.children.unshift(nodeObj);
        nodeObj.parent = targetNode;
        window.log(`[moveToTarget] ${nodeObj.path} moved into folder ${targetNode.path} at index 0`);
    } else {
        const targetArray = targetNode.parent?.children || rootTree;
        const targetIdx = targetArray.indexOf(targetNode);
        if (targetIdx === -1) {
            // restore to original position if target missing
            oldParentArray.splice(oldIdx, 0, nodeObj);
            return false;
        }
        targetArray.splice(targetIdx, 0, nodeObj);
        nodeObj.parent = targetNode.parent || null;
        window.log(`[moveToTarget] ${nodeObj.path} moved to index ${targetIdx} in ${nodeObj.parent?.path || "(root)"}`);
    }

    markNodeAndChildren(nodeObj);



    if (window.updateTreeView) window.updateTreeView();
    if (window.editButtons?.updateButtons) window.editButtons.updateButtons(true);

    return true;
}

// (no extra helpers)
