// static/js/webeditor/editActions.js
window.log("editActions FILE LOADED 2026-03-11");

export function setupEditActions(treeDataRef = [], selectedNodePathRef = { value: null }) {

  function buildContentFromForm(form, node, overrides = null) {
    const illegal = Array.from(form.querySelectorAll("select")).filter(sel => sel.dataset?.illegal === "true");
    if (illegal.length) {
      window.log("[editActions] save blocked: illegal option(s) selected");
      return null;
    }
    const dataObj = {};
    const elements = Array.from(form.elements || []).filter(el => el && el.name);
    for (const el of elements) {
      if (el.type === "checkbox") {
        dataObj[el.name] = el.checked ? "true" : "false";
      } else {
        dataObj[el.name] = el.value;
      }
    }
    delete dataObj.page_type;
    delete dataObj.content_type;
    delete dataObj.give_content_prev_next_buttons;
    if (node?.frontMatterOriginal && Object.prototype.hasOwnProperty.call(node.frontMatterOriginal, "page_type")) {
      dataObj.page_type = node.frontMatterOriginal.page_type;
    }
    if (overrides && typeof overrides === "object") {
      for (const [k, v] of Object.entries(overrides)) {
        if (v === "" || v == null) delete dataObj[k];
        else dataObj[k] = v;
      }
    }

    let front = "---\n";
    for (const [k, v] of Object.entries(dataObj)) {
      if (v === "" || v == null) continue;
      front += `${k}: ${v}\n`;
    }
    front += "---\n";

    const content = front + (node?.rawBody || "");
    return { content, dataObj };
  }

  async function saveEditFrontmatter() {
    if (!selectedNodePathRef.value) return;
    const node = findNodeByPath(treeDataRef, selectedNodePathRef.value);
    if (!node) return;

    try {
      const form = document.getElementById("editForm");
      const result = buildContentFromForm(form, node);
      if (!result) return;
      const { content, dataObj } = result;
      window.log(`[editActions] save_edit start file=${node.path} fields=${Object.keys(dataObj).join(",")}`);
      const res = await fetch("/.netlify/functions/save_edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: node.path, content })
      });
      if (!res.ok) {
        const errText = await res.text();
        window.log(`[editActions] save_edit error status=${res.status} body=${errText}`);
        throw new Error("HTTP " + res.status);
      }

      // Mark node as edited (not staged)
      if (!node.edit) node.edit = {};
      node.edit.edited = content;
      node.edit.staged = null;

      window.log(`[editActions] save_edit ok file=${node.path} contentLen=${content.length}`);

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
      if (node.edit?.staged) {
        // Unstage only
        node.edit.staged = null;
        cleanupEdit(node);
      } else if (node.edit?.moved) {
        // Revert node to original position using node.path
        // reload tree or reposition logic if needed
        node.edit.moved = null;
        cleanupEdit(node);
      } else if (node.edit?.edited) {
        // Drop unsaved edits
        node.edit.edited = null;
        cleanupEdit(node);
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

  function cleanupEdit(node) {
    if (!node?.edit) return;
    const e = node.edit;
    if (!e.moved && !e.edited && !e.staged) delete node.edit;
  }

  return { saveEditFrontmatter, dropNode, cancelEdit, buildContentFromForm };
                                                     }
