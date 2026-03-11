// netlify/functions/dynamic_generators/generate_content_editor.js
export default async function generate_content_editor() {
  return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

  <div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

  <div id="editorContainer" style="flex:1; display:none;">
    <form id="editForm"></form>

    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;height:200px;margin-bottom:10px;"></textarea>
  </div>

</div>

<div id="logDiv" style="
border-top:1px solid #ccc;
margin-top:20px;
padding:10px;
max-height:300px;
overflow-y:auto;
background:#f9f9f9;
font-size:12px;
white-space:pre-wrap;
"></div>

</div>

<div id="treeEditButtons" style="
position:fixed;
bottom:0;
left:0;
right:0;
z-index:9999;
background:#fff;
border-top:1px solid #ccc;
padding:10px;
display:flex;
gap:10px;
box-shadow:0 -2px 5px rgba(0,0,0,0.1);
"></div>

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
let treeData = [];
let currentFile = null;
let rawBody = "";

let renderTreeFn = null;
let renderFormFn = null;
let saveEdit = ()=>log("saveEdit not loaded yet");
let publishEdits = ()=>log("publishEdits not loaded yet");
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");

let editButtons = null;

// =====================
// Selection
// =====================
function selectNode(path){
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
  treeContainer.innerHTML = "";
  treeContainer.appendChild(
    renderTreeFn(treeData, selectedNodePath, selectNode)
  );
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
    editorContainer.style.display = "block";
    frontMatterText.value = JSON.stringify(node.edit || {}, null, 2);
    if(renderFormFn) renderFormFn(node, editForm);
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
    try{ const mod = await import('/js/webeditor/editActions.js'); ({ saveEdit, publishEdits, cancelEdit, dropEdits } = mod.setupEditActions({value: currentFile}, {value: rawBody})); log("editActions loaded"); } catch(e){ log("editActions load failed: " + e); }
    try{ const mod = await import('/js/webeditor/treeMoveActions.js'); window.treeMoveActions = mod; log("treeMoveActions loaded"); } catch(e){ log("treeMoveActions load failed: " + e); }

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
// Move node handler (sequential)
// =====================
function handleMove(direction){
  if(!selectedNodePath) return;

  const node = findNodeByPath(treeData, selectedNodePath);
  if(!node) return;

  let moved = false;

  if(direction === "after")
    moved = treeMoveActions.moveAfterNextSelected(node, treeData, selectedNodePath);
  else
    moved = treeMoveActions.moveNode(node, direction, treeData);

  if(!moved) return;

  // mark node as moved
  node.editState = "moved";

  log(`Move "${direction}" for node "${node.title || node.path}" result: ${moved}`);

  renderTree();
  if(editButtons) editButtons.update(selectedNodePath);
}

// =====================
// Load tree
// =====================
async function loadTree(){
  log("Step 3: Loading tree...");
  try{
    const res = await fetch("/.netlify/functions/list_content_tree");
    log("Tree HTTP status: " + res.status);
    if(res.ok) treeData = await res.json();
    else log("Tree fetch failed with HTTP " + res.status);

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

</script>
`;
}
