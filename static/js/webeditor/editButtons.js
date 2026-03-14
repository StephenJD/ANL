// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

let buttonsWrapper = null;
let buttons = {};
let moveCallback = null;
let showEditorCallback = null;

export function setupEditButtons(containerId, treeData, moveFn, showEditorFn, publishLocalFn, publishWebFn) {
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
    { id: "to", label: "↴" },
    { id: "copyUrl", label: "🔗" },
    { id: "edit", label: "✎" },
    { id: "new", label: "📝" },
    { id: "save", label: "✔" },
    { id: "drop", label: "✘" },
    { id: "publishLocal", label: "🏠" },
    { id: "publishWeb", label: "📤" }
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
  ["up","down","to"].forEach(dir => {
    if (buttons[dir]) {
      buttons[dir].addEventListener("click", () => {
        if (moveCallback) moveCallback(dir);
      });
    }
  });

  // Save button
  if (buttons.save) {
    buttons.save.addEventListener("click", () => {
      if (moveCallback) moveCallback("save");
    });
  }

  // Drop button
  if (buttons.drop) {
    buttons.drop.addEventListener("click", () => {
      if (moveCallback) moveCallback("drop");
    });
  }

  // Edit button hides tree
  if (buttons.edit) {
    buttons.edit.addEventListener("click", () => {
      const treeDiv = document.getElementById("tree");
      if (treeDiv) treeDiv.style.display = "none";
      if (showEditorCallback) showEditorCallback();
    });
  }

  // New button opens blank editor
  if (buttons.new) {
    buttons.new.addEventListener("click", () => {
      if (moveCallback) moveCallback("new");
    });
  }

  if (buttons.publishLocal) {
    buttons.publishLocal.addEventListener("click", () => {
      if (typeof publishLocalFn === "function") publishLocalFn();
    });
  }
  if (buttons.publishWeb) {
    buttons.publishWeb.addEventListener("click", () => {
      if (typeof publishWebFn === "function") publishWebFn();
    });
  }

  // Update button states based on node edit flags
  let isEditing = false;
  let isDirty = false;
  let lastSelectedPath = null;

  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocalHost && buttons.publishLocal) {
    buttons.publishLocal.style.display = "none";
  }

  function update(selectedPath) {
    lastSelectedPath = selectedPath;
    const anySelected = !!selectedPath;
    const anyStaged = hasAnyStaged(treeData);
    const anyStagedOrLocal = hasAnyStagedOrLocal(treeData);

    for (const id in buttons) {
      buttons[id].disabled = !anySelected;
    }

    if (buttons.publishLocal) buttons.publishLocal.disabled = !anyStaged || isEditing;
    if (buttons.publishWeb) buttons.publishWeb.disabled = !anyStagedOrLocal || isEditing;

    if (!anySelected) {
      window.log("[editButtons] buttons updated selected=false");
      return;
    }

    const node = findNodeByPath(treeData, selectedPath);

    if (node) {
      if (buttons.save) {
        if (isEditing) {
          buttons.save.disabled = !isDirty;
        } else {
          buttons.save.disabled = !(node.edit?.moved || node.edit?.edited);
        }
      }
      if (buttons.drop) {
        if (isEditing) {
          buttons.drop.disabled = false;
        } else {
          buttons.drop.disabled = !(node.edit?.moved || node.edit?.staged || node.edit?.edited);
        }
      }
      if (isEditing) {
        ["up","down","to","new"].forEach(id => {
          if (buttons[id]) buttons[id].disabled = true;
        });
        if (buttons.publishLocal) buttons.publishLocal.disabled = true;
        if (buttons.publishWeb) buttons.publishWeb.disabled = true;
      }
    }

    window.log(`[editButtons] buttons updated selected=true`);
  }

  function setEditing(value) {
    isEditing = !!value;
    update(lastSelectedPath);
  }

  function setDirty(value) {
    isDirty = !!value;
    update(lastSelectedPath);
  }

  return { update, setEditing, setDirty };
}

function findNodeByPath(nodes, path) {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children?.length) {
      const found = findNodeByPath(n.children, path);
      if (found) return found;
    }
  }
  return null;
}

function hasAnyStaged(nodes) {
  for (const n of nodes) {
    if (n.edit?.staged) return true;
    if (n.children?.length) {
      if (hasAnyStaged(n.children)) return true;
    }
  }
  return false;
}

function hasAnyStagedOrLocal(nodes) {
  for (const n of nodes) {
    if (n.edit?.staged || n.edit?.local) return true;
    if (n.children?.length) {
      if (hasAnyStagedOrLocal(n.children)) return true;
    }
  }
  return false;
}
