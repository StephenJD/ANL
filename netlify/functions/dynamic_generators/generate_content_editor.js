// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {
  return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

<div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

<div id="editor" style="flex:1;">
  <form id="editForm"></form>
  <div id="editButtons" style="margin-top:20px;display:none;">
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

<script>

// ===== Inline log helper =====
function log(msg) {
  const logDiv = document.getElementById("logDiv");
  if(logDiv) {
    logDiv.textContent += msg + "\\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
}

log("Step 1: generator script started");

// =====================
// Load client-side helpers
// =====================

async function loadScript(src) {
  return new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src=src;
    s.onload=()=>{ log("Loaded script: "+src); resolve(); };
    s.onerror=()=>{ log("Failed to load script: "+src); reject(new Error("Script failed "+src)); };
    document.head.appendChild(s);
  });
}

(async()=>{
  try {
    await loadScript("/js/webeditor/qualifyTitle.js");
    await loadScript("/js/webeditor/renderTree.js");
    await loadScript("/js/webeditor/parseMarkdown.js");
    await loadScript("/js/webeditor/renderForm.js");
    await loadScript("/js/webeditor/editActions.js");

    log("All helper scripts loaded successfully");

    // =====================
    // Globals
    // =====================
    let currentFile = null;
    let rawBody = "";

    // Setup edit actions
    const { saveEdit, publishEdits, cancelEdit, dropEdits } = setupEditActions(
      { value: currentFile },
      { value: rawBody }
    );

    // =====================
    // Load Tree
    // =====================
    async function loadTree(){
      try {
        log("Loading tree...");
        const res = await fetch("/.netlify/functions/list_content_tree");
        log("Tree HTTP status: "+res.status);
        if(!res.ok) throw new Error("HTTP "+res.status);
        const tree = await res.json();
        log("Tree loaded successfully");

        document.getElementById("tree").appendChild(
          renderTree(tree, async (file) => {
            currentFile = file;
            document.getElementById("editButtons").style.display = "block";
            document.getElementById("tree").style.display = "none";

            const res = await fetch("/.netlify/functions/start_edit", {
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ file })
            });

            if(!res.ok) throw new Error("HTTP "+res.status);
            const data = await res.json();
            const parsed = parseMarkdown(data.content);
            rawBody = parsed.rawBody;
            await renderForm(parsed.frontMatter);
          })
        );

      } catch(err){
        log("loadTree error: "+err);
      }
    }

    // =====================
    // Initialize editor
    // =====================
    loadTree();

  } catch(err) {
    log("Script loading error: "+err);
  }
})();
</script>
`;
}
