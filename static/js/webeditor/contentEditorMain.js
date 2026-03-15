
// Main entry for the Content Editor UI (migrated from original generator)

// Logging
window.log = function(msg){
  const logDiv = document.getElementById("logDiv");
  if(logDiv){
    logDiv.textContent += msg + "\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
};

window.logState = function(label, obj) {
  try {
    const state = JSON.stringify(obj, null, 2);
    log("[STATE] " + label + ":\n" + state);
  } catch (e) {
    log("[STATE] " + label + ": (unserializable)");
  }
};

const showLog = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.search.includes("debug=1"));
const logDiv = document.getElementById("logDiv");
if (logDiv && !showLog) {
  logDiv.style.display = "none";
}

log("Step 1: Content editor script started");

// =====================
// Controller State
// =====================
let selectedNodePath = null;
let selectedNodePathRef = { value: null };
let treeData = [];
let currentFile = null;
let rawBody = "";
let pendingMoveNodePath = null;

let renderTreeFn = null;
let renderFormFn = null;
let saveEdit = ()=>log("saveEdit not loaded yet");
let publishEdits = ()=>log("publishEdits not loaded yet");
let publishLocal = ()=>log("publishLocal not loaded yet");
let publishWeb = ()=>log("publishWeb not loaded yet");
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");
let buildContentFromForm = null;
let treeMoveActions = null;

let editButtons = null;
let editDirty = false;
let newMode = false;
let showBodyEditor = false;
let bodyImageToolsBound = false;


// =====================
// Selection
// =====================
function selectNode(path){
  if (pendingMoveNodePath) {
    const nodeToMove = findNodeByPath(treeData, pendingMoveNodePath);
    const targetNode = findNodeByPath(treeData, path);
    pendingMoveNodePath = null;
    if (nodeToMove && targetNode && treeMoveActions?.moveToTarget) {
      const moved = treeMoveActions.moveToTarget(nodeToMove, treeData, targetNode);
      if (moved) {
        selectedNodePath = nodeToMove.path;
        log('Moved node "' + (nodeToMove.title || nodeToMove.path) + '" to "' + (targetNode.title || targetNode.path) + '"');
      } else {
        selectedNodePath = path;
        log("Move To failed");
      }
    } else {
      selectedNodePath = path;
    }
    selectedNodePathRef.value = selectedNodePath;
    if(editButtons) editButtons.update(selectedNodePath);
    renderTree();
    return;
  }
  selectedNodePath = path;
  selectedNodePathRef.value = path;
  log("Node selected: " + path);
  if(editButtons) editButtons.update(selectedNodePath);
  renderTree();
}


// =====================
// Show editor on edit button
// =====================
async function showEditorForSelectedNode(options = {}) {
  showBodyEditor = !!options?.openBody;
  newMode = false;
  if (!selectedNodePath) return;
  const node = findNodeByPath(treeData, selectedNodePath);
  if (!node) return;
  node._newEdit = false;
  if (node.newParent) node.newParent = null;

  const editorContainer = document.getElementById("editorContainer");
  const editForm = document.getElementById("editForm");
  const editorHeader = document.getElementById("editorHeader");
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");

  if (editorContainer && editForm && frontMatterText) {
    const editorAlreadyOpen = editorContainer.style.display === "block";
    if (editorAlreadyOpen) {
      setBodyEditorVisible(showBodyEditor);
      if (showBodyEditor && bodyText && !bodyText.value) {
        bodyText.value = node?.rawBody || rawBody || "";
      }
      if (showBodyEditor) {
        await loadBodyFolderImages(node.path);
        autoSizeBody();
        scrollToBodyEditor();
      }
      return;
    }

    document.getElementById("tree").style.display = "none";
    editorContainer.style.display = "block";
    setBodyEditorVisible(showBodyEditor);
    if (editButtons?.setEditing) editButtons.setEditing(true);
    if (editorHeader) {
      const parent = node.parent;
      const parentLabel = parent
        ? (parent.qualification ? parent.qualification + " " : "") + (parent.title || parent.rawName || parent.path)
        : "(root)";
      editorHeader.textContent = "Parent: " + parentLabel;
    }
    editDirty = false;
    if (editButtons?.setDirty) editButtons.setDirty(false);
    // Any further edit should un-stage until saved again
    if (node.edit?.staged) {
      node.edit.staged = null;
      cleanupEdit(node);
    }

    if (node.edit?.edited) {
      editDirty = true;
      if (editButtons?.setDirty) editButtons.setDirty(true);
      await loadEditorFromContent(node, node.edit.edited);
      if (showBodyEditor) {
        await loadBodyFolderImages(node.path);
        scrollToBodyEditor();
      }
      if (newMode && renderFormFn) renderFormFn(node, {});
      await ensureParentFrontMatter(node);
      return;
    }

    (async () => {
      try {
        log('[frontmatter] Fetching /.netlify/functions/start_edit for file: ' + node.path);
        const res = await fetch("/.netlify/functions/start_edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: node.path })
        });
        log('[frontmatter] start_edit status ' + res.status);
        if (res.ok) {
          const data = await res.json();
          const rawFrontMatter = data.rawFrontMatter || "";
          const content = data.content || "";
          await loadEditorFromContent(node, content, rawFrontMatter);
          if (showBodyEditor) {
            await loadBodyFolderImages(node.path);
            scrollToBodyEditor();
          }
          ensureParentFrontMatter(node);
          log('[frontmatter] loaded length=' + rawFrontMatter.length);
        } else {
          const errText = await res.text();
          log('[frontmatter] start_edit error: ' + errText);
          if (frontMatterText) frontMatterText.value = "";
          if (bodyText) bodyText.value = "";
          if (renderFormFn) renderFormFn(node, {});
          ensureParentFrontMatter(node);
          wireEditDirtyTracking();
        }
      } catch (err) {
        log('[frontmatter] start_edit exception: ' + err);
        if (frontMatterText) frontMatterText.value = "";
        if (bodyText) bodyText.value = "";
        if (renderFormFn) renderFormFn(node, {});
        ensureParentFrontMatter(node);
        wireEditDirtyTracking();
      }
    })();
  }
}

// Expose main entry points
window.showEditorForSelectedNode = showEditorForSelectedNode;
window.selectNode = selectNode;
// ...expose other globals as needed...

// On page load, load helpers and tree
window.addEventListener('DOMContentLoaded', async () => {
  await loadHelpers();
  await loadTree();
});
