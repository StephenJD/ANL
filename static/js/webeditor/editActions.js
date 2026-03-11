// static/js/webeditor/editActions.js
window.log("editActions FILE LOADED 2026-03-11");

export function setupEditActions(treeDataRef = [], selectedNodePathRef = { value: null }) {

  async function saveEditFrontmatter() {
    if (!selectedNodePathRef.value) return;
    const node = findNodeByPath(treeDataRef, selectedNodePathRef.value);
    if (!node) return;

    try {
      const form = document.getElementById("editForm");
      const data = new FormData(form);

      // Build frontmatter text
      let front = "---\n";
      for (const [k, v] of data.entries()) {
        front += `${k}: ${v}\n`;
      }
      front += "---\n";

      const content = front + (node.rawBody || "");
      const res = await fetch("/.netlify/functions/save_edit", {
        method: "POST",
        body: JSON.stringify({ file: node.path, content })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      // Mark node as staged
      node.editState = "staged";
      node.edit = Object.fromEntries(data.entries());

      // Close editor and update tree/buttons
      document.getElementById("editorContainer").style.display = "none";
      renderTreeAndButtons();

      window.log(`[editActions] Node "${node.title || node.path}" staged`);
    } catch (err) {
      console.error("saveEditFrontmatter error:", err);
    }
  }

  async function dropNode() {
    if (!selectedNodePathRef.value) return;
    const node = findNodeByPath(treeDataRef, selectedNodePathRef.value);
    if (!node) return;

    try {
      if (node.editState === "staged") {
        // Remove staged tmp copy
        const res = await fetch("/.netlify/functions/drop_edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: node.path })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);

        node.editState = "moved"; // revert to moved (red)
      } else if (node.editState === "moved") {
        // Revert node to original position using node.path
        // reload tree or reposition logic if needed
        node.editState = null;
      }

      // Close editor if open
      const editorContainer = document.getElementById("editorContainer");
      if (editorContainer) editorContainer.style.display = "none";

      renderTreeAndButtons();

      window.log(`[editActions] Node "${node.title || node.path}" dropped/reverted`);
    } catch (err) {
      console.error("dropNode error:", err);
    }
  }

  function cancelEdit() {
    const editorContainer = document.getElementById("editorContainer");
    if (editorContainer) editorContainer.style.display = "none";
    renderTreeAndButtons();
    window.log("[editActions] Edit cancelled");
  }

  function renderTreeAndButtons() {
    if (window.renderTree) window.renderTree(treeDataRef, selectedNodePathRef.value, window.selectNode);
    if (window.editButtons) window.editButtons.update(selectedNodePathRef.value);
  }

  function findNodeByPath(nodes, path) {
    for (const n of nodes) {
      if (n.path === path) return n;
      if (n.children?.length) {
        const found = findNodeByPath(n.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  return { saveEditFrontmatter, dropNode, cancelEdit };
                                                    }
