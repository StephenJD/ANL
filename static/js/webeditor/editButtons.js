// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

let buttonsWrapper = null;
let buttons = {};
let moveCallback = null;
let showEditorCallback = null;

export function setupEditButtons(containerId, treeData, moveFn, showEditorFn) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return null;
  }
  window.log("[editButtons] container lookup = FOUND");

  moveCallback = moveFn;
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
  ["up","down","after"].forEach(dir => {
    if (buttons[dir]) {
      buttons[dir].addEventListener("click", () => {
        if (moveCallback) moveCallback(dir);
      });
    }
  });

  // Save button
  if(buttons.save){
    buttons.save.addEventListener("click", () => {
      if(moveCallback) moveCallback("save");
    });
  }

  // Drop button
  if(buttons.drop){
    buttons.drop.addEventListener("click", () => {
      if(moveCallback) moveCallback("drop");
    });
  }

  // Edit button hides tree
  if (buttons.edit) {
    buttons.edit.addEventListener("click", () => {
      const treeDiv = document.getElementById("tree");
      if(treeDiv) treeDiv.style.display = "none";
      if (showEditorCallback) showEditorCallback();
    });
  }

  // Update button states based on node editState
  function update(selectedPath){
    const anySelected = !!selectedPath;

    for(const id in buttons){
      buttons[id].disabled = !anySelected;
    }

    if(!anySelected){
      window.log("[editButtons] buttons updated selected=false");
      return;
    }

    const node = findNodeByPath(treeData, selectedPath);

    if(node){
      if(buttons.save){
        buttons.save.disabled = node.editState !== "moved";
      }
      if(buttons.drop){
        buttons.drop.disabled = !(node.editState === "moved" || node.editState === "staged");
      }
    }

    window.log(`[editButtons] buttons updated selected=true`);
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
