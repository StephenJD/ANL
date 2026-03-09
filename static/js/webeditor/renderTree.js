// static/js/webeditor/renderTree.js

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsId = "editButtons",
  selectedNodePath = null,
  addMoveButtonsFn = null
) {
  console.log("[renderTree] Called with nodes:", nodes);

  if (!nodes) {
    console.error("[renderTree] ERROR: nodes is null or undefined");
    return document.createTextNode("Tree data missing");
  }

  if (!Array.isArray(nodes)) {
    console.error("[renderTree] ERROR: nodes is NOT an array!", nodes);
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
    li.style.position = "relative";

    const displayTitle = node.qualifiedTitle || node.title || "Untitled";

    const titleSpan = document.createElement("span");
    titleSpan.textContent = displayTitle;
    titleSpan.style.display = "inline-block";
    titleSpan.style.cursor = "pointer";
    titleSpan.style.padding = "2px 4px";

    // Highlight if selected
    if (selectedNodePath && node.path === selectedNodePath) {
      titleSpan.style.backgroundColor = "#def";
    }

    // Node click sets selection (but does NOT immediately edit)
    titleSpan.onclick = e => {
      e.preventDefault();
      console.log("[renderTree] Node clicked:", node.path);
      // signal to re-render tree with this node selected
      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(node.path);
      }
    };

    li.appendChild(titleSpan);

    // Add edit icon only if selected
    if (selectedNodePath && node.path === selectedNodePath) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "✎";
      editBtn.style.marginLeft = "6px";
      editBtn.onclick = e => {
        e.stopPropagation();
        startEditCallback(node.path);
      };
      li.appendChild(editBtn);

      // Add move buttons
      if (typeof addMoveButtonsFn === "function") {
        addMoveButtonsFn(li, node, nodes, renderTree, startEditCallback);
      }
    }

    // Render children recursively
    if (node.children && node.children.length) {
      li.appendChild(
        renderTree(
          node.children,
          startEditCallback,
          editButtonsId,
          selectedNodePath,
          addMoveButtonsFn
        )
      );
    }

    ul.appendChild(li);
  });

  console.log("[renderTree] Tree UL built successfully");
  return ul;
}
