// static/js/webeditor/treeMoveActions.js

export function moveNode(nodeObj, direction, treeData) {
  window.log(`[moveNode] Moving node: ${nodeObj.title}, direction: ${direction}`);
  window.log("[moveNode] treeData BEFORE move:", JSON.stringify(treeData, null, 2));

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
    window.log(`[moveNode] Node moved up, parentArray titles after move: ${parentArray.map(n => n.title).join(', ')}`);
    window.log("[moveNode] treeData AFTER move:", JSON.stringify(treeData, null, 2));
    return true;
  }

  if (direction === 'down' && idx < parentArray.length - 1) {
    parentArray.splice(idx, 1);
    parentArray.splice(idx + 1, 0, nodeObj);
    window.log(`[moveNode] Node moved down, parentArray titles after move: ${parentArray.map(n => n.title).join(', ')}`);
    window.log("[moveNode] treeData AFTER move:", JSON.stringify(treeData, null, 2));
    return true;
  }

  if (direction === 'left') {
    window.log("[moveNode] Left move not implemented yet");
    return false;
  }

  if (direction === 'right') {
    window.log("[moveNode] Right move not implemented yet");
    return false;
  }

  window.log("[moveNode] Move not possible");
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
      window.log(`[treeMoveActions] Button clicked: ${dir} for node: ${nodeObj.title}`);
      window.log("[treeMoveActions] treeData BEFORE move:", JSON.stringify(treeData, null, 2));
      window.log("[treeMoveActions] selectedNodePath BEFORE move:", window.selectedNodePath);

      const moved = moveNode(nodeObj, dir, treeData);

      if (moved) {
        window.log("[treeMoveActions] moveNode returned true");
        window.log("[treeMoveActions] treeData AFTER move:", JSON.stringify(treeData, null, 2));
        window.log("[treeMoveActions] selectedNodePath AFTER move:", window.selectedNodePath);

        const container = nodeEl.closest('#tree');
        window.log("[treeMoveActions] container element:", container);

        if (container) {
          const rendered = renderTreeFn(
            treeData,
            clickHandler,
            "editButtons",
            window.selectedNodePath,
            addMoveButtons
          );
          window.log("[treeMoveActions] rendered tree element:", rendered);

          container.innerHTML = '';
          container.appendChild(rendered);
        } else {
          window.log("[treeMoveActions] container not found, cannot re-render tree");
        }
      } else {
        window.log("[treeMoveActions] moveNode returned false, nothing moved");
      }
    };
    btnContainer.appendChild(btn);
  });

  nodeEl.appendChild(btnContainer);
                  }
