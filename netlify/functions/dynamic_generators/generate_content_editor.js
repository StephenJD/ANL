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

    <div id="editButtons" style="margin-top:20px;">
      <button type="button" id="saveBtn">Save</button>
      <button type="button" id="publishBtn">Publish</button>
      <button type="button" id="cancelBtn">Cancel</button>
      <button type="button" id="dropBtn">Drop</button>
    </div>
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

<script type="module">
  import { addMoveButtons, moveNode } from '/js/webeditor/treeMoveActions.js';

  window.log = function(msg){
    const logDiv = document.getElementById("logDiv");
    if(logDiv){ logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
    console.log(msg);
  };
  log("Step 1: Content editor script started");

  // =====================
  // Globals
  // =====================
  let currentFile = null;
  let rawBody = "";
  let selectedNodePath = null;

  let saveEdit = ()=>log("saveEdit not loaded yet");
  let publishEdits = ()=>log("publishEdits not loaded yet");
  let cancelEdit = ()=>log("cancelEdit not loaded yet");
  let dropEdits = ()=>log("dropEdits not loaded yet");

  let renderTreeFn = null;
  let parseMarkdownFn = null;
  let renderFormFn = null;

  let treeData = [];

  // =====================
  // Load helper modules
  // =====================
  async function loadHelpers() {
    log("Step 2: Loading helpers...");
    try {
      try { const mod = await import('/js/webeditor/renderTree.js'); renderTreeFn = mod.renderTree; log("renderTree loaded"); } 
      catch(e){ log("renderTree load failed: " + e); }

      try { const mod = await import('/js/webeditor/parseMarkdown.js'); parseMarkdownFn = mod.parseMarkdown; log("parseMarkdown loaded"); }
      catch(e){ log("parseMarkdown load failed: " + e); }

      try { const mod = await import('/js/webeditor/renderForm.js'); renderFormFn = mod.renderForm; log("renderForm loaded"); }
      catch(e){ log("renderForm load failed: " + e); }

      try { const mod = await import('/js/webeditor/editActions.js'); 
            ({ saveEdit, publishEdits, cancelEdit, dropEdits } = mod.setupEditActions({value: currentFile}, {value: rawBody})); 
            log("editActions loaded"); }
      catch(e){ log("editActions load failed: " + e); }

      // attach listeners to buttons
      document.getElementById("saveBtn").addEventListener("click", saveEdit);
      document.getElementById("publishBtn").addEventListener("click", publishEdits);
      document.getElementById("cancelBtn").addEventListener("click", ()=>{
        cancelEdit();
        document.getElementById("editorContainer").style.display = "none";
        document.getElementById("tree").style.display = "block";
        selectedNodePath = null;
        renderTreeInPlace();
      });
      document.getElementById("dropBtn").addEventListener("click", ()=>{
        dropEdits();
        document.getElementById("editorContainer").style.display = "none";
        document.getElementById("tree").style.display = "block";
        selectedNodePath = null;
        renderTreeInPlace();
      });

      log("Step 2: Helper loading complete");
    } catch(err) {
      log("loadHelpers fatal error: " + err);
    }
  }

  // =====================
  // Load tree and render
  // =====================
  async function loadTree() {
    log("Step 3: Loading tree...");
    try {
      const treeContainer = document.getElementById("tree");
      if(!treeContainer){ log("Tree container missing"); return; }

      try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        log("Tree HTTP status: " + res.status);
        if(res.ok) treeData = await res.json();
        else log("Tree fetch failed with HTTP " + res.status);
      } catch(e){
        log("Tree fetch error: " + e);
      }

      renderTreeInPlace();

    } catch(err){
      log("loadTree fatal error: " + err);
    }
  }

  function renderTreeInPlace() {
    const container = document.getElementById("tree");
    if(!container) return;
    container.innerHTML = "";
    if(!renderTreeFn) { log("renderTree not available"); return; }

    container.appendChild(
      renderTreeFn(treeData, wrappedStartEdit, "editButtons", (nodeEl, nodeObj) => {
        if(selectedNodePath === nodeObj.path){
          addMoveButtons(nodeEl, nodeObj, treeData, renderTreeFn, wrappedStartEdit);
        }
      })
    );
  }

  // =====================
  // Node click callback
  // =====================
  const wrappedStartEdit = (node) => {
    selectedNodePath = node.path;
    document.getElementById("editorContainer").style.display = "block";
    document.getElementById("tree").style.display = "none";

    fetch("/.netlify/functions/start_edit", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ file: node.path })
    })
    .then(res => {
      if(!res.ok) throw new Error("HTTP "+res.status);
      return res.json();
    })
    .then(data => {
      rawBody = data.rawFrontMatter || "";
      document.getElementById("frontMatterText").value = rawBody;
      log("Front matter loaded for edit");
      renderTreeInPlace();
    })
    .catch(err => log("Error handling file click: "+err));
  };

  // =====================
  // Initialize editor
  // =====================
  async function init() {
    log("Step 0: Initializing editor");
    await loadHelpers();
    await loadTree();
    log("Step 4: Initialization complete");
  }

  init();

</script>
`;
}
