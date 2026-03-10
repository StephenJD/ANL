// static/js/webeditor/renderTree.js

import { moveNode } from './treeMoveActions.js';

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsId = "editButtons",
  selectedNodePath = null,
  addMoveButtonsFn = null,
  fullTreeRoot = null,
  treeData = null
) {
  if (!fullTreeRoot) fullTreeRoot = nodes;
  if (!treeData) treeData = fullTreeRoot;

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node) => {
    if (!node) return;

    const li = document.createElement("li");
    li.style.position = "relative";

    const displayTitle = node.qualification + " " + (node.title || node.rawName);
    const titleSpan = document.createElement("span");
    titleSpan.textContent = displayTitle;
    titleSpan.style.display = "inline-block";
    titleSpan.style.cursor = "pointer";
    titleSpan.style.padding = "2px 4px";

    // color based on edit
    if (!node.edit) {
      titleSpan.style.color = "black";
    } else if (node.edit.includes("moved")) {
      titleSpan.style.color = "orange";
    } else {
      titleSpan.style.color = "blue";
    }

    // bold if selected
    if (selectedNodePath && node.path === selectedNodePath) {
      titleSpan.style.fontWeight = "bold";
    }

    titleSpan.onclick = e => {
      e.preventDefault();
      window.selectedNodePath = node.path;
      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(node.path);
      }
    };

    li.appendChild(titleSpan);

    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(
          node.children,
          startEditCallback,
          editButtonsId,
          selectedNodePath,
          addMoveButtonsFn,
          fullTreeRoot,
          treeData
        )
      );
    }

    ul.appendChild(li);
  });

  // Bottom fixed button panel
  let bottomBtnContainer = document.getElementById('bottomTreeButtons');
  if (!bottomBtnContainer) {
    bottomBtnContainer = document.createElement('div');
    bottomBtnContainer.id = 'bottomTreeButtons';
    bottomBtnContainer.style.position = 'fixed';
    bottomBtnContainer.style.bottom = '0';
    bottomBtnContainer.style.left = '0';
    bottomBtnContainer.style.right = '0';
    bottomBtnContainer.style.backgroundColor = '#f0f0f0';
    bottomBtnContainer.style.borderTop = '1px solid #ccc';
    bottomBtnContainer.style.padding = '6px';
    bottomBtnContainer.style.display = 'flex';
    bottomBtnContainer.style.flexWrap = 'wrap';
    bottomBtnContainer.style.alignItems = 'center';
    bottomBtnContainer.style.zIndex = '9999';
    document.body.appendChild(bottomBtnContainer);
  }

  const buttons = [
    { dir: 'up', label: '↑' },
    { dir: 'down', label: '↓' },
    { dir: 'left', label: '←' },
    { dir: 'right', label: '→' },
    { action: 'afterNext', label: '⇨' },
    { action: 'copyURL', label: '🔗' },
    { action: 'edit', label: '✎' },
    { action: 'save', label: '💾' },
    { action: 'drop', label: '✗' },
    { action: 'publish', label: '📤' }
  ];

  bottomBtnContainer.innerHTML = '';
  buttons.forEach(btnInfo => {
    const btn = document.createElement('button');
    btn.textContent = btnInfo.label;
    btn.style.margin = '2px';
    btn.disabled = !window.selectedNodePath;

    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.selectedNodePath) return;
      const nodeObj = findNodeByPath(window.selectedNodePath, treeData);
      if (!nodeObj) return;

      if (btnInfo.dir) {
        if (moveNode(nodeObj, btnInfo.dir, treeData)) {
          // mark moved in edit flag
          nodeObj.edit = nodeObj.edit ? [...new Set([...nodeObj.edit, 'moved'])] : ['moved'];
        }
      } else if (btnInfo.action === 'afterNext') {
        // implement move after next selected node logic if required
      } else if (btnInfo.action === 'copyURL') {
        navigator.clipboard.writeText(window.location.href + '#' + nodeObj.path);
      } else if (btnInfo.action === 'edit') {
        startEditCallback(nodeObj.path);
      } else if (btnInfo.action === 'save') {
        saveNode(nodeObj);
      } else if (btnInfo.action === 'drop') {
        dropChanges(nodeObj);
      } else if (btnInfo.action === 'publish') {
        publishNode(nodeObj);
      }

      // Re-render tree to reflect changes and maintain selection
      const container = document.getElementById('tree');
      if (container) {
        container.innerHTML = '';
        container.appendChild(renderTree(treeData, startEditCallback, editButtonsId, window.selectedNodePath, addMoveButtonsFn, fullTreeRoot, treeData));
      }
    };

    bottomBtnContainer.appendChild(btn);
  });

  return ul;
}

// helper to find node by path
function findNodeByPath(path, nodes) {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children && node.children.length) {
      const found = findNodeByPath(path, node.children);
      if (found) return found;
    }
  }
  return null;
}
