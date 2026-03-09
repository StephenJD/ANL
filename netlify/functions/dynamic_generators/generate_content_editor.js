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
    // ===== CLIENT-SIDE ONLY =====
    async function initContentEditor() {
      const logDiv = document.getElementById("logDiv");
      window.log = function(msg) {
        if(logDiv){ logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
        console.log(msg);
      };

      log("Step 1: Content editor script started");

      // globals
      let currentFile = null;
      let rawBody = "";
      let renderTreeFn, parseMarkdownFn, renderFormFn;
      let saveEdit, publishEdits, cancelEdit, dropEdits;

      // load helper modules
      log("Step 2: Loading helper modules...");
      try {
        try { const mod = await import('/js/webeditor/renderTree.js'); renderTreeFn = mod.renderTree; log("renderTree loaded"); }
        catch(e){ log("renderTree failed: "+e); }

        try { const mod = await import('/js/webeditor/parseMarkdown.js'); parseMarkdownFn = mod.parseMarkdown; log("parseMarkdown loaded"); }
        catch(e){ log("parseMarkdown failed: "+e); }

        try { const mod = await import('/js/webeditor/renderForm.js'); renderFormFn = mod.renderForm; log("renderForm loaded"); }
        catch(e){ log("renderForm failed: "+e); }

        try { const mod = await import('/js/webeditor/editActions.js'); 
              ({ saveEdit, publishEdits, cancelEdit, dropEdits } = mod.setupEditActions());
              log("editActions loaded"); }
        catch(e){ log("editActions failed: "+e); }

        log("Step 2: Helper modules attempted");
      } catch(err) {
        log("Fatal error loading helpers: "+err);
      }

      // fetch and render tree
      log("Step 3: Fetching content tree...");
      try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        log("Tree HTTP status: " + res.status);
        if(!res.ok) throw new Error("HTTP " + res.status);

        const tree = await res.json();
        log("Tree loaded successfully");

        if(renderTreeFn) {
          const treeContainer = document.getElementById("tree");
          treeContainer.innerHTML = "";
          treeContainer.appendChild(renderTreeFn(tree, async (file)=>{
            try {
              log("File clicked: " + file);
              currentFile = file;
              document.getElementById("editButtons").style.display = "block";
              document.getElementById("editor").style.display = "block";
              document.getElementById("tree").style.display = "none";

              const res = await fetch("/.netlify/functions/start_edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file })
              });
              log("start_edit HTTP status: " + res.status);
              if(!res.ok) throw new Error("HTTP " + res.status);

              const data = await res.json();
              rawBody = data.rawFrontMatter || "";
              document.getElementById("frontMatterText").value = rawBody;

              if(parseMarkdownFn && renderFormFn){
                const parsed = parseMarkdownFn(rawBody);
                await renderFormFn(parsed.frontMatter);

                const form = document.getElementById("editForm");
                form.addEventListener("input", () => {
                  const updatedFields = parsed.frontMatter;
                  for(const key in updatedFields){
                    const input = form.querySelector("[name='"+key+"']");
                    if(input) updatedFields[key] = input.value;
                  }
                  const lines = rawBody.split(/\\r?\\n/).map(line=>{
                    const match = line.match(/^([\\w_]+)\\s*[:=]/);
                    if(match && updatedFields[match[1]] !== undefined){
                      const comment = line.includes("#") ? line.slice(line.indexOf("#")) : "";
                      return match[1]+": "+updatedFields[match[1]]+comment;
                    }
                    return line;
                  });
                  document.getElementById("frontMatterText").value = lines.join("\\n");
                });
              }

            } catch(e){ log("File click handler error: "+e); }
          }));
        } else { log("renderTreeFn not loaded, cannot display tree"); }
      } catch(e){ log("Tree load failed: "+e); }

      log("Step 3: Content editor initialized");
    }

    initContentEditor();
  </script>
`;
}
