// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

let buttonsWrapper = null;
let buttons = {};
let treeDataRef = null;

let renderTreeCallback = null;     // called after move to re-render
let showEditorCallback = null;     // called by Edit button to show frontmatter

export function setupEditButtons(containerId, treeData, renderTreeFn, showEditorFn) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return null;
  }
  window.log("[editButtons] container lookup = FOUND");

  treeDataRef = treeData;
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

  // Move buttons: receive selectedNodePath from generator
  ["up","down","left","right","after"].forEach(dir => {
    if(buttons[dir]) buttons[dir].addEventListener("click", () => {
      if(!treeDataRef || !window.selectedNodePath) return;

      const node = findNodeByPath(treeDataRef, window.selectedNodePath);
      if(!node) return;

      let moved = false;
      if(dir === "after") moved = moveAfterNextSelected(node, treeDataRef, window.selectedNodePath);
      else moved = moveNode(node, dir, treeDataRef);

      if(moved){
        window.log(`[editButtons] node moved ${dir}: ${node.title || node.path}`);
        if(renderTreeCallback) renderTreeCallback();
        update(window.selectedNodePath);
      }
    });
  });

  // Edit button shows frontmatter via generator callback
  if(buttons.edit){
    buttons.edit.addEventListener("click", () => {
      if(showEditorCallback) showEditorCallback();
    });
  }

  // Enable/disable buttons based on selection from generator
  function update(selectedPath){
    const anySelected = !!selectedPath;
    for(const id in buttons){
      if(buttons.hasOwnProperty(id)) buttons[id].disabled = !anySelected;
    }
    window.log(`[editButtons] buttons updated selected=${anySelected}`);
  }

  return { update };
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

