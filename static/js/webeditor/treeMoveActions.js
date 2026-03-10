// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
    window.log(`[moveNode] Moving node: ${nodeObj.title}, direction: ${direction}`);

    const parentNode = nodeObj.parent;
    const parentArray = parentNode ? parentNode.children : treeData;
    const idx = parentArray.indexOf(nodeObj);

    if (idx === -1) {
        window.log("[moveNode] Node not found in parent array");
        return false;
    }

    if (nodeObj._originalParent === undefined) {
        nodeObj._originalParent = parentNode;
        nodeObj._originalIndex = idx;
    }

    if (direction === "up" && idx > 0) {

        parentArray.splice(idx, 1);
        parentArray.splice(idx - 1, 0, nodeObj);

    } else if (direction === "down" && idx < parentArray.length - 1) {

        parentArray.splice(idx, 1);
        parentArray.splice(idx + 1, 0, nodeObj);

    } else if (direction === "left") {

        if (!parentNode) {
            window.log("[moveNode] Cannot move left, already top level");
            return false;
        }

        const grandParent = parentNode.parent;
        const grandArray = grandParent ? grandParent.children : treeData;

        const parentIdx = grandArray.indexOf(parentNode);

        parentArray.splice(idx, 1);
        grandArray.splice(parentIdx + 1, 0, nodeObj);

        nodeObj.parent = grandParent || null;

    } else if (direction === "right") {

        if (idx === 0) {
            window.log("[moveNode] Cannot move right, no previous sibling");
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

    const newParent = nodeObj.parent;
    const newArray = newParent ? newParent.children : treeData;
    const newIndex = newArray.indexOf(nodeObj);

    const returned =
        newParent === nodeObj._originalParent &&
        newIndex === nodeObj._originalIndex;

    if (returned) {

        if (nodeObj.edit?.moved) {
            delete nodeObj.edit.moved;
        }

        if (nodeObj.edit && Object.keys(nodeObj.edit).length === 0) {
            delete nodeObj.edit;
        }

        delete nodeObj._originalParent;
        delete nodeObj._originalIndex;

        window.log("[moveNode] Node returned to original location");

    } else {

        if (!nodeObj.edit) nodeObj.edit = {};
        nodeObj.edit.moved = true;

    }

    window.log("[moveNode] Move completed");
    return true;
}

export function addMoveButtons(nodeEl, nodeObj, treeData, renderTreeFn, clickHandler) {

    const btnContainer = document.createElement("span");
    btnContainer.style.marginLeft = "10px";

    const buttons = [
        { dir: "up", label: "↑" },
        { dir: "down", label: "↓" },
        { dir: "left", label: "←" },
        { dir: "right", label: "→" }
    ];

    buttons.forEach(({ dir, label }) => {

        const btn = document.createElement("button");
        btn.textContent = label;
        btn.style.marginLeft = "2px";

        btn.onclick = (e) => {

            e.stopPropagation();

            window.selectedNodePath = nodeObj.path;

            if (moveNode(nodeObj, dir, treeData)) {

                const container = nodeEl.closest("#tree");

                if (container) {

                    container.innerHTML = "";

                    container.appendChild(
                        renderTreeFn(
                            treeData,
                            clickHandler,
                            "editButtons",
                            window.selectedNodePath,
                            addMoveButtons
                        )
                    );
                }
            }
        };

        btnContainer.appendChild(btn);
    });

    nodeEl.appendChild(btnContainer);
}
