// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
    window.log(`[moveNode] Moving node: ${nodeObj.title}, direction: ${direction}`);

    const parentArray = findParentArray(treeData, nodeObj);
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
        const grandParentArray = findParentArray(treeData, nodeObj, true);
        if (!grandParentArray || parentArray === treeData) {
            window.log("[moveNode] Cannot move left, already at top level");
            return false;
        }
        parentArray.splice(idx, 1);
        const parentNode = nodeObj.parent;
        const parentIdx = grandParentArray.indexOf(parentNode);
        grandParentArray.splice(parentIdx + 1, 0, nodeObj);
        nodeObj.parent = parentNode.parent;
    } else if (direction === 'right') {
        if (idx === 0) {
            window.log("[moveNode] Cannot move right, no previous sibling");
            return false;
        }
        if (newParent.qualification !== 'navigation' && newParent.qualification !== 'collated') {
          window.log(`[moveNode] Cannot move right, previous sibling is not navigation or collated (qualification: ${newParent.qualification})`);
          return false;
        }
        const newParent = parentArray[idx - 1];
        if (!newParent.children) newParent.children = [];
        parentArray.splice(idx, 1);
        newParent.children.push(nodeObj);
        nodeObj.parent = newParent;
    } else {
        window.log("[moveNode] Move not possible");
        return false;
    }

    detectMoveState(nodeObj);
    window.log(`[moveNode] Parent array titles after move: ${parentArray.map(n => n.title).join(', ')}`);
    window.log("[moveNode] Move completed");
    return true;
}

// Compute the path from root
function computeTreePath(node) {
    const parts = [node.rawName];
    let p = node.parent;
    while (p) {
        parts.unshift(p.rawName);
        p = p.parent;
    }
    return parts.join("/");
}

// Compare computed path to original file path
function detectMoveState(node) {
    const currentPath = computeTreePath(node) + ".md";
    if (currentPath !== node.path) {
        node.edit ??= {};
        node.edit.moved = true;
    } else {
        if (node.edit?.moved) delete node.edit.moved;
        if (node.edit && Object.keys(node.edit).length === 0) delete node.edit;
    }
}

// Recursively find parent array, optionally return grandparent
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

// Add move buttons to a node element
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
            window.selectedNodePath = nodeObj.path;

            if (moveNode(nodeObj, dir, treeData)) {
                const container = nodeEl.closest('#tree');
                if (container) {
                    container.innerHTML = '';
                    container.appendChild(renderTreeFn(
                        treeData,
                        clickHandler,
                        "editButtons",
                        window.selectedNodePath,
                        addMoveButtons
                    ));
                }
            }
        };
        btnContainer.appendChild(btn);
    });

    nodeEl.appendChild(btnContainer);
}
