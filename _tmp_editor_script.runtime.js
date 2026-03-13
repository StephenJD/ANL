

window.log = function(msg){
  const logDiv = document.getElementById("logDiv");
  if(logDiv){
    logDiv.textContent += msg + "\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
};

log("Step 1: Content editor script started");

// =====================
// Controller State
// =====================
let selectedNodePath = null;
let treeData = [];
let currentFile = null;
let rawBody = "";
let pendingMoveNodePath = null;

let renderTreeFn = null;
let renderFormFn = null;
let saveEdit = ()=>log("saveEdit not loaded yet");
let publishEdits = ()=>log("publishEdits not loaded yet");
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");
let treeMoveActions = null;

let editButtons = null;

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

    if(editButtons) editButtons.update(selectedNodePath);
    renderTree();
    return;
  }

  selectedNodePath = path;
  log("Node selected: " + path);
  if(editButtons) editButtons.update(selectedNodePath);
  renderTree();
}

// =====================
// Render tree
// =====================
function renderTree(){
  const treeContainer = document.getElementById("tree");
  if(!treeContainer || !renderTreeFn) return;

  const scrollTop = treeContainer.scrollTop;
  const scrollLeft = treeContainer.scrollLeft;
  const pageScrollTop = window.scrollY || 0;
  const pageScrollLeft = window.scrollX || 0;

  treeContainer.innerHTML = "";
  treeContainer.appendChild(
    renderTreeFn(treeData, selectedNodePath, selectNode)
  );

  treeContainer.scrollTop = scrollTop;
  treeContainer.scrollLeft = scrollLeft;
  window.scrollTo(pageScrollLeft, pageScrollTop);
}

// =====================
// Show editor on edit button
// =====================
function showEditorForSelectedNode(){
  if(!selectedNodePath) return;
  const node = findNodeByPath(treeData, selectedNodePath);
  if(!node) return;

  const editorContainer = document.getElementById("editorContainer");
  const editForm = document.getElementById("editForm");
  const frontMatterText = document.getElementById("frontMatterText");

  if(editorContainer && editForm && frontMatterText){
    document.getElementById("tree").style.display = "none";
    editorContainer.style.display = "block";
    if (editButtons?.setEditing) editButtons.setEditing(true);

    (async ()=>{
      try{
        log("[frontmatter] start_edit request for " + node.path);
        const res = await fetch("/.netlify/functions/start_edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: node.path })
        });
        log("[frontmatter] start_edit status " + res.status);
        if(res.ok){
          const data = await res.json();
          const rawFrontMatter = data.rawFrontMatter || "";
          const content = data.content || "";
          let innerFrontMatter = "";
          const match = rawFrontMatter.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (match) innerFrontMatter = match[1];
          const rawBody = rawFrontMatter ? content.slice(rawFrontMatter.length).replace(/^\s*\n/, "") : content;
          node.rawBody = rawBody;
          frontMatterText.value = innerFrontMatter;
          let frontMatterObj = {};
          try {
            const { normalizeFrontMatter } = await import("/js/webeditor/normalizeFrontMatter.js");
            frontMatterObj = normalizeFrontMatter("---\n" + innerFrontMatter + "\n---");
          } catch (err) {
            frontMatterObj = {};
          }
          node.edit = frontMatterObj;
          if(renderFormFn) renderFormFn(node, frontMatterObj);
          log("[frontmatter] loaded length=" + rawFrontMatter.length);
        } else {
          const errText = await res.text();
          log("[frontmatter] start_edit error: " + errText);
          frontMatterText.value = "";
          if(renderFormFn) renderFormFn(node, {});
        }
      }catch(err){
        log("[frontmatter] start_edit exception: " + err);
        frontMatterText.value = "";
        if(renderFormFn) renderFormFn(node, {});
      }
    })();

  }
}
window.showEditorForSelectedNode = showEditorForSelectedNode;

// =====================
// Load helper modules
// =====================
async function loadHelpers(){
  log("Step 2: Loading helpers...");
  try{
    try{ const mod = await import('/js/webeditor/renderTree.js'); renderTreeFn = mod.renderTree; log("renderTree loaded"); } catch(e){ log("renderTree load failed: " + e); }
    try{ const mod = await import('/js/webeditor/renderForm.js'); renderFormFn = mod.renderForm; log("renderForm loaded"); } catch(e){ log("renderForm load failed: " + e); }
    try{ const mod = await import('/js/webeditor/editActions.js'); ({ saveEdit, publishEdits, cancelEdit, dropEdits } = mod.setupEditActions({value: currentFile}, {value: rawBody})); log("editActions loaded"); } catch(e){ log("editActions load failed: " + e); }
    try{ const mod = await import('/js/webeditor/treeMoveActions.js'); treeMoveActions = mod; window.treeMoveActions = mod; log("treeMoveActions loaded"); } catch(e){ log("treeMoveActions load failed: " + e); }

    try{
      const mod = await import('/js/webeditor/editButtons.js');
      editButtons = mod.setupEditButtons(
        "treeEditButtons",
        treeData,
        handleMove,
        showEditorForSelectedNode
      );
      log("editButtons loaded and initialized");
    }catch(e){ log("editButtons load failed: " + e); }

    log("Step 2: Helper loading complete");
  }catch(err){ log("loadHelpers fatal error: " + err); }
}

// =====================
// Reconstruct parent references
// =====================
function reconstructTree(nodes, parent = null) {
  return nodes.map(node => {
    const newNode = { ...node };
    newNode.parent = parent;
    if (newNode.children?.length) {
      newNode.children = reconstructTree(newNode.children, newNode);
    }
    return newNode;
  });
}

// =====================
// Move / Save / Drop handler
// =====================
function handleMove(action) {
    if (!selectedNodePath) return;

    const node = findNodeByPath(treeData, selectedNodePath);
    if (!node) return;
    const editorContainer = document.getElementById("editorContainer");
    const isEditing = editorContainer && editorContainer.style.display === "block";

    if (["up","down"].includes(action)) {
        let moved = treeMoveActions.moveNode(node, action);
        if (!moved) return;

        log('Moved node "' + (node.title || node.path) + '" -> "' + action + '"');
    }
    else if (action === "to") {
        pendingMoveNodePath = selectedNodePath;
        log('Move To armed for "' + (node.title || node.path) + '". Select a target.');
    }
    else if (action === "save") {
        if (isEditing) {
          hideEditor();
          return;
        }
        node.editState = "staged";
        log('Saved node "' + (node.title || node.path) + '" to tmp');
    }
    else if (action === "drop") {
        if (isEditing) {
          hideEditor();
          return;
        }
        if (node.editState === "moved" || node.editState === "staged") {
          treeMoveActions.dropMove(node, treeData)
        }
        log('Dropped node "' + (node.title || node.path) + '"');
    }

    renderTree();
    if (editButtons) editButtons.update(selectedNodePath);
    hideEditor();
}

// =====================
// Frontmatter editor save/drop buttons
// =====================
function hideEditor(){
  const editorContainer = document.getElementById("editorContainer");
  if(editorContainer) editorContainer.style.display = "none";
  document.getElementById("tree").style.display = "block";
  if (editButtons?.setEditing) editButtons.setEditing(false);
}

document.addEventListener("click", e=>{
  if(e.target.id === "saveFrontMatter" || e.target.id === "dropFrontMatter") {
    e.preventDefault();
  }
});

// =====================
// Load tree
// =====================
async function loadTree(){
  log("Step 3: Loading tree...");
  try{
    const res = await fetch("/.netlify/functions/list_content_tree");
    log("Tree HTTP status: " + res.status);
    if(res.ok) {
      const jsonSafeTree = await res.json();
      const rootParent = { path: "(root)", children: [] };
      treeData = reconstructTree(jsonSafeTree, rootParent); // <-- reconstruct parents
      rootParent.children = treeData;
    } else {
      log("Tree fetch failed with HTTP " + res.status);
    }

    renderTree();
    log("Tree rendered");
  }catch(err){ log("loadTree fatal error: " + err); }
}

// =====================
// Utility: find node by path
// =====================
function findNodeByPath(nodes, path){
  for(const n of nodes){
    if(n.path === path) return n;
    if(n.children?.length){
      const found = findNodeByPath(n.children, path);
      if(found) return found;
    }
  }
  return null;
}

// =====================
// Initialize
// =====================
async function init(){
  log("Step 0: Initializing editor");
  await loadHelpers();
  await loadTree();
  log("Step 4: Initialization complete");
}

init();


