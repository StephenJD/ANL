// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-10");

let buttonsWrapper = null;
let buttons = {};
let selectedNodePath = null;

export function initEditButtons(containerId = "editButtons", treeData = [], startEditCallback) {

  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return;
  }
  window.log("[editButtons] container lookup = FOUND");

  // Wait for layout before inserting buttons
  function waitForLayout(callback, attempt = 0) {
    const rect = container.getBoundingClientRect();
    window.log(`[editButtons] container rect attempt=${attempt} height=${rect.height} width=${rect.width}`);
    if (rect.height > 0 && rect.width > 0) {
      callback();
    } else if (attempt < 30) { // max ~500ms wait (30*16ms)
      requestAnimationFrame(() => waitForLayout(callback, attempt + 1));
    } else {
      window.log("[editButtons] WARNING: container still has zero size, inserting buttons anyway");
      callback();
    }
  }

  waitForLayout(() => {
    container.style.display = "flex";

    // Clear any existing buttons wrapper
    if (buttonsWrapper) container.removeChild(buttonsWrapper);

    buttonsWrapper = document.createElement("div");
    buttonsWrapper.className = "edit-buttons-wrapper";
    buttonsWrapper.style.display = "flex";
    buttonsWrapper.style.gap = "6px";
    container.appendChild(buttonsWrapper);

    // Define button list
    const btnDefs = [
      "up","down","left","right","after",
      "copyUrl","edit","save","drop","publish"
    ];

    buttons = {};
    btnDefs.forEach(id => {
      const btn = document.createElement("button");
      btn.id = id;
      btn.textContent = id;
      btn.disabled = true;
      buttonsWrapper.appendChild(btn);
      buttons[id] = btn;
    });

    window.log(`[editButtons] children AFTER wrapper=${buttonsWrapper.children.length}`);

    updateEditButtons();
    window.log("[editButtons] initEditButtons COMPLETE");
  });
}

export function updateEditButtons(selectedPath = window.selectedNodePath) {
  selectedNodePath = selectedPath;

  if (!buttons || Object.keys(buttons).length === 0) {
    window.log("[editButtons] update called but buttons not created yet");
    return;
  }

  const anySelected = !!selectedNodePath;
  for (const id in buttons) {
    if (buttons.hasOwnProperty(id)) {
      buttons[id].disabled = !anySelected;
      if (!anySelected) window.log(`[editButtons] button ${id} disabled=true`);
    }
  }

  if (anySelected) window.log(`[editButtons] update buttons selected=true`);
  else window.log(`[editButtons] update buttons selected=false`);
}
