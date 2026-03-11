// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

let buttonsWrapper = null;
let buttons = {};
let selectedNodePath = null;
let treeDataRef = null;
let nodeSelectCallback = null;

export function initEditButtons(containerId = "treeEditButtons", treeData = [], onNodeSelect) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return;
  }
  window.log("[editButtons] container lookup = FOUND");

  treeDataRef = treeData;
  nodeSelectCallback = onNodeSelect;

  container.style.display = "flex";

  // Clear any existing wrapper
  if (buttonsWrapper) container.removeChild(buttonsWrapper);

  buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "edit-buttons-wrapper";
  buttonsWrapper.style.display = "flex";
  buttonsWrapper.style.gap = "6px";
  container.appendChild(buttonsWrapper);

  // Define inline KISS buttons
  const btnDefs = [
    { id: "up", label: "↑" },
    { id: "down", label: "↓" },
    { id: "left", label: "←" },
    { id: "right", label: "→" },
    { id: "after", label: "↴" },
    { id: "copyUrl", label: "⧉" },
    { id: "edit", label: "✎" },
    { id: "save", label: "💾" },
    { id: "drop", label: "✘" },
    { id: "publish", label: "✔" }
  ];

  buttons = {};
  btnDefs.forEach(({ id, label }) => {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = label;
    btn.disabled = true;
    buttonsWrapper.appendChild(btn);
    buttons[id] = btn;
  });

  // Wire move actions
  if (buttons.up) buttons.up.addEventListener("click", () => doMove("up"));
  if (buttons.down) buttons.down.addEventListener("click", () => doMove("down"));
  if (buttons.left) buttons.left.addEventListener("click", () => doMove("left"));
  if (buttons.right) buttons.right.addEventListener("click", () => doMove("right"));
  if (buttons.after) buttons.after.addEventListener("click", () => doMove("after"));

  // Edit button shows frontmatter via client callback
  if (buttons.edit) buttons.edit.addEventListener("click", () => {
    if (nodeSelectCallback && selectedNodePath) nodeSelectCallback(selectedNodePath);
  });

  window.log(`[editButtons] initEditButtons COMPLETE`);
  updateEditButtons();
}

export function updateEditButtons(selectedPath = null) {
  selectedNodePath = selectedPath;
  const anySelected = !!selectedNodePath;

  for (const id in buttons) {
    if (buttons.hasOwnProperty(id)) {
      buttons[id].disabled = !anySelected;
    }
  }

  window.log(`[editButtons] buttons updated selected=${anySelected}`);
}

// Internal: perform move
function doMove(direction) {
  if (!selectedNodePath || !treeDataRef) return;
  const node = findNodeByPath(treeDataRef, selectedNodePath);
  if (!node) return;

  let moved = false;
  if (direction === "after") {
    moved = moveAfterNextSelected(node, treeDataRef, selectedNodePath);
  } else {
    moved = moveNode(node, direction, treeDataRef);
  }

  if (moved) {
    updateEditButtons(selectedNodePath);
    window.log(`[editButtons] node moved ${direction}: ${node.title || node.path}`);
  }
}

// Helper: find node by path
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
