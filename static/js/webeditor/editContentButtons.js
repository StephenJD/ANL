
// static\js\webeditor\editContentButtons.js
window.log("editContentButtons FILE LOADED");

let buttonsWrapper = null;
let buttons = {};

export function setupEditButtons(containerId, editActions) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.log(`[editContentButtons] ERROR: container ${containerId} not found`);
    return null;
  }
  window.log("[editContentButtons] container lookup = FOUND");

  container.style.display = "flex";
  if (buttonsWrapper) container.removeChild(buttonsWrapper);

  buttonsWrapper = document.createElement("div");
  buttonsWrapper.className = "edit-buttons-wrapper";
  buttonsWrapper.style.display = "flex";
  buttonsWrapper.style.gap = "6px";
  container.appendChild(buttonsWrapper);

  const btnDefs = [
    { id: "editPage", label: "📄" },
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
    if (id === "editPage") btn.title = "Edit page body";
    buttonsWrapper.appendChild(btn);
    buttons[id] = btn;
  });

  // Save button
  buttons.save.addEventListener("click", () => {
    if (editActions && typeof editActions.save === "function") editActions.save();
  });

  // Drop button
  buttons.drop.addEventListener("click", () => {
    if (editActions && typeof editActions.drop === "function") editActions.drop();
  });

  // Edit page button opens body editor
  buttons.editPage.addEventListener("click", () => {
    if (editActions && typeof editActions.editPage === "function") editActions.editPage();
  });

  if (buttons.publishLocal) {
    buttons.publishLocal.addEventListener("click", () => {
      if (editActions && typeof editActions.publishLocal === "function") editActions.publishLocal();
    });
  }
  if (buttons.publishWeb) {
    buttons.publishWeb.addEventListener("click", () => {
      if (editActions && typeof editActions.publishWeb === "function") editActions.publishWeb();
    });
  }

  // Button state logic
  let isEditing = false;
  let isDirty = false;

  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocalHost && buttons.publishLocal) {
    buttons.publishLocal.style.display = "none";
  }

  function update(isEditMode) {
    isEditing = !!isEditMode;
    // Enable editPage always
    if (buttons.editPage) buttons.editPage.disabled = false;
    // Save enabled if dirty
    if (buttons.save) buttons.save.disabled = !isDirty;
    // Drop enabled if editing
    if (buttons.drop) buttons.drop.disabled = !isEditing;
    // Publish buttons enabled if not editing
    if (buttons.publishLocal) buttons.publishLocal.disabled = isEditing;
    if (buttons.publishWeb) buttons.publishWeb.disabled = isEditing;
  }

  function setEditing(value) {
    isEditing = !!value;
    update(isEditing);
  }

  function setDirty(value) {
    isDirty = !!value;
    update(isEditing);
  }

  return { update, setEditing, setDirty };

