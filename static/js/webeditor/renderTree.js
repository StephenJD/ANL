// static/js/webeditor/renderTree.js
import { initEditButtons, updateEditButtons } from "./editButtons.js";
window.log("renderTree FILE LOADED 2026-03-10");

let treeRoot = null;
let startEditCallbackRef = null;
let buttonsInitialised = false;

export function renderTree(nodes, startEditCallback, editButtonsContainerId = "editButtons", selectedNodePath = null, fullTreeRoot = null, depth = 0) {
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

    span.onclick = () => {
      window.selectedNodePath = node.path;
      updateEditButtons();
      if (typeof renderTree.reRender === "function") renderTree.reRender(node.path);
    };

    li.appendChild(span);

    if (node.children?.length) {
      li.appendChild(renderTree(node.children, startEditCallback, editButtonsContainerId, selectedNodePath, treeRoot, depth + 1));
    }

    ul.appendChild(li);
  });

  if (depth === 0 && !buttonsInitialised) {
    window.log("[renderTree] TOP LEVEL COMPLETE → initialise buttons");
    initEditButtons(editButtonsContainerId, treeRoot, startEditCallbackRef);
    buttonsInitialised = true;
  }

  return ul;
}
