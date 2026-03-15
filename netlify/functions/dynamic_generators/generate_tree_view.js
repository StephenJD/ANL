// netlify/functions/dynamic_generators/generate_tree_view.js
export default async function generate_tree_view() {
  return `
<h1>Site Tree View</h1>
<div>
  <div id="logWindow" style="background:#222;color:#fff;padding:8px;font-size:13px;max-height:120px;overflow:auto;margin-bottom:8px;"></div>
  <div id="tree"></div>
  <div id="treeEditButtons"></div>
</div>
<script type="module">
window.log = function(...msg) {
  console.log(...msg);
  const logDiv = document.getElementById("logWindow");
  if (logDiv) {
    const line = document.createElement("div");
    line.textContent = msg.map(m => (typeof m === "object" ? JSON.stringify(m) : m)).join(" ");
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
  }
};
window.log("[tree-view] Script loaded");
import { getNetlifyAuthHeaders } from "/js/netlifyAuthFetch.js";
import { renderTree } from "/js/webeditor/renderTree.js";
import { setupEditButtons } from "/js/webeditor/editButtons.js";

let treeData = [];
let selectedNodePath = null;
let editButtons = null;

function selectNode(path) {
  selectedNodePath = path;
  if (editButtons) editButtons.update(selectedNodePath);
  renderTreeUI();
}

function renderTreeUI() {
  const treeContainer = document.getElementById("tree");
  if (!treeContainer) {
    window.log("[tree-view] ERROR: #tree not found");
    return;
  }
  treeContainer.innerHTML = "";
  if (!treeData || !treeData.length) {
    window.log("[tree-view] No tree data to render");
    treeContainer.textContent = "No tree data.";
    return;
  }
  treeContainer.appendChild(
    renderTree(treeData, selectedNodePath, selectNode)
  );
  window.log("[tree-view] Tree rendered");
}

async function loadTree() {
  window.log("[tree-view] Loading tree data...");
  try {
    const res = await fetch("/.netlify/functions/list_content_tree", {
      headers: getNetlifyAuthHeaders()
    });
    window.log("[tree-view] list_content_tree status:", res.status);
    if (res.ok) {
      const jsonSafeTree = await res.json();
      window.log("[tree-view] Tree data loaded", jsonSafeTree);
      treeData = jsonSafeTree;
      renderTreeUI();
    } else {
      window.log("[tree-view] ERROR: Failed to load tree data");
    }
  } catch (e) {
    window.log("[tree-view] ERROR: Exception while loading tree data", e);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  window.log("[tree-view] DOMContentLoaded");
  editButtons = setupEditButtons(
    "treeEditButtons",
    treeData,
    null, // handleMove not needed for view-only
    selectNode,
    null,
    null
  );
  await loadTree();
});
</script>
`;
}
