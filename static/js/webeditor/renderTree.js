// static/js/webeditor/renderTree.js

export function renderTree(nodes, startEditCallback, editButtonsId = "editButtons") {
  console.log("[renderTree] Called with nodes:", nodes);

  if (!nodes) {
    console.error("[renderTree] ERROR: nodes is null or undefined");
    return document.createTextNode("Tree data missing");
  }

  if (!Array.isArray(nodes)) {
    console.error("[renderTree] ERROR: nodes is NOT an array!", nodes);
    // Try to coerce into array for safety
    nodes = Array.isArray(nodes.children) ? nodes.children : [nodes];
    console.log("[renderTree] nodes coerced to array:", nodes);
  }

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node, idx) => {
    if (!node) {
      console.warn(`[renderTree] Warning: node at index ${idx} is null/undefined`);
      return;
    }

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
        console.log("[renderTree] Node clicked:", node.path);
        const btn = document.getElementById(editButtonsId);
        if (btn) btn.style.display = "block";
        startEditCallback(node.path);
      }
    };

    li.appendChild(a);

    if (node.children && node.children.length) {
      console.log("[renderTree] Rendering children for:", displayTitle, node.children);
      li.appendChild(renderTree(node.children, startEditCallback, editButtonsId));
    }

    ul.appendChild(li);
  });

  console.log("[renderTree] Tree UL built successfully");
  return ul;
}
