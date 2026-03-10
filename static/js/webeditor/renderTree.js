// static/js/webeditor/renderTree.js

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsId = "editButtons",
  selectedNodePath = null,
  addMoveButtonsFn = null,
  fullTreeRoot = null
) {
  if (!fullTreeRoot) fullTreeRoot = nodes;

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node, idx) => {
    if (!node) return;

    const li = document.createElement("li");
    li.style.position = "relative";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = node.qualification + " " + (node.title || node.rawName);
    titleSpan.style.display = "inline-block";
    titleSpan.style.cursor = "pointer";
    titleSpan.style.padding = "2px 4px";
    if (selectedNodePath && node.path === selectedNodePath) {
      titleSpan.style.fontWeight = "bold";
    }

    if (node.edit && node.edit.moved) {
      titleSpan.style.color = "orange";
    } else {
      titleSpan.style.color = "blue";
    }

    titleSpan.onclick = e => {
      e.preventDefault();
      window.selectedNodePath = node.path;
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
      updateFixedEditButtons(node, fullTreeRoot, startEditCallback);
    };

    li.appendChild(titleSpan);
    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(
          node.children,
          startEditCallback,
          editButtonsId,
          selectedNodePath,
          addMoveButtonsFn,
          fullTreeRoot
        )
      );
    }

    ul.appendChild(li);
  });

  return ul;
}

// --- fixed top edit buttons container ---
export function createFixedEditButtons(containerId = "editButtonsContainer") {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.right = "0";
    container.style.background = "#f0f0f0";
    container.style.padding = "4px";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.gap = "4px";
    document.body.appendChild(container);
  }
  container.innerHTML = ""; // reset buttons
  return container;
}

// --- populate buttons for current selected node ---
export function updateFixedEditButtons(node, fullTreeRoot, startEditCallback) {
  const container = createFixedEditButtons();
  if (!node) {
    container.innerHTML = "";
    return;
  }

  const btns = [
    { id: "up", label: "↑", action: "moveUp" },
    { id: "down", label: "↓", action: "moveDown" },
    { id: "left", label: "←", action: "moveLeft" },
    { id: "right", label: "→", action: "moveRight" },
    { id: "afterNext", label: "⇥", action: "moveAfterNext" },
    { id: "copyUrl", label: "🔗", action: "copyUrl" },
    { id: "edit", label: "✎", action: "edit" },
    { id: "save", label: "💾", action: "save" },
    { id: "drop", label: "✗", action: "drop" },
    { id: "publish", label: "📤", action: "publish" }
  ];

  btns.forEach(b => {
    const btn = document.createElement("button");
    btn.textContent = b.label;
    btn.disabled = !node;
    btn.style.opacity = node ? "1" : "0.5";
    btn.onclick = e => {
      e.stopPropagation();
      handleFixedButtonAction(b.action, node, fullTreeRoot, startEditCallback);
    };
    container.appendChild(btn);
  });
}

// --- actual button actions ---
function handleFixedButtonAction(action, node, fullTreeRoot, startEditCallback) {
  if (!window.treeMoveActions) return;
  switch (action) {
    case "moveUp": window.treeMoveActions.moveNode(node, "up", fullTreeRoot); break;
    case "moveDown": window.treeMoveActions.moveNode(node, "down", fullTreeRoot); break;
    case "moveLeft": window.treeMoveActions.moveNode(node, "left", fullTreeRoot); break;
    case "moveRight": window.treeMoveActions.moveNode(node, "right", fullTreeRoot); break;
    case "moveAfterNext": /* implement after next selection */ break;
    case "copyUrl": navigator.clipboard.writeText(node.path); break;
    case "edit": startEditCallback(node.path); break;
    case "save": /* implement save */ break;
    case "drop": /* implement drop changes */ break;
    case "publish": /* implement publish */ break;
  }
  if (typeof renderTree.reRender === "function") renderTree.reRender(window.selectedNodePath);
    }
