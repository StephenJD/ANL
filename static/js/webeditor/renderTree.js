// static/js/webeditor/renderTree.js
import { initEditButtons, updateEditButtons } from "./editButtons.js";
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
  depth = 0
) {
  if (!nodes) {
    window.log("[renderTree] ERROR: nodes missing");
    return document.createTextNode("Tree missing");
  }

  if (!treeRoot) treeRoot = fullTreeRoot || nodes;
  if (!startEditCallbackRef) startEditCallbackRef = startEditCallback;

  window.log(`[renderTree] Called depth=${depth} nodes=${nodes.length}`);

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

    if (node.edit && node.edit.moved) { span.style.color = "orange"; }
    else { span.style.color = "blue"; }

    if (selectedNodePath === node.path) {
      span.style.fontWeight = "bold";
      span.style.backgroundColor = "#def";
    }

    span.onclick = () => {
      window.selectedNodePath = node.path;
      window.log(`[renderTree] CLICK node=${node.path}`);
      updateEditButtons();
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
    };

    li.appendChild(span);

    if (node.children && node.children.length) {
      const childTree = renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, treeRoot, depth + 1);
      li.appendChild(childTree);
    }

    ul.appendChild(li);
  });

  // initialise buttons only at top-level
  if (depth === 0 && !buttonsInitialised) {
    window.log("[renderTree] TOP LEVEL COMPLETE → initialise buttons");
    // wait until next paint so container has non-zero height
    requestAnimationFrame(() => {
      initEditButtons(editButtonsContainerId, treeRoot, startEditCallbackRef);
      buttonsInitialised = true;
    });
  }

  return ul;
                          }
