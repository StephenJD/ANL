// static/js/webeditor/renderTree.js
import { qualifyTitle } from "./qualifyTitle.js";

export function renderTree(nodes, startEditCallback, editButtonsId = "editButtons") {
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach(node => {
    const li = document.createElement("li");

    // Assign qualified title
    node.qualifiedTitle = qualifyTitle(node, node.parentType || null);

    // Node label
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = node.qualifiedTitle;
    a.style.display = "block";
    a.style.cursor = "pointer";

    a.onclick = e => {
      e.preventDefault();
      if (node.path) {
        document.getElementById(editButtonsId).style.display = "block";
        startEditCallback(node.path);
      }
    };

    li.appendChild(a);

    // Render children recursively
    if (node.children && node.children.length) {
      li.appendChild(renderTree(node.children, startEditCallback, editButtonsId));
    }

    ul.appendChild(li);
  });

  return ul;
}
