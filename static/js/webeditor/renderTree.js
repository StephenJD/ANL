// static/js/webeditor/renderTree.js

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

function copyNodeUrl(node) { window.log(`[stub] Copy URL for node: ${node.path}`); }
function saveNode(node) { window.log(`[stub] Save node: ${node.path}`); }
function publishNode(node) { window.log(`[stub] Publish node: ${node.path}`); }

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null,
  depth = 0
) {
  window.log(`[renderTree] Called with nodes at depth ${depth}:`, nodes);

  if (!nodes) return document.createTextNode("Tree data missing");
  if (!fullTreeRoot) fullTreeRoot = nodes;

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node, idx) => {
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
      window.log(`[renderTree] Node ${node.path} is moved → orange`);
    } else if (node.edit) {
      titleSpan.style.color = "blue";
      window.log(`[renderTree] Node ${node.path} edited → blue`);
    } else {
      titleSpan.style.color = "black";
      window.log(`[renderTree] Node ${node.path} normal → black`);
    }

    if (selectedNodePath === node.path) {
      titleSpan.style.fontWeight = "bold";
      titleSpan.style.backgroundColor = "#def";
      window.log(`[renderTree] Node ${node.path} is selected`);
    }

    titleSpan.onclick = (e) => {
      e.preventDefault();
      window.selectedNodePath = node.path;
      window.log(`[renderTree] Node clicked: ${node.path}`);
      updateButtonStates(fullTreeRoot, editButtonsContainerId);
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
    };

    li.appendChild(titleSpan);

    // Recursively render children
    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, fullTreeRoot, depth + 1)
      );
    }

    ul.appendChild(li);
  });

  // Bottom-bar buttons only at top-level
  if (depth === 0) {
    const btnContainer = document.getElementById(editButtonsContainerId);
    if (!btnContainer) {
      window.log(`[renderTree] ERROR: button container '${editButtonsContainerId}' not found`);
    } else if (!btnContainer.hasChildNodes()) {
      window.log("[renderTree] Setting up bottom-bar buttons");
      const isNodeSelected = !!selectedNodePath;

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
        b.disabled = !isNodeSelected;
        b.id = `btn_${btn.id}`;
        b.onclick = (e) => {
          e.stopPropagation();
          const node = findNodeByPath(fullTreeRoot, window.selectedNodePath);
          if (!node) {
            window.log(`[renderTree] ERROR: selected node not found for button ${btn.id}`);
            return;
          }
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

// Update bottom-bar buttons enabled/disabled
function updateButtonStates(fullTreeRoot, editButtonsContainerId) {
  const selected = !!window.selectedNodePath;
  window.log(`[renderTree] Node selected: ${selected}`);
  ["up","down","left","right","after","copyUrl","edit","save","drop","publish"].forEach(id => {
    const b = document.getElementById(`btn_${id}`);
    if (!b) window.log(`[renderTree] Button ${id} not found`);
    else b.disabled = !selected;
  });
        }
