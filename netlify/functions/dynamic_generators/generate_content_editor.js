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

</div> <!-- end of flex container -->

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

</div> <!-- end wide-content -->

<!-- FIXED BUTTONS OUTSIDE ALL SCROLLING CONTAINERS -->
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
    if(logDiv){ logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
    console.log(msg);
  };
  log("Step 1: Content editor script started");

  // =====================
  // Globals
  // =====================
  let currentFile = null;
  let rawBody = "";
  let treeData = [];

  let saveEdit = ()=>log("saveEdit not loaded yet");
  let publishEdits = ()=>log("publishEdits not loaded yet");
  let cancelEdit = ()=>log("cancelEdit not loaded yet");
  let dropEdits = ()=>log("dropEdits not loaded yet");

  let renderTreeFn = null;
  let parseMarkdownFn = null;
  let renderFormFn = null;
  let addMoveButtonsFn = null;
  let updateEditButtons = null;

  // =====================
  // Node selection callback
  // =====================
  function selectNodePath(path) {
    if (typeof updateEditButtons === "function") updateEditButtons(path);
    log("Node selected: " + path);
    // Tree remains visible; front-matter editor shown only via edit button
  }

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

      try { const mod = await import('/js/webeditor/treeMoveActions.js'); 
            addMoveButtonsFn = mod.addMoveButtons; log("treeMoveActions loaded"); }
      catch(e){ log("treeMoveActions load failed: " + e); }

      try { const mod = await import('/js/webeditor/editButtons.js'); 
            updateEditButtons = mod.updateEditButtons;
            const { initEditButtons } = mod;
            // initialize fixed button set
            initEditButtons("treeEditButtons", [], null);
            log("editButtons loaded and initialized");
      } catch(e){ log("editButtons load failed: " + e); }

      log("Step 2: Helper loading complete");
    } catch(err) {
      log("loadHelpers fatal error: " + err);
    }
  }

  // =====================
  // Load and render tree
  // =====================
  async function loadTree() {
    log("Step 3: Loading tree...");
    try {
      const treeContainer = document.getElementById("tree");
      if(!treeContainer){ log("Tree container missing"); return; }

      let tree = [];
      try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        log("Tree HTTP status: " + res.status);
        if(res.ok) tree = await res.json();
        else log("Tree fetch failed with HTTP " + res.status);
      } catch(e){
        log("Tree fetch error: " + e);
      }

      treeData = tree;

      if (renderTreeFn) {
        treeContainer.innerHTML = "";
        treeContainer.appendChild(
            renderTreeFn(
                tree,
                null,          // startEditCallback no longer needed
                "treeEditButtons",
                null,
                tree,
                0,
                selectNodePath // callback for node selection
            )
        );
        log("Tree rendered with buttons wired for node selection");
      }
    } catch(err){
      log("loadTree fatal error: " + err);
    }
  }

  // =====================
  // Initialize
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
