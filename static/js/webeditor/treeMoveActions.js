// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
  console.log("[moveNode] Moving node:", nodeObj.title, "direction:", direction);

  // Recursively find the parent array that contains this node
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
    console.log("[moveNode] Node not found in treeData");
    return false;
  }

  const idx = parentArray.indexOf(nodeObj);

  if (direction === 'up' && idx > 0) {
    parentArray.splice(idx, 1);
    parentArray.splice(idx - 1, 0, nodeObj);
    console.log("[moveNode] Node moved up, parentArray titles:", parentArray.map(n => n.title));
    return true;
  }

  if (direction === 'down' && idx < parentArray.length - 1) {
    parentArray.splice(idx, 1);
    parentArray.splice(idx + 1, 0, nodeObj);
    console.log("[moveNode] Node moved down, parentArray titles:", parentArray.map(n => n.title));
    return true;
  }

  if (direction === 'left') {
    console.log("[moveNode] Left move not implemented yet");
    return false;
  }

  if (direction === 'right') {
    console.log("[moveNode] Right move not implemented yet");
    return false;
  }

  console.log("[moveNode] Move not possible");
  return false;
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
      console.log("[treeMoveActions] Button clicked:", dir, "for node:", nodeObj.title);
      if (moveNode(nodeObj, dir, treeData)) {
        console.log("[treeMoveActions] moveNode returned true, re-rendering tree");
        const container = nodeEl.closest('#tree');
        if (container) {
          container.innerHTML = '';
          container.appendChild(renderTreeFn(
            treeData,
            clickHandler,
            "editButtons",
            window.selectedNodePath,  // current selection
            addMoveButtons
          ));
        }
      } else {
        console.log("[treeMoveActions] moveNode returned false, nothing moved");
      }
    };
    btnContainer.appendChild(btn);
  });

  nodeEl.appendChild(btnContainer);
                  }
