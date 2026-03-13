// netlify/functions/dynamic_generators/generate_content_editor.js
export default async function generate_content_editor() {
  return `
<h1>Content Editor</h1>

<div>

  <div id="tree"></div>

  <div id="editorContainer" style="display:none;">
    <form id="editForm"></form>

    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;height:200px;margin-bottom:10px;"></textarea>

    <div style="margin-top:10px;"></div>
  </div>

</div>

<div id="logDiv"></div>

<div id="treeEditButtons"></div>

<script type="module">

window.log = function(msg){
  const logDiv = document.getElementById("logDiv");
  if(logDiv){
    logDiv.textContent += msg + "\\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
};

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
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");
let treeMoveActions = null;

let editButtons = null;
let editDirty = false;
let newMode = false;

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
async function showEditorForSelectedNode(){
  newMode = false;
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
      await ensureParentFrontMatter(node);
      return;
    }

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
          loadEditorFromContent(node, content, rawFrontMatter);
          ensureParentFrontMatter(node);
          log("[frontmatter] loaded length=" + rawFrontMatter.length);
        } else {
          const errText = await res.text();
          log("[frontmatter] start_edit error: " + errText);
          frontMatterText.value = "";
          if(renderFormFn) renderFormFn(node, {});
          ensureParentFrontMatter(node);
          wireEditDirtyTracking();
        }
      }catch(err){
        log("[frontmatter] start_edit exception: " + err);
        frontMatterText.value = "";
        if(renderFormFn) renderFormFn(node, {});
        ensureParentFrontMatter(node);
        wireEditDirtyTracking();
      }
    })();

  }
}
window.showEditorForSelectedNode = showEditorForSelectedNode;

function showBlankEditorForSelectedNode(){
  newMode = true;
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
    editDirty = false;
    if (editButtons?.setDirty) editButtons.setDirty(false);
    frontMatterText.value = "";
    node.rawBody = "";
    node.frontMatterOriginal = {};
    if(renderFormFn) renderFormFn(node, {});
    wireEditDirtyTracking();
  }
}

// =====================
// Load helper modules
// =====================
async function loadHelpers(){
  log("Step 2: Loading helpers...");
  try{
    try{ const mod = await import('/js/webeditor/renderTree.js'); renderTreeFn = mod.renderTree; log("renderTree loaded"); } catch(e){ log("renderTree load failed: " + e); }
    try{ const mod = await import('/js/webeditor/renderForm.js'); renderFormFn = mod.renderForm; log("renderForm loaded"); } catch(e){ log("renderForm load failed: " + e); }
    try{
      const mod = await import('/js/webeditor/editActions.js');
      const actions = mod.setupEditActions(treeData, selectedNodePathRef);
      saveEdit = actions.saveEditFrontmatter;
      dropEdits = actions.dropNode;
      cancelEdit = actions.cancelEdit;
      log("editActions loaded");
    } catch(e){ log("editActions load failed: " + e); }
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
async function handleMove(action) {
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
          if (newMode) {
            log("[handleMove] new mode save not implemented");
            return;
          }
          log("[handleMove] save from editor");
          if (saveEdit) {
            await saveEdit();
            editDirty = false;
            if (editButtons?.setDirty) editButtons.setDirty(false);
          }
          hideEditor();
          renderTree();
          if (editButtons) editButtons.update(selectedNodePath);
          return;
        }
        if (!node.edit) node.edit = {};
        node.edit.staged = true;
        log('Saved node "' + (node.title || node.path) + '" to tmp');
    }
    else if (action === "drop") {
        if (isEditing) {
          if (dropEdits) await dropEdits();
          editDirty = false;
          if (editButtons?.setDirty) editButtons.setDirty(false);
          newMode = false;
          hideEditor();
          return;
        }
        if (node.edit?.staged) {
          node.edit.staged = null;
          cleanupEdit(node);
        } else if (node.edit?.moved) {
          treeMoveActions.dropMove(node, treeData);
        } else if (node.edit?.edited) {
          node.edit.edited = null;
          cleanupEdit(node);
        }
        log('Dropped node "' + (node.title || node.path) + '"');
    }
    else if (action === "new") {
        showBlankEditorForSelectedNode();
        return;
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
        const builtTree = reconstructTree(jsonSafeTree, rootParent); // <-- reconstruct parents
        treeData.length = 0;
        treeData.push(...builtTree);
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

function wireEditDirtyTracking(){
  const editorContainer = document.getElementById("editorContainer");
  const form = document.getElementById("editForm");
  const frontMatterText = document.getElementById("frontMatterText");
  if (!editorContainer || !form || !frontMatterText) return;

  const markDirty = () => {
    if (!editDirty) {
      editDirty = true;
      if (editButtons?.setDirty) editButtons.setDirty(true);
    }
  };

  editorContainer.oninput = markDirty;
  editorContainer.onchange = markDirty;
  frontMatterText.oninput = markDirty;
  frontMatterText.onchange = markDirty;
}

async function loadEditorFromContent(node, content, rawFrontMatterOverride = null){
  const frontMatterText = document.getElementById("frontMatterText");
  let rawFrontMatter = rawFrontMatterOverride;
  if (rawFrontMatter == null) {
    const match = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
    rawFrontMatter = match ? match[0] : "";
  }

  let innerFrontMatter = "";
  const matchInner = rawFrontMatter.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
  if (matchInner) innerFrontMatter = matchInner[1];

  const rawBody = rawFrontMatter ? content.slice(rawFrontMatter.length).replace(/^\\s*\\n/, "") : content;
  node.rawBody = rawBody;
  if (frontMatterText) frontMatterText.value = innerFrontMatter;

  let frontMatterObj = {};
  try {
    const { normalizeFrontMatter } = await import("/js/webeditor/normalizeFrontMatter.js");
    frontMatterObj = normalizeFrontMatter("---\\n" + innerFrontMatter + "\\n---");
  } catch (err) {
    frontMatterObj = {};
  }

  if(renderFormFn) renderFormFn(node, frontMatterObj);
  node.frontMatterOriginal = { ...frontMatterObj };
  node.frontMatterOriginalText = innerFrontMatter;
  node.frontMatterOriginalOrder = innerFrontMatter
    .split(/\\r?\\n/)
    .map(line => line.split("#")[0].trim())
    .filter(line => line.includes(":"))
    .map(line => line.split(":")[0].trim().toLowerCase());
  wireEditDirtyTracking();
}

async function ensureParentFrontMatter(node) {
  const parent = node?.parent;
  if (!parent || parent.frontMatterOriginal) return;
  const parentPath = String(parent.path || "");
  if (!parentPath.endsWith("_index.md")) return;

  try {
    const res = await fetch("/.netlify/functions/start_edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: parentPath })
    });
    if (!res.ok) return;
    const data = await res.json();
    const rawFrontMatter = data.rawFrontMatter || "";
    let innerFrontMatter = "";
    const match = rawFrontMatter.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
    if (match) innerFrontMatter = match[1];
    let frontMatterObj = {};
    try {
      const { normalizeFrontMatter } = await import("/js/webeditor/normalizeFrontMatter.js");
      frontMatterObj = normalizeFrontMatter("---\\n" + innerFrontMatter + "\\n---");
    } catch (err) {
      frontMatterObj = {};
    }
    parent.frontMatterOriginal = frontMatterObj;
  } catch (err) {
    // ignore
  }
}

function cleanupEdit(node){
  if (!node?.edit) return;
  const e = node.edit;
  if (!e.moved && !e.edited && !e.staged) delete node.edit;
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

</script>
`;
}
