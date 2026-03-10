// static/js/webeditor/renderTree.js

import { moveNode } from "./treeMoveActions.js"; // must exist
import { dropMove } from "./treeMoveActions.js"; // must exist
import { moveAfterNextSelected } from "./treeMoveActions.js"; // must exist
import { saveNode, publishNode, copyNodeUrl } from "./treeMoveActions.js"; // must exist

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null
) {
  if (!nodes) return document.createTextNode("Tree data missing");
  if (!fullTreeRoot) fullTreeRoot = nodes;

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

    // Colour based on edit flags
    if (node.edit && node.edit.moved) {
      titleSpan.style.color = "orange";
    } else if (node.edit) {
      titleSpan.style.color = "blue";
    } else {
      titleSpan.style.color = "black";
    }

    if (selectedNodePath === node.path) {
      titleSpan.style.fontWeight = "bold";
      titleSpan.style.backgroundColor = "#def";
    }

    titleSpan.onclick = (e) => {
      e.preventDefault();
      window.selectedNodePath = node.path;
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
    };

    li.appendChild(titleSpan);

    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, fullTreeRoot)
      );
    }

    ul.appendChild(li);
  });

  // Bottom bar buttons
  const btnContainer = document.getElementById(editButtonsContainerId);
  if (btnContainer) {
    btnContainer.innerHTML = "";

    const isNodeSelected = !!selectedNodePath;
    const buttons = [
      { id: "up", label: "↑", action: (n) => moveNode(n, "up", fullTreeRoot) },
      { id: "down", label: "↓", action: (n) => moveNode(n, "down", fullTreeRoot) },
      { id: "left", label: "←", action: (n) => moveNode(n, "left", fullTreeRoot) },
      { id: "right", label: "→", action: (n) => moveNode(n, "right", fullTreeRoot) },
      { id: "after", label: "→|", action: (n) => moveAfterNextSelected(n, fullTreeRoot, window.nextSelectedPath) },
      { id: "copyUrl", label: "Copy URL", action: (n) => copyNodeUrl(n) },
      { id: "edit", label: "✎", action: (n) => startEditCallback(n.path) },
      { id: "save", label: "💾", action: (n) => saveNode(n) },
      { id: "drop", label: "↺", action: (n) => dropMove(n) },
      { id: "publish", label: "📤", action: (n) => publishNode(n) },
    ];

    buttons.forEach((btn) => {
      const b = document.createElement("button");
      b.textContent = btn.label;
      b.disabled = !isNodeSelected;
      b.onclick = (e) => {
        e.stopPropagation();
        if (!isNodeSelected) return;
        const node = findNodeByPath(fullTreeRoot, selectedNodePath);
        if (!node) return;
        btn.action(node);
        if (typeof renderTree.reRender === "function") renderTree.reRender(selectedNodePath);
      };
      btnContainer.appendChild(b);
    });
  }

  return ul;
}

// utility to find node by path
function findNodeByPath(nodes, path) {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children && n.children.length) {
      const found = findNodeByPath(n.children, path);
      if (found) return found;
    }
  }
  return null  
}
