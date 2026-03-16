


// static\js\webeditor\contentEditorMain.js
// Main entry for the Content Editor UI (migrated from original generator)


// Import global log definition
import "./log.js";

import { getNetlifyAuthHeaders } from "/js/netlifyAuthFetch.js";
import { setupEditActions } from "/js/webeditor/contentEditorActions.js";

const showLog = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.search.includes("debug=1"));
const logDiv = document.getElementById("logDiv");
if (logDiv && !showLog) {
  logDiv.style.display = "none";
}

if (!window.findNodeByPath) {
  try {
    const actions = setupEditActions();
    window.findNodeByPath = actions && actions.findNodeByPath ? actions.findNodeByPath : undefined;
  } catch (e) {
    window.log && window.log("Failed to patch findNodeByPath: " + e);
  }
}

log("Step 0: Content editor script started");

// =====================
// Controller State
// =====================

let selectedNodePathRef = { value: null };

let selectedNodePath = null;

let renderFormFn = null;
let saveEdit = ()=>log("saveEdit not loaded yet");
let publishEdits = ()=>log("publishEdits not loaded yet");
let publishLocal = ()=>log("publishLocal not loaded yet");
let publishWeb = ()=>log("publishWeb not loaded yet");
let cancelEdit = ()=>log("cancelEdit not loaded yet");
let dropEdits = ()=>log("dropEdits not loaded yet");
let buildContentFromForm = null;
let editDirty = false;
let editButtons = null;
let showBodyEditor = false;
let newMode = false;
// =====================
// Initialize
// =====================
async function init(){
  log("Step 1: Initializing editor");
  await loadHelpers();
  log("Step 2: Helper loading complete");
  const requestedRaw = getFileNameFromQuery(); // step 3
  const result = await fetchFile(requestedRaw); // step 4
  if (result && result.data) {
    const { data, filePath } = result;
    selectedNodePath = filePath;
    selectedNodePathRef.value = filePath;
    const node = { path: filePath };
    await loadEditorFromContent(node, data.content, data.rawFrontMatter); // step 5
    const editorContainer = document.getElementById("editorContainer");
    editorContainer.style.display = "block";
    // Scroll editor container to top and fit content
    editorContainer.scrollTop = 0;
    editorContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    if (editButtons?.setEditing) editButtons.setEditing(true);
    // Set parent label on load
    const editorHeader = document.getElementById("editorHeader");
    let parentLabel = "(root)";
    let debugInfo = "";
    if (data.parent) {
      // Prefer title, fallback to fileName, fallback to first available field
      if (typeof data.parent.title === "string" && data.parent.title.trim()) {
        parentLabel = data.parent.title;
      } else if (typeof data.parent.fileName === "string" && data.parent.fileName.trim()) {
        parentLabel = data.parent.fileName;
      } else {
        // Try to use any available field
        const keys = Object.keys(data.parent).filter(k => typeof data.parent[k] === "string" && data.parent[k].trim());
        if (keys.length) parentLabel = data.parent[keys[0]];
      }
      debugInfo = " [" + Object.entries(data.parent).map(([k,v]) => `${k}='${v}'`).join(", ") + "]";
    }
    if (editorHeader) {
      editorHeader.textContent = `Parent: ${parentLabel}${debugInfo}`;
    }
    await loadBodyFolderImages(filePath);
    autoSizeBody();
    scrollToBodyEditor();
    log("Step 5: fetchFile: loaded and UI shown");
  }
  log("Step 6: Initialization complete");
}

function getFileNameFromQuery() {
  log("Step 3: Get query " + window.location.search);
  const params = new URLSearchParams(window.location.search);
  const requestedRaw = params.get("node") || params.get("path") || "";
  return requestedRaw;
}

async function fetchFile(filePath) {
  log("Step 4:fetchFile: called with filePath=" + filePath);
  try {
    const res = await fetch("/.netlify/functions/start_edit", {
      method: "POST",
      headers: getNetlifyAuthHeaders({ json: true }),
      body: JSON.stringify({ file: filePath })
    });
    if (!res.ok) {
      log("[fetchFile] load failed status=" + res.status);
      return null;
    }
    log("Step 4: got file: " + filePath);
    const data = await res.json();
    return { data, filePath };
  } catch (err) {
    log("[fetchFile] exception: " + err);
    return null;
  }
}

function showBlankEditorForSelectedNode() {
  showBodyEditor = true;
  newMode = false;
  if (!selectedNodePath) return;
  const editorContainer = document.getElementById("editorContainer");
  const editForm = document.getElementById("editForm");
  const editorHeader = document.getElementById("editorHeader");
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");
  // Find node and load its content
  const node = window.findNodeByPath ? window.findNodeByPath(treeData, selectedNodePath) : null;
  if (editorContainer && editForm && frontMatterText) {
    document.getElementById("tree").style.display = "none";
    editorContainer.style.display = "block";
    // Scroll editor container to top and fit content
    editorContainer.scrollTop = 0;
    editorContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    if (editButtons?.setEditing) editButtons.setEditing(true);
    // Derive parent folder from file path
    let parentLabel = "(root)";
    let debugInfo = "";
    if (node && node.parent) {
      if (typeof node.parent.title === "string" && node.parent.title.trim()) {
        parentLabel = node.parent.title;
      } else if (typeof node.parent.fileName === "string" && node.parent.fileName.trim()) {
        parentLabel = node.parent.fileName;
      } else {
        const keys = Object.keys(node.parent).filter(k => typeof node.parent[k] === "string" && node.parent[k].trim());
        if (keys.length) parentLabel = node.parent[keys[0]];
      }
      debugInfo = " [" + Object.entries(node.parent).map(([k,v]) => `${k}='${v}'`).join(", ") + "]";
    }
    if (editorHeader) {
      editorHeader.textContent = `Parent: ${parentLabel}${debugInfo}`;
    }
    // Load current front matter and body
    if (node && node.frontMatterOriginal) {
      let front = "---\n";
      for (const [k, v] of Object.entries(node.frontMatterOriginal)) {
        if (v !== "" && v != null && String(v).toLowerCase() !== "false") {
          front += `${k}: ${v}\n`;
        }
      }
      front += "---\n";
      frontMatterText.value = front;
    }
    if (bodyText && node) {
      bodyText.value = node.rawBody || "";
    }
    setBodyEditorVisible(showBodyEditor);
    if (renderFormFn && node && node.frontMatterOriginal) renderFormFn(node.frontMatterOriginal, node);
    autoSizeBody();
    scrollToBodyEditor();
    wireEditDirtyTracking();
  }
}

// =====================
// Publish
// =====================
// function serializeTreeForPublish(nodes) {
//   return (nodes || []).map(n => ({
//     path: n.path,
//     title: n.title || "",
//     rawName: n.rawName || "",
//     qualification: n.qualification || "",
//     isIndex: !!n.isIndex,
//     edit: n.edit ? {
//       staged: !!n.edit.staged,
//       local: !!n.edit.local,
//       deleted: !!n.edit.deleted,
//       moved: !!n.edit.moved,
//       edited: n.edit.edited || null
//     } : null,
//     children: serializeTreeForPublish(n.children || [])
//   }));
// }

// function markLocalPublished(nodes) {
//   for (const n of nodes || []) {
//     if (n.edit?.staged) {
//       n.edit.local = true;
//       if (n.edit.deleted) n.edit.deleted = true;
//       n.edit.edited = null;
//       n.edit.staged = null;
//       if (!n.edit.moved && !n.edit.edited && !n.edit.local) delete n.edit;
//     }
//     if (n.children?.length) markLocalPublished(n.children);
//   }
// }

// function clearPublishedEdits(nodes) {
//   for (const n of nodes || []) {
//     if (n.edit?.staged || n.edit?.local) {
//       n.edit.staged = null;
//       n.edit.local = null;
//       n.edit.deleted = null;
//       n.edit.edited = null;
//       if (!n.edit.moved && !n.edit.edited) delete n.edit;
//     }
//     if (n.children?.length) clearPublishedEdits(n.children);
//   }
// }

// async function publishEditsInternal(mode, localRootOverride = "") {
//   try {
//     const payload = { tree: serializeTreeForPublish(treeData), mode, localRoot: localRootOverride || "" };
//     const res = await fetch("/.netlify/functions/publish_edits", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload)
//     });
//     const text = await res.text();
//     if (!res.ok) {
//       try {
//         const obj = JSON.parse(text);
//         if (obj?.needLocalRoot) return { needLocalRoot: true };
//       } catch (e) {
//         // ignore
//       }
//       if (text.includes("Missing GITHUB_TOKEN")) {
//         log("[publish] Missing GITHUB_TOKEN. Create one at github.com/settings/personal-access-tokens and set GITHUB_TOKEN.");
//       }
//       log("[publish] error status=" + res.status + " body=" + text);
//       return null;
//     }
//     let obj = null;
//     try { obj = JSON.parse(text); } catch (e) { /* ignore */ }
//     log("[publish] ok " + text);
//     if (obj?.rebuild) {
//       if (obj.rebuild.ok) {
//         log("[publish] rebuild ok" + (obj.rebuild.skipped ? " (skipped)" : ""));
//       } else {
//         log("[publish] rebuild failed: " + (obj.rebuild.detail || "unknown error"));
//       }
//     }
//     if (mode === "local") {
//       markLocalPublished(treeData);
//     } else {
//       clearPublishedEdits(treeData);
//     }
//     renderTree();
//     if (editButtons) editButtons.update(selectedNodePath);
//     return { ok: true };
//   } catch (err) {
//     log("[publish] exception: " + err);
//     return null;
//   }
// }

// function pickLocalRootAndPublish() {
//   const input = document.createElement("input");
//   input.type = "file";
//   input.multiple = true;
//   input.webkitdirectory = true;
//   input.onchange = async () => {
//     const file = input.files && input.files[0];
//     if (!file) return;
//     let rootPath = "";
//     const rel = file.webkitRelativePath || "";
//     if (file.path) {
//       const normalized = String(file.path).replace(/\\\\/g, "/");
//       if (rel) {
//         const relParts = rel.split("/");
//         relParts.pop();
//         const relSuffix = relParts.join("/");
//         if (relSuffix && normalized.endsWith(relSuffix)) {
//           rootPath = normalized.slice(0, -relSuffix.length);
//           rootPath = rootPath.replace(/\\/$/, "");
//         }
//       }
//       if (!rootPath) {
//         rootPath = normalized.replace(/\\/[^\\/]+$/, "");
//       }
//     }
//     if (!rootPath) {
//       log("[publish] local path unavailable; set LOCAL_GIT_ROOT env");
//       return;
//     }
//     await publishEditsInternal("local", rootPath);
//   };
//   input.click();
// }

// publishLocal = async function publishLocal() {
//   const result = await publishEditsInternal("local", "");
//   if (result?.needLocalRoot) {
//     pickLocalRootAndPublish();
//   }
// };

// publishWeb = async function publishWeb() {
//   await publishEditsInternal("web", "");
// };

// =====================
// Load helper modules
// =====================
async function loadHelpers(){
  log("Step 2: Loading helpers...");
  try {
    const mod = await import('/js/webeditor/renderForm.js');
    renderFormFn = mod.renderForm;
    log("renderForm loaded");
  } catch (e) {
    log("renderForm load failed: " + e);
  }
  try {
    const mod = await import('/js/webeditor/contentEditorActions.js');
    const actions = mod.setupEditActions(selectedNodePathRef);
    saveEdit = actions.saveEditFrontmatter;
    buildContentFromForm = actions.buildContentFromForm;
    dropEdits = actions.dropNode;
    cancelEdit = actions.cancelEdit;
    log("contentEditorActions loaded");
  } catch (e) {
    log("contentEditorActions load failed: " + e);
  }
  try {
    const mod = await import('/js/webeditor/editContentButtons.js');
    // New API: expects containerId and editActions object
    const editActions = {
      save: () => handleMove("save"),
      drop: () => handleMove("drop"),
      editPage: () => showBlankEditorForSelectedNode({ openBody: true }),
      publishLocal: () => publishLocal && publishLocal(),
      publishWeb: () => publishWeb && publishWeb()
    };
    editButtons = mod.setupEditButtons("editButtonsContainer", editActions);
    log("editContentButtons loaded and initialized");
  } catch (e) {
    log("editContentButtons load failed: " + e);
  }
  log("Step 2: Helper loading complete");
}

// =====================
// Save / Drop handler
// =====================
async function handleMove(action) {
    if (!selectedNodePath) return;

    const node = findNodeByPath(treeData, selectedNodePath);
    if (!node) return;
    const editorContainer = document.getElementById("editorContainer");
    const isEditing = editorContainer && editorContainer.style.display === "block";

    if (action === "save") {
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

    if (editButtons) editButtons.update(selectedNodePath);

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
  bodyText.style.height = Math.max(bodyText.scrollHeight, 200) + "px";
  // Resize body editor container to fit textarea
  const bodyWrap = document.getElementById("bodyTextWrap");
  if (bodyWrap) {
    bodyWrap.style.height = Math.max(bodyText.scrollHeight + 20, 220) + "px";
    bodyWrap.style.minHeight = "220px";
    bodyWrap.style.maxHeight = "80vh";
    bodyWrap.style.overflowY = "auto";
    // Scroll bodyWrap to top if content changes
    bodyWrap.scrollTop = 0;
  }
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
      headers: {
        ...getNetlifyAuthHeaders({ json: true }),
        "Content-Type": "application/json"
      },
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
      headers: { "Content-Type": "application/json" },
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
  log("Step 5: loadEditorFromContent");
  const frontMatterText = document.getElementById("frontMatterText");
  const bodyText = document.getElementById("bodyText");
  let rawBody;
  let rawFrontMatter = rawFrontMatterOverride;
  if (rawFrontMatter == null) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    rawFrontMatter = match ? match[0] : "";
  }

  let innerFrontMatter = "";
  const matchInner = rawFrontMatter.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (matchInner) innerFrontMatter = matchInner[1];

  const contentBody = rawFrontMatter ? content.slice(rawFrontMatter.length).replace(/^\s*\n/, "") : content;
  rawBody = contentBody;
  node.rawBody = contentBody;
  if (frontMatterText) frontMatterText.value = innerFrontMatter;
  if (bodyText) bodyText.value = contentBody;

  let frontMatterObj = {};
  try {
    const { normalizeFrontMatter } = await import("/js/webeditor/normalizeFrontMatter.js");
    frontMatterObj = normalizeFrontMatter("---\n" + innerFrontMatter + "\n---");
  } catch (err) {
    frontMatterObj = {};
  }

  if(renderFormFn) renderFormFn(node, frontMatterObj);
  node.frontMatterOriginal = { ...frontMatterObj };
  node.frontMatterOriginalText = innerFrontMatter;
  node.frontMatterOriginalOrder = innerFrontMatter
    .split(/\r?\n/)
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
      frontMatterObj = normalizeFrontMatter("---\n" + innerFrontMatter + "\n---");
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

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

