// /js/webeditor/editButtons.js
window.log("editButtons FILE LOADED 2026-03-11");

let buttonsWrapper = null;
let buttons = {};
let selectedNodePath = null;

// Button ID → inline symbol/text
const buttonSymbols = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  after: "↳",
  copyUrl: "🔗",
  edit: "✎",
  save: "💾",
  drop: "✖",
  publish: "✔"
};

export function initEditButtons(containerId = "treeEditButtons", treeData = [], buttonHandlers = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editButtons] ERROR: container ${containerId} not found`);
    return;
  }

  container.style.display = "flex";

  if (buttonsWrapper) container.removeChild(buttonsWrapper);

  buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "edit-buttons-wrapper";
  buttonsWrapper.style.display = "flex";
  buttonsWrapper.style.gap = "6px";
  container.appendChild(buttonsWrapper);

  const btnDefs = Object.keys(buttonSymbols);

  buttons = {};
  btnDefs.forEach(id => {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = buttonSymbols[id];
    btn.disabled = true;
    if (buttonHandlers[id]) btn.addEventListener("click", buttonHandlers[id]);

    buttonsWrapper.appendChild(btn);
    buttons[id] = btn;
  });

  window.log(`[editButtons] initEditButtons COMPLETE with ${Object.keys(buttons).length} buttons`);
  updateEditButtons();
}

export function updateEditButtons(path) {
  selectedNodePath = path;
  const anySelected = !!selectedNodePath;

  if (!buttons || Object.keys(buttons).length === 0) {
    window.log("[editButtons] update called but buttons not created yet");
    return;
  }

  for (const id in buttons) {
    if (buttons.hasOwnProperty(id)) buttons[id].disabled = !anySelected;
  }

  window.log(`[editButtons] update buttons selected=${anySelected}`);
}
