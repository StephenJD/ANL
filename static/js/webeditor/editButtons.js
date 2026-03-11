// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

let buttonsWrapper = null;
let buttons = {};
let selectedNodePath = null;
let treeDataRef = null;

let onNodeSelectCallback = null;   // for node clicks
let renderTreeCallback = null;     // called after move to re-render
let showEditorCallback = null;     // called by Edit button to show frontmatter

export function setupEditButtons(containerId, treeData, renderTreeFn, onNodeSelect, showEditorFn) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return null;
  }
  window.log("[editButtons] container lookup = FOUND");

  treeDataRef = treeData;
  onNodeSelectCallback = onNodeSelect;
  renderTreeCallback = renderTreeFn;
  showEditorCallback = showEditorFn;

  container.style.display = "flex";

  if (buttonsWrapper) container.removeChild(buttonsWrapper);
  buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "edit-buttons-wrapper";
  buttonsWrapper.style.display = "flex";
  buttonsWrapper.style.gap = "6px";
  container.appendChild(buttonsWrapper);

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

  // Move buttons
  ["up","down","left","right","after"].forEach(dir => {
    if(buttons[dir]) buttons[dir].addEventListener("click", () => doMove(dir));
  });

  // Edit button
  if(buttons.edit){
    buttons.edit.addEventListener("click", () => {
      if(showEditorCallback) showEditorCallback();
    });
  }

  update(selectedNodePath);

  return { update };
}

function doMove(direction){
  if(!selectedNodePath || !treeDataRef) return;
  const node = findNodeByPath(treeDataRef, selectedNodePath);
  if(!node) return;

  let moved = false;
  if(direction === "after") moved = moveAfterNextSelected(node, treeDataRef, selectedNodePath);
  else moved = moveNode(node, direction, treeDataRef);

  if(moved){
    window.log(`[editButtons] node moved ${direction}: ${node.title || node.path}`);
    if(renderTreeCallback) renderTreeCallback();
    update(selectedNodePath);
  }
}

function findNodeByPath(nodes, path){
  for(const n of nodes){
    if(n.path === path) return n;
    if(n.children?.length){
      const found = findNodeByPath(n.children, path);
      if(found) return found;
    }
  }
  return null;
}

function update(selectedPath = null){
  selectedNodePath = selectedPath;
  const anySelected = !!selectedNodePath;
  for(const id in buttons){
    if(buttons.hasOwnProperty(id)) buttons[id].disabled = !anySelected;
  }
  window.log(`[editButtons] buttons updated selected=${anySelected}`);
      }
