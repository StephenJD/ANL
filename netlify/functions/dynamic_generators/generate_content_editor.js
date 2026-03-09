// \netlify\functions\dynamic_generators\generate_content_editor.js
export default async function generate_content_editor() {
  return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

  <div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

  <div id="editor" style="flex:1;">
    <textarea id="fmText" style="width:100%;height:200px;margin-bottom:20px;"></textarea>
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

<script type="module">
  window.log = function(msg) {
    const logDiv = document.getElementById("logDiv");
    if(logDiv){ logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
    console.log(msg);
  }
  log("Step 1: generator script started");

  let currentFile = null;
  let rawBody = "";

  let saveEdit, publishEdits, cancelEdit, dropEdits;
  let renderTreeFn, parseMarkdownFn, renderFormFn;

  async function loadHelpers() {
    try {
      try { const mod = await import('/js/webeditor/renderTree.js'); renderTreeFn = mod.renderTree; log("renderTree loaded"); }
      catch(e){ log("renderTree failed: "+e); }

      try { const mod = await import('/js/webeditor/parseMarkdown.js'); parseMarkdownFn = mod.parseMarkdown; log("parseMarkdown loaded"); }
      catch(e){ log("parseMarkdown failed: "+e); }

      try { const mod = await import('/js/webeditor/renderForm.js'); renderFormFn = mod.renderForm; log("renderForm loaded"); }
      catch(e){ log("renderForm failed: "+e); }

      try { const mod = await import('/js/webeditor/editActions.js'); 
            ({ saveEdit, publishEdit, cancelEdit, dropEdits } = mod.setupEditActions({value: currentFile}, {value: rawBody})); 
            log("editActions loaded"); }
      catch(e){ log("editActions failed: "+e); }

      log("All helpers attempted to load");
    } catch(err) { log("loadHelpers fatal error: "+err); }
  }

  // =====================
  // Frontmatter textarea sync
  // =====================
  const fmTextarea = document.getElementById("fmText");

  function updateTextareaFromField(key, value) {
    const lines = fmTextarea.value.split("\\n");
    let found = false;
    for (let i=0;i<lines.length;i++){
      const [beforeComment, comment] = lines[i].split(/(?=#)/);
      if(beforeComment.trim().startsWith(key+":") || beforeComment.trim().startsWith(key+"=")){
        lines[i] = key + ": " + value + (comment || "");
        found = true;
        break;
      }
    }
    if(!found) lines.push(key + ": " + value);
    fmTextarea.value = lines.join("\\n");
  }

  function updateFieldFromTextarea(key, inputEl){
    const lines = fmTextarea.value.split("\\n");
    for(const line of lines){
      const [beforeComment] = line.split(/(?=#)/);
      const match = beforeComment.match(/^([\\w_]+)\\s*[:=]/);
      if(match && match[1].trim()===key){
        inputEl.value = line.split(/[:=]/)[1].trim();
        break;
      }
    }
  }

  // =====================
  // Load and render tree
  // =====================
  async function loadTree() {
    try {
      log("Loading tree...");
      const res = await fetch("/.netlify/functions/list_content_tree");
      log("Tree HTTP status: " + res.status);
      if(!res.ok) throw new Error("HTTP "+res.status);

      const tree = await res.json();
      log("Tree loaded successfully");

      const treeContainer = document.getElementById("tree");
      treeContainer.innerHTML = "";

      if(!renderTreeFn) { log("renderTree function not available"); return; }

      treeContainer.appendChild(
        renderTreeFn(tree, async (file)=>{
          try {
            currentFile = file;
            document.getElementById("editButtons").style.display="block";
            treeContainer.style.display="none";

            const res = await fetch("/.netlify/functions/start_edit", {
              method:"POST",
              headers:{"Content-Type":"application/json"},
              body: JSON.stringify({file})
            });
            log("start_edit HTTP status: "+res.status);
            if(!res.ok) throw new Error("HTTP "+res.status);

            const data = await res.json();
            if(!parseMarkdownFn){ log("parseMarkdown not available"); return; }
            const parsed = parseMarkdownFn(data.content);

            rawBody = parsed.rawBody || "";
            fmTextarea.value = rawBody;

            if(!renderFormFn){ log("renderForm not available"); return; }
            // render fields and wire each field to sync back to textarea
            await renderFormFn(parsed.frontMatter, (key, inputEl)=>{
              inputEl.oninput = ()=>updateTextareaFromField(key, inputEl.value);
            });

          } catch(e){ log("Tree click handler error: "+e); }
        })
      );

    } catch(err){ log("loadTree error: "+err); }
  }

  (async()=>{
    try{
      await loadHelpers();
      await loadTree();
      log("Editor initialized");
    }catch(e){ log("Initialization error: "+e); }
  })();

</script>
`;
}
