// static/js/webeditor/renderTree.js

import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";

let treeRoot = null;
let startEditCallbackRef = null;
let buttonsInitialised = false;

/* ---------------------------
   Tree Rendering
----------------------------*/

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null,
  depth = 0
) {

  if (!nodes) return document.createTextNode("Tree data missing");

  if (!treeRoot) treeRoot = fullTreeRoot || nodes;
  if (!startEditCallbackRef) startEditCallbackRef = startEditCallback;

  window.log(`[renderTree] Called with nodes at depth ${depth}:`);

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node) => {

    const li = document.createElement("li");

    const titleSpan = document.createElement("span");
    const displayTitle = node.qualification + " " + (node.title || node.rawName);

    titleSpan.textContent = displayTitle;
    titleSpan.style.cursor = "pointer";
    titleSpan.style.padding = "2px 4px";

    /* -------- colour logic -------- */

    if (node.edit && node.edit.moved) {
      titleSpan.style.color = "orange";
      window.log(`[renderTree] Node ${node.path} moved → orange`);
    }
    else {
      titleSpan.style.color = "blue";
      window.log(`[renderTree] Node ${node.path} normal → blue`);
    }

    /* -------- selected node -------- */

    if (selectedNodePath === node.path) {
      titleSpan.style.fontWeight = "bold";
      titleSpan.style.backgroundColor = "#def";
      window.log(`[renderTree] Node ${node.path} is selected`);
    }

    /* -------- click handler -------- */

    titleSpan.onclick = (e) => {

      e.preventDefault();

      window.selectedNodePath = node.path;

      window.log(`[renderTree] Node clicked: ${node.path}`);

      updateEditButtons();

      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(node.path);
      }
    };

    li.appendChild(titleSpan);

    /* -------- children -------- */

    if (node.children && node.children.length) {

      const children = renderTree(
        node.children,
        startEditCallback,
        editButtonsContainerId,
        selectedNodePath,
        treeRoot,
        depth + 1
      );

      li.appendChild(children);
    }

    ul.appendChild(li);

  });

  /* initialise buttons once after top-level render */

  if (depth === 0 && !buttonsInitialised) {
    setupEditButtons(editButtonsContainerId);
    buttonsInitialised = true;
  }

  return ul;
}


/* ---------------------------
   Button Creation
----------------------------*/

function setupEditButtons(containerId) {

  const container = document.getElementById(containerId);

  if (!container) {
    window.log(`[renderTree] WARNING: button container not found: ${containerId}`);
    return;
  }

  window.log("[renderTree] Creating editor buttons");

  container.innerHTML = "";

  const buttons = [

    { id:"up", label:"↑", action:(n)=>moveNode(n,"up",treeRoot) },
    { id:"down", label:"↓", action:(n)=>moveNode(n,"down",treeRoot) },
    { id:"left", label:"←", action:(n)=>moveNode(n,"left",treeRoot) },
    { id:"right", label:"→", action:(n)=>moveNode(n,"right",treeRoot) },
    { id:"after", label:"→|", action:(n)=>moveAfterNextSelected(n,treeRoot,window.nextSelectedPath) },

    { id:"copyUrl", label:"🔗", action:(n)=>copyNodeUrl(n) },
    { id:"edit", label:"✎", action:(n)=>startEditCallbackRef(n.path) },
    { id:"save", label:"💾", action:(n)=>saveNode(n) },
    { id:"drop", label:"↺", action:(n)=>dropMove(n) },
    { id:"publish", label:"📤", action:(n)=>publishNode(n) }

  ];

  buttons.forEach(btn => {

    const b = document.createElement("button");

    b.id = btn.id;
    b.textContent = btn.label;
    b.disabled = true;

    b.onclick = (e) => {

      e.stopPropagation();

      const node = findNodeByPath(treeRoot, window.selectedNodePath);

      if (!node) return;

      window.log(`[renderTree] Button ${btn.id} clicked for ${node.path}`);

      btn.action(node);

      updateEditButtons();

      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(window.selectedNodePath);
      }

    };

    container.appendChild(b);

  });

  updateEditButtons();
}


/* ---------------------------
   Enable / Disable Buttons
----------------------------*/

function updateEditButtons() {

  const selected = !!window.selectedNodePath;

  const ids = [
    "up","down","left","right","after",
    "copyUrl","edit","save","drop","publish"
  ];

  ids.forEach(id => {

    const btn = document.getElementById(id);

    if (!btn) return;

    btn.disabled = !selected;

    window.log(`[renderTree] Button ${id} disabled: ${btn.disabled}`);

  });

}


/* ---------------------------
   Node Lookup
----------------------------*/

function findNodeByPath(nodes,path){

  for(const n of nodes){

    if(n.path===path) return n;

    if(n.children){

      const r=findNodeByPath(n.children,path);

      if(r) return r;

    }

  }

  return null;

}


/* ---------------------------
   Stub Actions
----------------------------*/

function copyNodeUrl(node){
  window.log(`[stub] copy URL for ${node.path}`);
}

function saveNode(node){
  window.log(`[stub] save node ${node.path}`);
}

function publishNode(node){
  window.log(`[stub] publish node ${node.path}`);
     }
