// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
    window.log(`[moveNode] Moving node: ${nodeObj.title}, direction: ${direction}`);

    function findParentArray(arr) {
        const idx = arr.indexOf(nodeObj);
        if (idx !== -1) return arr;
        for (const n of arr) {
            if (n.children && n.children.length) {
                const found = findParentArray(n.children);
                if (found) return found;
            }
        }
        return null;
    }

    const parentArray = findParentArray(treeData);
    if (!parentArray) {
        window.log("[moveNode] Node not found in treeData");
        return false;
    }

    const idx = parentArray.indexOf(nodeObj);
    window.log(`[moveNode] Node index in parentArray: ${idx}`);
    window.log(`[moveNode] Parent array titles before move: ${parentArray.map(n => n.title).join(', ')}`);

    if (direction === 'up' && idx > 0) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx - 1, 0, nodeObj);
    } else if (direction === 'down' && idx < parentArray.length - 1) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx + 1, 0, nodeObj);
    } else if (direction === 'left') {
        // Promote: move node out of current parent to parent's parent
        const grandParentArray = findParentArray(treeData, nodeObj, true);
        if (!grandParentArray || parentArray === treeData) {
            window.log("[moveNode] Cannot move left, already at top level");
            return false;
        }
        parentArray.splice(idx, 1);
        const parentIdx = grandParentArray.indexOf(parentArray[0]); // safe approximation
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
    } else if (direction === 'right') {
        // Demote: move node into previous sibling as last child
        if (idx === 0) {
            window.log("[moveNode] Cannot move right, no previous sibling");
            return false;
        }
        const newParent = parentArray[idx - 1];
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
    } else {
        window.log("[moveNode] Move not possible");
        return false;
    }

    window.log(`[moveNode] Parent array titles after move: ${parentArray.map(n => n.title).join(', ')}`);
    window.log("[moveNode] Move completed");
    return true;
}

// Optional helper to find grandparent array (for left moves)
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

export function addMoveButtons(nodeEl, nodeObj, treeData, renderTreeFn, clickHandler) {
    const btnContainer = document.createElement('span');
    btnContainer.style.marginLeft = '10px';

    const buttons = [
        { dir: 'up', label: '↑' },
        { dir: 'down', label: '↓' },
        { dir: 'left', label: '←' },
        { dir: 'right', label: '→' },
    ];

    buttons.forEach(({ dir, label }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.marginLeft = '2px';
        btn.onclick = (e) => {
            e.stopPropagation();
            window.log(`[treeMoveActions] Button clicked: ${dir} for node: ${nodeObj.title}`);

            // preserve selection on the moved node
            window.selectedNodePath = nodeObj.path;

            window.log("[treeMoveActions] treeData BEFORE move:", JSON.parse(JSON.stringify(treeData)));
            window.log("[treeMoveActions] selectedNodePath BEFORE move:", window.selectedNodePath);

            if (moveNode(nodeObj, dir, treeData)) {
                window.log("[treeMoveActions] moveNode returned true, re-rendering tree");
                const container = nodeEl.closest('#tree');
                if (container) {
                    container.innerHTML = '';
                    container.appendChild(renderTreeFn(
                        treeData,
                        clickHandler,
                        "editButtons",
                        window.selectedNodePath,  // selection stays on moved node
                        addMoveButtons
                    ));
                    window.log("[treeMoveActions] tree re-rendered with move buttons on moved node");
                }
            } else {
                window.log("[treeMoveActions] moveNode returned false, nothing moved");
            }

            window.log("[treeMoveActions] treeData AFTER move:", JSON.parse(JSON.stringify(treeData)));
            window.log("[treeMoveActions] selectedNodePath AFTER move:", window.selectedNodePath);
        };
        btnContainer.appendChild(btn);
    });

    nodeEl.appendChild(btnContainer);
}
