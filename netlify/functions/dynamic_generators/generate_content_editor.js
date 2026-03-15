// netlify/functions/dynamic_generators/generate_content_editor.js
export default async function generate_content_editor() {
  return `
<h1>Content Editor</h1>

<div>

  <div id="tree"></div>

  <div id="editorContainer" style="display:none;">
    <div id="editorHeader" style="font-weight:bold;margin-bottom:8px;"></div>
    <form id="editForm"></form>

    <label for="frontMatterText">Front Matter:</label>
    <textarea id="frontMatterText" style="width:100%;min-height:80px;height:auto;overflow:hidden;margin-bottom:10px;"></textarea>

    <div id="bodyTextWrap" style="display:none;">
      <div id="bodyImageTools" style="margin-bottom:8px;">
        <label for="bodyImageSelect">Images in this folder:</label>
        <select id="bodyImageSelect" style="display:block;width:100%;margin:4px 0 4px 0;">
          <option value="">Select an image...</option>
        </select>
        <div style="margin:4px 0;font-size:0.9em;">
          <label style="margin-right:12px;"><input type="radio" name="imageAction" value="paste" checked /> Paste at cursor</label>
          <label><input type="radio" name="imageAction" value="copy" /> Copy link</label>
        </div>
        <span id="bodyImageCopyFeedback" style="font-size:0.85em;color:green;display:none;margin-bottom:4px;">Link copied!</span>
        <img id="bodyImagePreview" src="" alt="" style="display:none;max-width:100%;max-height:180px;border:1px solid #ccc;border-radius:4px;margin-bottom:8px;" />
        <div id="bodyImageDrop" style="border:1px dashed #888;padding:10px;border-radius:6px;cursor:pointer;user-select:none;">
          Drop image here or click to upload to this folder
        </div>
        <input id="bodyImageFile" type="file" accept="image/*" style="display:none;" />
      </div>
      <label for="bodyText">Page Body:</label>
      <textarea id="bodyText" style="width:100%;min-height:220px;height:auto;overflow:auto;margin-bottom:10px;"></textarea>
    </div>

    <div style="margin-top:10px;"></div>
  </div>

</div>

<div id="logDiv"></div>

<div id="treeEditButtons"></div>

<script type="module">
import { getNetlifyAuthHeaders } from "/js/netlifyAuthFetch.js";

window.log = function(msg){
  const logDiv = document.getElementById("logDiv");
  if(logDiv){
    logDiv.textContent += msg + "\\n";
    logDiv.scrollTop = logDiv.scrollHeight;
  }
  console.log(msg);
};

const showLog = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.search.includes("debug=1"));
const logDiv = document.getElementById("logDiv");
if (logDiv && !showLog) {
  logDiv.style.display = "none";
}

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
let publishLocal = ()=>log("publishLocal not loaded yet");
let publishWeb = ()=>log("publishWeb not loaded yet");
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");
let buildContentFromForm = null;
let treeMoveActions = null;

let editButtons = null;
let editDirty = false;
let newMode = false;
let showBodyEditor = false;
let bodyImageToolsBound = false;

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
// Publish
// =====================
function serializeTreeForPublish(nodes) {
  return (nodes || []).map(n => ({
    path: n.path,
    title: n.title || "",
    rawName: n.rawName || "",
    qualification: n.qualification || "",
    isIndex: !!n.isIndex,
    edit: n.edit ? {
      staged: !!n.edit.staged,
      local: !!n.edit.local,
      deleted: !!n.edit.deleted,
      moved: !!n.edit.moved,
      edited: n.edit.edited || null
    } : null,
    children: serializeTreeForPublish(n.children || [])
  }));
}

function markLocalPublished(nodes) {
  for (const n of nodes || []) {
    if (n.edit?.staged) {
      n.edit.local = true;
      if (n.edit.deleted) n.edit.deleted = true;
      n.edit.edited = null;
      n.edit.staged = null;
      if (!n.edit.moved && !n.edit.edited && !n.edit.local) delete n.edit;
    }
    if (n.children?.length) markLocalPublished(n.children);
  }
}

function clearPublishedEdits(nodes) {
  for (const n of nodes || []) {
    if (n.edit?.staged || n.edit?.local) {
      n.edit.staged = null;
      n.edit.local = null;
      n.edit.deleted = null;
      n.edit.edited = null;
      if (!n.edit.moved && !n.edit.edited) delete n.edit;
    }
    if (n.children?.length) clearPublishedEdits(n.children);
  }
}

function pruneDeletedNodes(nodes) {
  if (!nodes?.length) return;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.children?.length) pruneDeletedNodes(n.children);
    if (n.edit?.deleted && (n.edit?.staged || n.edit?.local)) {
      nodes.splice(i, 1);
    }
  }
}

async function publishEditsInternal(mode, localRootOverride = "") {
  try {
    const payload = { tree: serializeTreeForPublish(treeData), mode, localRoot: localRootOverride || "" };
    const res = await fetch("/.netlify/functions/publish_edits", {
      method: "POST",
      headers: getNetlifyAuthHeaders({ json: true }),
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    if (!res.ok) {
      try {
        const obj = JSON.parse(text);
        if (obj?.needLocalRoot) return { needLocalRoot: true };
      } catch (e) {
        // ignore
      }
      if (text.includes("Missing GITHUB_TOKEN")) {
        log("[publish] Missing GITHUB_TOKEN. Create one at github.com/settings/personal-access-tokens and set GITHUB_TOKEN.");
      }
      log("[publish] error status=" + res.status + " body=" + text);
      return null;
    }
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { /* ignore */ }
    log("[publish] ok " + text);
    if (obj?.rebuild) {
      if (obj.rebuild.ok) {
        log("[publish] rebuild ok" + (obj.rebuild.skipped ? " (skipped)" : ""));
      } else {
        log("[publish] rebuild failed: " + (obj.rebuild.detail || "unknown error"));
      }
    }
    if (mode === "local") {
      markLocalPublished(treeData);
    } else {
      pruneDeletedNodes(treeData);
      clearPublishedEdits(treeData);
    }
    renderTree();
    if (editButtons) editButtons.update(selectedNodePath);
    return { ok: true };
  } catch (err) {
    log("[publish] exception: " + err);
    return null;
  }
}

function pickLocalRootAndPublish() {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = true;
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    let rootPath = "";
    const rel = file.webkitRelativePath || "";
    if (file.path) {
      const normalized = String(file.path).replace(/\\\\/g, "/");
      if (rel) {
        const relParts = rel.split("/");
        relParts.pop();
        const relSuffix = relParts.join("/");
        if (relSuffix && normalized.endsWith(relSuffix)) {
          rootPath = normalized.slice(0, -relSuffix.length);
          rootPath = rootPath.replace(/\\/$/, "");
        }
      }
      if (!rootPath) {
        rootPath = normalized.replace(/\\/[^\\/]+$/, "");
      }
    }
    if (!rootPath) {
      log("[publish] local path unavailable; set LOCAL_GIT_ROOT env");
      return;
    }
    await publishEditsInternal("local", rootPath);
  };
  input.click();
}

publishLocal = async function publishLocal() {
  const result = await publishEditsInternal("local", "");
  if (result?.needLocalRoot) {
    pickLocalRootAndPublish();
  }
};

publishWeb = async function publishWeb() {
  await publishEditsInternal("web", "");
};

// =====================
// Show editor on edit button
// =====================
async function showEditorForSelectedNode(options = {}){
  showBodyEditor = !!options?.openBody;
  newMode = false;
  if(!selectedNodePath) return;
  const node = findNodeByPath(treeData, selectedNodePath);
  if(!node) return;
  node._newEdit = false;
  if (node.newParent) node.newParent = null;

  const editorContainer = document.getElementById("editorContainer");
  const editForm = document.getElementById("editForm");
  const editorHeader = document.getElementById("editorHeader");
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");

  if(editorContainer && editForm && frontMatterText){
    const editorAlreadyOpen = editorContainer.style.display === "block";
    if (editorAlreadyOpen) {
      setBodyEditorVisible(showBodyEditor);
      if (showBodyEditor && bodyText && !bodyText.value) {
        bodyText.value = node?.rawBody || rawBody || "";
      }
      if (showBodyEditor) {
        await loadBodyFolderImages(node.path);
        autoSizeBody();
        scrollToBodyEditor();
      }
      return;
    }

    document.getElementById("tree").style.display = "none";
    editorContainer.style.display = "block";
    setBodyEditorVisible(showBodyEditor);
    if (editButtons?.setEditing) editButtons.setEditing(true);
    if (editorHeader) {
      const parent = node.parent;
      const parentLabel = parent
        ? (parent.qualification ? parent.qualification + " " : "") + (parent.title || parent.rawName || parent.path)
        : "(root)";
      editorHeader.textContent = "Parent: " + parentLabel;
    }
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
      if (showBodyEditor) {
        await loadBodyFolderImages(node.path);
        scrollToBodyEditor();
      }
      if (newMode && renderFormFn) renderFormFn(node, {});
      await ensureParentFrontMatter(node);
      return;
    }

    (async ()=>{
      try{
        log("[frontmatter] start_edit request for " + node.path);
        const res = await fetch("/.netlify/functions/start_edit", {
          method: "POST",
          headers: getNetlifyAuthHeaders({ json: true }),
          body: JSON.stringify({ file: node.path })
        });
        log("[frontmatter] start_edit status " + res.status);
        if(res.ok){
          const data = await res.json();
          const rawFrontMatter = data.rawFrontMatter || "";
          const content = data.content || "";
          await loadEditorFromContent(node, content, rawFrontMatter);
          if (showBodyEditor) {
            await loadBodyFolderImages(node.path);
            scrollToBodyEditor();
          }
          ensureParentFrontMatter(node);
          log("[frontmatter] loaded length=" + rawFrontMatter.length);
        } else {
          const errText = await res.text();
          log("[frontmatter] start_edit error: " + errText);
          frontMatterText.value = "";
          if (bodyText) bodyText.value = "";
          if(renderFormFn) renderFormFn(node, {});
          ensureParentFrontMatter(node);
          wireEditDirtyTracking();
        }
      }catch(err){
        log("[frontmatter] start_edit exception: " + err);
        frontMatterText.value = "";
        if (bodyText) bodyText.value = "";
        if(renderFormFn) renderFormFn(node, {});
        ensureParentFrontMatter(node);
        wireEditDirtyTracking();
      }
    })();

  }
}
window.showEditorForSelectedNode = showEditorForSelectedNode;

function showBlankEditorForSelectedNode(){
  showBodyEditor = false;
  newMode = true;
  if(!selectedNodePath) return;
  const node = findNodeByPath(treeData, selectedNodePath);
  if(!node) return;
  node._newEdit = true;

  const editorContainer = document.getElementById("editorContainer");
  const editForm = document.getElementById("editForm");
  const editorHeader = document.getElementById("editorHeader");
  const frontMatterText = document.getElementById("frontMatterText");
  if(editorContainer && editForm && frontMatterText){
    document.getElementById("tree").style.display = "none";
    editorContainer.style.display = "block";
    if (editButtons?.setEditing) editButtons.setEditing(true);
    const qual = String(node.qualification || "").toLowerCase();
    const isParentQual = qual === "collated:" || qual === "navigation:";
    const newParent = isParentQual || node.children?.length ? node : (node.parent || node);
    node.newParent = newParent;
    if (editorHeader) {
      const parent = newParent;
      const parentLabel = parent
        ? (parent.qualification ? parent.qualification + " " : "") + (parent.title || parent.rawName || parent.path)
        : "(root)";
      editorHeader.textContent = "Parent: " + parentLabel;
    }
    editDirty = false;
    if (editButtons?.setDirty) editButtons.setDirty(false);
    frontMatterText.value = "";
    if (node) node.rawBody = "";
    setBodyEditorVisible(showBodyEditor);
    const bodyText = document.getElementById("bodyText");
    if (bodyText) bodyText.value = "";
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
      buildContentFromForm = actions.buildContentFromForm;
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
        showEditorForSelectedNode,
        publishLocal,
        publishWeb
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
            const form = document.getElementById("editForm");
            const tempNode = { frontMatterOriginal: {}, rawBody: "" };
            const formValues = getFormValues(form);
            const derived = deriveTypeAndIndex(formValues);
            const qual = deriveQualification(formValues, derived);
            const result = buildContentFromForm ? buildContentFromForm(form, tempNode, { type: derived.type }) : null;
            if (!result) return;
            const { content, dataObj } = result;

            const title = dataObj.title || "Untitled";
            const newNode = {
              title,
              rawName: title,
              path: "__new__/" + Date.now(),
              qualification: qual,
              isIndex: derived.isIndex,
              derivedType: derived.type,
              frontMatterOriginal: derived.type ? { type: derived.type } : {},
              edit: { edited: content },
              children: []
            };

            let targetParent = node.newParent || node;
            let insertIndex = null;
            if (targetParent !== node && targetParent === node.parent) {
              const idx = targetParent.children?.indexOf(node) ?? -1;
              if (idx >= 0) insertIndex = idx + 1;
            }

            if (!targetParent.children) targetParent.children = [];
            if (insertIndex == null || insertIndex > targetParent.children.length) {
              targetParent.children.push(newNode);
            } else {
              targetParent.children.splice(insertIndex, 0, newNode);
            }
            newNode.parent = targetParent;

            selectedNodePath = newNode.path;
            selectedNodePathRef.value = newNode.path;

            editDirty = false;
            if (editButtons?.setDirty) editButtons.setDirty(false);
            newMode = false;
            hideEditor();
            renderTree();
            if (editButtons) editButtons.update(selectedNodePath);
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
          if (node.edit?.deleted) {
            node.edit.staged = null;
            node.edit.deleted = null;
            cleanupEdit(node);
          } else {
            node.edit.staged = null;
            cleanupEdit(node);
          }
        } else if (node.edit?.edited && !node.edit?.staged && String(node.path || "").startsWith("__new__/")) {
          removeNodeByPath(treeData, node.path);
          if (selectedNodePath === node.path) selectedNodePath = null;
          selectedNodePathRef.value = selectedNodePath;
        } else if (node.edit?.moved) {
          treeMoveActions.dropMove(node, treeData);
        } else if (node.edit?.edited) {
          node.edit.edited = null;
          cleanupEdit(node);
        } else {
          if (!node.edit) node.edit = {};
          node.edit.deleted = true;
          node.edit.staged = true;
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
    const res = await fetch("/.netlify/functions/list_content_tree", {
      headers: getNetlifyAuthHeaders()
    });
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

function removeNodeByPath(nodes, path){
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.path === path) {
      nodes.splice(i, 1);
      return true;
    }
    if (n.children?.length) {
      const removed = removeNodeByPath(n.children, path);
      if (removed) return true;
    }
  }
  return false;
}

function wireEditDirtyTracking(){
  const editorContainer = document.getElementById("editorContainer");
  const form = document.getElementById("editForm");
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");
  if (!editorContainer || !form || !frontMatterText) return;

  const markDirty = () => {
    if (!editDirty) {
      editDirty = true;
      if (editButtons?.setDirty) editButtons.setDirty(true);
    }
  };

  editorContainer.oninput = markDirty;
  editorContainer.onchange = markDirty;
  frontMatterText.oninput = () => { markDirty(); autoSizeFrontMatter(); };
  frontMatterText.onchange = () => { markDirty(); autoSizeFrontMatter(); };
  if (bodyText) {
    bodyText.oninput = () => { markDirty(); autoSizeBody(); };
    bodyText.onchange = () => { markDirty(); autoSizeBody(); };
  }
}

function autoSizeFrontMatter(){
  const frontMatterText = document.getElementById("frontMatterText");
  if (!frontMatterText) return;
  frontMatterText.style.height = "auto";
  frontMatterText.style.height = frontMatterText.scrollHeight + "px";
}

function autoSizeBody(){
  const bodyText = document.getElementById("bodyText");
  if (!bodyText) return;
  bodyText.style.height = "auto";
  bodyText.style.height = bodyText.scrollHeight + "px";
}

function setBodyEditorVisible(visible){
  const bodyWrap = document.getElementById("bodyTextWrap");
  if (!bodyWrap) return;
  bodyWrap.style.display = visible ? "block" : "none";
  if (visible) {
    setupBodyImageTools();
    autoSizeBody();
  }
}

function scrollToBodyEditor(){
  const bodyWrap = document.getElementById("bodyTextWrap");
  if (!bodyWrap || bodyWrap.style.display === "none") return;
  requestAnimationFrame(() => {
    bodyWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function setupBodyImageTools(){
  if (bodyImageToolsBound) return;
  const imageSelect = document.getElementById("bodyImageSelect");
  const dropZone = document.getElementById("bodyImageDrop");
  const fileInput = document.getElementById("bodyImageFile");
  if (!imageSelect || !dropZone || !fileInput) return;

  const imagePreview = document.getElementById("bodyImagePreview");
  const copyFeedback = document.getElementById("bodyImageCopyFeedback");
  let feedbackTimer = null;

  imageSelect.addEventListener("change", () => {
    const imageName = String(imageSelect.value || "").trim();
    if (!imageName) {
      if (imagePreview) { imagePreview.src = ""; imagePreview.style.display = "none"; }
      if (copyFeedback) copyFeedback.style.display = "none";
      return;
    }
    // Show preview using the correct public URL
    if (imagePreview) {
      const folderUrl = imageSelect.dataset.folderUrl || "";
      imagePreview.src = folderUrl + imageName;
      imagePreview.style.display = "block";
      requestAnimationFrame(() => { imagePreview.scrollIntoView({ behavior: "smooth", block: "nearest" }); });
    }
    // Build markdown link, paste or copy depending on radio selection
    const mdLink = "![](" + imageName + ")";
    const actionRadio = document.querySelector('input[name="imageAction"]:checked');
    const action = actionRadio ? actionRadio.value : "paste";
    if (action === "paste") {
      const bodyText = document.getElementById("bodyText");
      if (bodyText) {
        const start = bodyText.selectionStart || 0;
        const end = bodyText.selectionEnd || 0;
        const before = bodyText.value.substring(0, start);
        const after = bodyText.value.substring(end);
        bodyText.value = before + mdLink + after;
        bodyText.selectionStart = bodyText.selectionEnd = start + mdLink.length;
        bodyText.focus();
        bodyText.dispatchEvent(new Event("input"));
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(mdLink).then(() => {
          if (copyFeedback) {
            copyFeedback.style.display = "inline";
            clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(() => { copyFeedback.style.display = "none"; }, 2500);
          }
        }).catch(() => {});
      }
    }
  });

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.style.borderColor = "#444";
    dropZone.style.background = "#f5f5f5";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#888";
    dropZone.style.background = "";
  });
  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.style.borderColor = "#888";
    dropZone.style.background = "";
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadImageToCurrentFolder(file);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) uploadImageToCurrentFolder(file);
  });

  bodyImageToolsBound = true;
}

async function loadBodyFolderImages(filePath){
  const imageSelect = document.getElementById("bodyImageSelect");
  if (!imageSelect) return;

  // Derive the public folder URL from the content-relative filePath
  // e.g. "01_whats_on/_index.md" -> "/01_whats_on/"
  let folderUrl = String(filePath || "");
  while (folderUrl.charAt(0) === "/") folderUrl = folderUrl.slice(1);
  if (folderUrl.endsWith("_index.md")) {
    folderUrl = folderUrl.slice(0, folderUrl.length - "_index.md".length);
  } else if (folderUrl.endsWith(".md")) {
    const slash = folderUrl.lastIndexOf("/");
    folderUrl = slash >= 0 ? folderUrl.slice(0, slash + 1) : "";
  } else if (folderUrl.length > 0 && folderUrl.charAt(folderUrl.length - 1) !== "/") {
    folderUrl = folderUrl + "/";
  }
  if (folderUrl && folderUrl.charAt(0) !== "/") folderUrl = "/" + folderUrl;
  imageSelect.dataset.folderUrl = folderUrl;

  const placeholder = '<option value="">Insert image from current folder...</option>';
  imageSelect.innerHTML = placeholder;

  try {
    const res = await fetch("/.netlify/functions/list_page_folder_images", {
      method: "POST",
      headers: getNetlifyAuthHeaders({ json: true }),
      body: JSON.stringify({ file: filePath })
    });
    if (!res.ok) {
      log("[folder-images] list failed status=" + res.status);
      return;
    }
    const payload = await res.json();
    const images = Array.isArray(payload?.images) ? payload.images : [];
    for (const img of images) {
      const name = String(img?.name || "").trim();
      if (!name) continue;
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      imageSelect.appendChild(opt);
    }
  } catch (err) {
    log("[folder-images] list exception: " + err);
  }
}

function insertImageIntoBody(imageName){
  const bodyText = document.getElementById("bodyText");
  if (!bodyText) return;
  const start = Number.isInteger(bodyText.selectionStart) ? bodyText.selectionStart : bodyText.value.length;
  const end = Number.isInteger(bodyText.selectionEnd) ? bodyText.selectionEnd : bodyText.value.length;
  const cleanName = String(imageName || "").trim();
  if (!cleanName) return;
  const snippet = "![](" + cleanName + ")";
  bodyText.setRangeText(snippet, start, end, "end");
  bodyText.focus();
  bodyText.dispatchEvent(new Event("input", { bubbles: true }));
}

async function uploadImageToCurrentFolder(file){
  const dropZone = document.getElementById("bodyImageDrop");
  const fileInput = document.getElementById("bodyImageFile");
  const nodePath = String(selectedNodePath || "");
  if (!nodePath) return;
  if (!dropZone) return;

  try {
    dropZone.textContent = "Uploading...";
    const dataUrl = await readFileAsDataUrl(file);
    const res = await fetch("/.netlify/functions/upload_page_folder_image", {
      method: "POST",
      headers: getNetlifyAuthHeaders({ json: true }),
      body: JSON.stringify({ file: nodePath, name: file.name, dataUrl, forceLocal: true })
    });
    const text = await res.text();
    if (!res.ok) {
      log("[folder-images] upload failed status=" + res.status + " body=" + text);
      return;
    }
    let payload = {};
    try { payload = JSON.parse(text); } catch (e) {}
    const imageName = String(payload?.name || payload?.filename || file.name || "").trim();
    await loadBodyFolderImages(nodePath);
    if (imageName) insertImageIntoBody(imageName);
  } catch (err) {
    log("[folder-images] upload exception: " + err);
  } finally {
    dropZone.textContent = "Drop image here or click to upload to this folder";
    if (fileInput) fileInput.value = "";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

async function loadEditorFromContent(node, content, rawFrontMatterOverride = null){
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");
  let rawFrontMatter = rawFrontMatterOverride;
  if (rawFrontMatter == null) {
    const match = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
    rawFrontMatter = match ? match[0] : "";
  }

  let innerFrontMatter = "";
  const matchInner = rawFrontMatter.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
  if (matchInner) innerFrontMatter = matchInner[1];

  const contentBody = rawFrontMatter ? content.slice(rawFrontMatter.length).replace(/^\\s*\\n/, "") : content;
  rawBody = contentBody;
  node.rawBody = contentBody;
  if (frontMatterText) frontMatterText.value = innerFrontMatter;
  if (bodyText) bodyText.value = contentBody;

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
  autoSizeFrontMatter();
  if (showBodyEditor) autoSizeBody();
}

async function ensureParentFrontMatter(node) {
  const parent = node?.parent;
  if (!parent || parent.frontMatterOriginal) return;
  const parentPath = String(parent.path || "");
  if (!parentPath.endsWith("_index.md")) return;

  try {
    const res = await fetch("/.netlify/functions/start_edit", {
      method: "POST",
      headers: getNetlifyAuthHeaders({ json: true }),
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

function getFormValues(form){
  const obj = {};
  const elements = Array.from(form.elements || []).filter(el => el && el.name);
  for (const el of elements) {
    if (el.type === "checkbox") {
      obj[el.name] = el.checked ? "true" : "false";
    } else {
      obj[el.name] = el.value;
    }
  }
  return obj;
}

function deriveTypeAndIndex(values){
  const pageType = String(values.page_type || "").toLowerCase();
  const contentType = String(values.content_type || "").toLowerCase();
  const givePrevNext = String(values.give_content_prev_next_buttons || "").toLowerCase() === "true";

  if (pageType === "navigation") {
    return { type: givePrevNext ? "see_also" : "document-folder", isIndex: true };
  }

  if (pageType === "content") {
    if (contentType === "page from section files") {
      return { type: "collated_page", isIndex: true };
    }
    if (contentType === "page from single file") {
      return { type: "document", isIndex: false };
    }
    if (contentType === "document") {
      return { type: "document", isIndex: false };
    }
    if (contentType === "form") {
      return { type: "form", isIndex: false };
    }
    if (contentType === "dynamic") {
      return { type: "dynamic", isIndex: false };
    }
  }

  return { type: "", isIndex: false };
}

function deriveQualification(values, derived){
  const pageType = String(values.page_type || "").toLowerCase();
  const contentType = String(values.content_type || "").toLowerCase();
  const derivedType = String(derived?.type || "").toLowerCase();
  if (pageType === "navigation") return "Navigation:";
  if (pageType === "content") {
    if (derivedType === "collated_page" || contentType.includes("section files")) return "Collated:";
    return "Content:";
  }
  return "Content:";
}

function cleanupEdit(node){
  if (!node?.edit) return;
  const e = node.edit;
  if (!e.moved && !e.edited && !e.staged) delete node.edit;
}

function normalizeRequestedNodePath(rawPath) {
  let p = String(rawPath || "").trim();
  if (!p) return "";
  while (p.charAt(0) === "/") p = p.slice(1);
  while (p.charAt(p.length - 1) === "/") p = p.slice(0, p.length - 1);
  p = p.split("\\\\").join("/");
  const lo = p.toLowerCase();
  if (lo.slice(-10) === "/_index.md") p = p.slice(0, -10);
  if (lo.slice(-9) === "/index.md") p = p.slice(0, -9);
  return p;
}

function openRequestedNodeFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const requestedRaw = params.get("node") || params.get("path") || "";
  const requested = normalizeRequestedNodePath(requestedRaw);
  if (!requested) return;

  let node = findNodeByPath(treeData, requested);
  if (!node && !requested.endsWith(".md")) {
    node = findNodeByPath(treeData, requested + ".md");
  }
  if (!node) {
    log("[open] requested node not found: " + requested);
    return;
  }

  selectNode(node.path);
  const shouldOpenEditor = String(params.get("open") || params.get("edit") || "").toLowerCase();
  if (shouldOpenEditor === "1" || shouldOpenEditor === "true" || shouldOpenEditor === "yes") {
    showEditorForSelectedNode();
  }
}

// =====================
// Initialize
// =====================
async function init(){
  log("Step 0: Initializing editor");
  await loadHelpers();
  await loadTree();
  openRequestedNodeFromQuery();
  log("Step 4: Initialization complete");
}

init();

</script>
`;
}
