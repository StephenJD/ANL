// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, fullTree) {
    window.log(`[moveNode] Moving node: ${nodeObj.title}, direction: ${direction}`);
    window.log("[moveNode] treeData BEFORE move:", fullTree);

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

    const parentArray = findParentArray(fullTree);
    if (!parentArray) {
        window.log("[moveNode] Node not found in fullTree");
        return false;
    }

    const idx = parentArray.indexOf(nodeObj);
    window.log("[moveNode] Node index in parentArray:", idx);
    window.log("[moveNode] Parent array titles before move:", parentArray.map(n => n.title).join(', '));

    if (direction === 'up' && idx > 0) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx - 1, 0, nodeObj);
    } else if (direction === 'down' && idx < parentArray.length - 1) {
        parentArray.splice(idx, 1);
        parentArray.splice(idx + 1, 0, nodeObj);
    } else if (direction === 'left' || direction === 'right') {
        window.log(`[moveNode] ${direction} move not implemented yet`);
        return false;
    } else {
        window.log("[moveNode] Move not possible");
        return false;
    }

    window.log("[moveNode] Parent array titles after move:", parentArray.map(n => n.title).join(', '));
    window.log("[moveNode] treeData AFTER move:", fullTree);
    return true;
}

export function addMoveButtons(nodeEl, nodeObj, fullTree, renderTreeFn, startEditCallback) {
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
            window.log("[treeMoveActions] treeData BEFORE move:", fullTree);
            window.log("[treeMoveActions] selectedNodePath BEFORE move:", window.selectedNodePath);

            if (moveNode(nodeObj, dir, fullTree)) {
                window.log("[treeMoveActions] moveNode returned true, re-rendering tree");

                const container = document.getElementById('tree');
                if (!container) {
                    window.log("[treeMoveActions] ERROR: #tree container not found");
                    return;
                }

                container.innerHTML = '';
                const newTree = renderTreeFn(
                    fullTree,
                    startEditCallback,
                    "editButtons",
                    window.selectedNodePath,
                    addMoveButtons
                );

                container.appendChild(newTree);

                window.log("[treeMoveActions] treeData AFTER move:", fullTree);
                window.log("[treeMoveActions] selectedNodePath AFTER move:", window.selectedNodePath);
                window.log("[treeMoveActions] rendered tree element:", newTree);
            } else {
                window.log("[treeMoveActions] moveNode returned false, nothing moved");
            }
        };
        btnContainer.appendChild(btn);
    });

    nodeEl.appendChild(btnContainer);
                         }
