// static/js/webeditor/renderTree.js

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsId = "editButtons",
  selectedNodePath = null,
  addMoveButtonsFn = null,
  fullTreeRoot = null
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

  if (!fullTreeRoot) fullTreeRoot = nodes; // keep top-level reference

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

    const displayTitle = node.qualification + " " + (node.title || node.rawName);
    const titleSpan = document.createElement("span");
    titleSpan.textContent = displayTitle;
    titleSpan.style.display = "inline-block";
    titleSpan.style.cursor = "pointer";
    titleSpan.style.padding = "2px 4px";

    if (selectedNodePath && node.path === selectedNodePath) {
      titleSpan.style.backgroundColor = "#def";
    }

    titleSpan.onclick = e => {
      e.preventDefault();
      console.log("[renderTree] Node clicked:", node.path);
      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(node.path);
      }
    };

    li.appendChild(titleSpan);

    if (selectedNodePath && node.path === selectedNodePath) {
      const editBtn = document.createElement("button");
      editBtn.textContent = "✎";
      editBtn.style.marginLeft = "6px";
      editBtn.onclick = e => {
        e.stopPropagation();
        startEditCallback(node.path);
      };
      li.appendChild(editBtn);

      if (typeof addMoveButtonsFn === "function") {
        addMoveButtonsFn(li, node, fullTreeRoot, renderTree, startEditCallback);
      }
    }

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

  console.log("[renderTree] Tree UL built successfully");
  return ul;
          }
