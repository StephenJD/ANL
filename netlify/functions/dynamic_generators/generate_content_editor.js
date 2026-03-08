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

<script type="module">

// ===== Inline log helper =====
function log(msg) {
  const logDiv = document.getElementById("logDiv");
  if(logDiv) { logDiv.textContent += msg + "\\n"; logDiv.scrollTop = logDiv.scrollHeight; }
  console.log(msg);
}
log("Step 1: generator script started");

// =====================
// Import helpers
// =====================
import { qualifyTitle } from '/js/webeditor/qualifyTitle.js';
import { renderTree } from '/js/webeditor/renderTree.js';
import { parseMarkdown } from '/js/webeditor/parseMarkdown.js';
import { renderForm } from '/js/webeditor/renderForm.js';
import { setupEditActions } from '/js/webeditor/editActions.js';

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
    treeContainer.appendChild(renderTree(tree, async (file) => {
      currentFile = file;
      document.getElementById("editButtons").style.display = "block";
      document.getElementById("tree").style.display = "none";

      const res = await fetch("/.netlify/functions/start_edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file })
      });
      if(!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      const parsed = parseMarkdown(data.content);
      rawBody = parsed.rawBody;
      await renderForm(parsed.frontMatter);
    }));
  } catch(err) {
    log("loadTree error: " + err);
  }
}

// =====================
// Initialize editor
// =====================
loadTree();

</script>
`;
}
