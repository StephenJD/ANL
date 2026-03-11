// static/js/webeditor/renderTree.js
window.log("renderTree FILE LOADED 2026-03-10");

let treeRoot = null;
let startEditCallbackRef = null;

export function renderTree(nodes, onNodeSelect, fullTreeRoot = null, depth = 0) {
  if (!nodes) return document.createTextNode("Tree missing");
  if (!treeRoot) treeRoot = fullTreeRoot || nodes;
  if (!startEditCallbackRef) startEditCallbackRef = onNodeSelect;

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

    // Node colouring now external; no selectedNodePath check
    // span styling for selection handled elsewhere

    span.onclick = () => {
      if (typeof onNodeSelect === "function") onNodeSelect(node.path);
    };

    li.appendChild(span);

    if (node.children?.length) {
      li.appendChild(renderTree(node.children, onNodeSelect, treeRoot, depth + 1));
    }

    ul.appendChild(li);
  });

  return ul;
}
