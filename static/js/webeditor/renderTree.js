// static/js/webeditor/renderTree.js

export function renderTree(nodes, startEditCallback, editButtonsId = "editButtons") {
  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach(node => {
    const li = document.createElement("li");

    // Use qualifiedTitle from server
    const displayTitle = node.qualifiedTitle || node.title || "Untitled";

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = displayTitle;
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

    if (node.children && node.children.length) {
      li.appendChild(renderTree(node.children, startEditCallback, editButtonsId));
    }

    ul.appendChild(li);
  });

  return ul;
}
