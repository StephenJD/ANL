// /js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-10");

let treeRoot = null;
let startEditCallbackRef = null;
let buttonsInitialised = false;

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null,
  depth = 0,
  updateButtonsFn = null // NEW: function to call when node selected
) {
  if (!nodes) return document.createTextNode("Tree missing");
  if (!treeRoot) treeRoot = fullTreeRoot || nodes;
  if (!startEditCallbackRef) startEditCallbackRef = startEditCallback;

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    const displayTitle = (node.qualification ? node.qualification + " " : "") + (node.title || node.rawName);

    span.textContent = displayTitle;
    span.style.cursor = "pointer";
    span.style.padding = "2px 4px";
    span.style.color = node.edit?.moved ? "orange" : "blue";
    if (selectedNodePath === node.path) {
      span.style.fontWeight = "bold";
      span.style.backgroundColor = "#def";
    }

    // ON NODE CLICK → update selected path AND call updateButtonsFn
    span.onclick = () => {
      selectedNodePath = node.path;
      if (updateButtonsFn) updateButtonsFn(selectedNodePath);
    };

    li.appendChild(span);

    if (node.children?.length) {
      li.appendChild(renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, treeRoot, depth + 1, updateButtonsFn));
    }

    ul.appendChild(li);
  });

  // INITIALIZE BUTTONS ONLY ON TOP LEVEL
  if (depth === 0 && !buttonsInitialised) {
    buttonsInitialised = true;
  }

  return ul;
}
