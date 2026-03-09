// netlify/functions/dynamic_generators/generate_content_editor.js
export async function generate_content_editor() {
  return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

  <div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

  <div id="editor" style="flex:1; display:none;">
    <form id="editForm"></form>

    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;height:200px;margin-bottom:10px;"></textarea>

    <div id="editButtons" style="margin-top:20px;">
      <button type="button" onclick="saveEdit()">Save</button>
      <button type="button" onclick="publishEdits()">Publish</button>
      <button type="button" onclick="dropEdits()">Drop Edits</button>
      <button type="button" onclick="cancelEdit()">Cancel</button>
    </div>
  </div>

</div>

<div id="logDiv" style="
border-top:1px solid #ccc;
margin-top:20px;
padding:10px;
max-height:200px;
overflow-y:auto;
background:#f9f9f9;
font-size:12px;
white-space:pre-wrap;
"></div>

<script type="module">
  // ===== Inline log helper =====
  window.log = function(msg){
    const logDiv = document.getElementById("logDiv");
    if(logDiv){ logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
    console.log(msg);
  };
  log("Step 1: generator script started");

  let currentFile = null;
  let rawBody = "";

  let saveEdit, publishEdits, cancelEdit, dropEdits;
  let renderTreeFn, parseMarkdownFn, renderFormFn;

  // =====================
  // Load helper modules with full logging
  // =====================
  async function loadHelpers() {
    log("Step 2: loadHelpers started");
    const modules = [
      { path: '/js/webeditor/renderTree.js', name: 'renderTree' },
      { path: '/js/webeditor/parseMarkdown.js', name: 'parseMarkdown' },
      { path: '/js/webeditor/renderForm.js', name: 'renderForm' },
      { path: '/js/webeditor/editActions.js', name: 'editActions' }
    ];

    for (const mod of modules) {
      try {
        log(\`Attempting import: \${mod.path}\`);
        const imported = await import(mod.path);
        if(mod.name === 'editActions'){
          ({ saveEdit, publishEdits, cancelEdit, dropEdits } = imported.setupEditActions({value: currentFile}, {value: rawBody}));
        } else {
          if(mod.name === 'renderTree') renderTreeFn = imported.renderTree;
          if(mod.name === 'parseMarkdown') parseMarkdownFn = imported.parseMarkdown;
          if(mod.name === 'renderForm') renderFormFn = imported.renderForm;
        }
        log(\`\${mod.name} loaded successfully\`);
      } catch(e) {
        log(\`\${mod.name} import failed: \${e.message}\`);
      }
    }
    log("Step 2: loadHelpers complete");
  }

  // =====================
  // Load tree with logging
  // =====================
  async function loadTree() {
    log("Step 3: loadTree started");
    try {
      const res = await fetch("/.netlify/functions/list_content_tree");
      log("Tree fetch status: " + res.status);
      if(!res.ok) throw new Error("HTTP " + res.status);

      const tree = await res.json();
      log("Tree loaded: " + JSON.stringify(tree, null, 2));

      if(!renderTreeFn) { log("renderTreeFn not available"); return; }

      const treeContainer = document.getElementById("tree");
      treeContainer.innerHTML = "";
      treeContainer.appendChild(
        renderTreeFn(tree, async (file) => {
          try {
            log("Tree node clicked: " + file);
          } catch(err) {
            log("Tree node click handler error: " + err.message);
          }
        })
      );
      log("Tree rendered successfully");
    } catch(err) {
      log("loadTree error: " + err.message);
    }
    log("Step 3: loadTree complete");
  }

  // =====================
  // Initialize page
  // =====================
  async function init() {
    log("Step 0: init started");
    await loadHelpers();
    await loadTree();
    log("Step 0: init complete");
  }

  init();
</script>
`;
}
