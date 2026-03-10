// static/js/webeditor/renderTree.js

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

// Stub actions
function copyNodeUrl(node) { window.log(`[stub] Copy URL for node: ${node.path}`); }
function saveNode(node) { window.log(`[stub] Save node: ${node.path}`); }
function publishNode(node) { window.log(`[stub] Publish node: ${node.path}`); }

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null
) {
  window.log("[renderTree] Called with nodes:", nodes);

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
      window.log("[renderTree] Node clicked:", node.path);
      updateButtonStates(fullTreeRoot, editButtonsContainerId);
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
    };

    li.appendChild(titleSpan);

    // Recursively render children
    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, fullTreeRoot)
      );
    }

    ul.appendChild(li);
  });

  // Only set up bottom-bar buttons once (top-level)
  if (nodes === fullTreeRoot) {
    const btnContainer = document.getElementById(editButtonsContainerId);
    if (btnContainer && !btnContainer.hasChildNodes()) {
      window.log("[renderTree] Setting up bottom-bar buttons");

      const buttons = [
        { id: "up", label: "↑", action: (n) => moveNode(n, "up", fullTreeRoot) },
        { id: "down", label: "↓", action: (n) => moveNode(n, "down", fullTreeRoot) },
        { id: "left", label: "←", action: (n) => moveNode(n, "left", fullTreeRoot) },
        { id: "right", label: "→", action: (n) => moveNode(n, "right", fullTreeRoot) },
        { id: "after", label: "→|", action: (n) => moveAfterNextSelected(n, fullTreeRoot, window.nextSelectedPath) },
        { id: "copyUrl", label: "🔗", action: (n) => copyNodeUrl(n) },
        { id: "edit", label: "✎", action: (n) => startEditCallback(n.path) },
        { id: "save", label: "💾", action: (n) => saveNode(n) },
        { id: "drop", label: "↺", action: (n) => dropMove(n) },
        { id: "publish", label: "📤", action: (n) => publishNode(n) },
      ];

      btnContainer.innerHTML = "";
      buttons.forEach((btn) => {
        const b = document.createElement("button");
        b.textContent = btn.label;
        b.disabled = true;  // initially disabled
        b.id = `btn_${btn.id}`;
        b.onclick = (e) => {
          e.stopPropagation();
          const node = findNodeByPath(fullTreeRoot, window.selectedNodePath);
          if (!node) return;
          window.log(`[renderTree] Button ${btn.id} clicked on node ${node.path}`);
          btn.action(node);
          if (typeof renderTree.reRender === "function") renderTree.reRender(window.selectedNodePath);
        };
        btnContainer.appendChild(b);
      });
    }
  }

  return ul;
}

// Utility to find node by path
function findNodeByPath(nodes, path) {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children && n.children.length) {
      const found = findNodeByPath(n.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Enable/disable bottom-bar buttons based on selection
function updateButtonStates(fullTreeRoot, editButtonsContainerId) {
  const selected = !!window.selectedNodePath;
  window.log(`[renderTree] Node selected: ${selected}`);
  ["up","down","left","right","after","copyUrl","edit","save","drop","publish"].forEach(id => {
    const b = document.getElementById(`btn_${id}`);
    if (b) b.disabled = !selected;
  });
         }
