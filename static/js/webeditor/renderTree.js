// static/js/webeditor/renderTree.js
import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";
window.log("renderTree FILE LOADED 2026-03-10.21.31");

let treeRoot = null;
let startEditCallbackRef = null;
let buttonsInitialised = false;

/* --------------------------------------------------
TREE RENDER
-------------------------------------------------- */

export function renderTree(
  nodes,
  startEditCallback,
  editButtonsContainerId = "editButtons",
  selectedNodePath = null,
  fullTreeRoot = null,
  depth = 0
) {

  if (!nodes) {
    window.log("[renderTree] ERROR: nodes missing");
    return document.createTextNode("Tree missing");
  }

  if (!treeRoot) treeRoot = fullTreeRoot || nodes;
  if (!startEditCallbackRef) startEditCallbackRef = startEditCallback;

  window.log(`[renderTree] Called depth=${depth} nodes=${nodes.length}`);

  const ul = document.createElement("ul");
  ul.style.listStyle = "none";
  ul.style.paddingLeft = "15px";

  nodes.forEach((node) => {

    const li = document.createElement("li");

    const span = document.createElement("span");

    const displayTitle =
      (node.qualification ? node.qualification + " " : "") +
      (node.title || node.rawName);

    span.textContent = displayTitle;
    span.style.cursor = "pointer";
    span.style.padding = "2px 4px";

    if (node.edit && node.edit.moved) {
      span.style.color = "orange";
      window.log(`[renderTree] Node ${node.path} moved → orange`);
    } else {
      span.style.color = "blue";
      window.log(`[renderTree] Node ${node.path} normal → blue`);
    }

    if (selectedNodePath === node.path) {
      span.style.fontWeight = "bold";
      span.style.backgroundColor = "#def";
      window.log(`[renderTree] Node ${node.path} selected`);
    }

    span.onclick = () => {

      window.selectedNodePath = node.path;

      window.log(`[renderTree] CLICK node=${node.path}`);

      updateEditButtons();

      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(node.path);
      }
    };

    li.appendChild(span);

    if (node.children && node.children.length) {

      const childTree = renderTree(
        node.children,
        startEditCallback,
        editButtonsContainerId,
        selectedNodePath,
        treeRoot,
        depth + 1
      );

      li.appendChild(childTree);
    }

    ul.appendChild(li);
  });

  if (depth === 0 && !buttonsInitialised) {

    window.log("[renderTree] TOP LEVEL COMPLETE → initialise buttons");

    setupEditButtons(editButtonsContainerId);

    buttonsInitialised = true;
  }

  return ul;
}


/* --------------------------------------------------
BUTTON SETUP
-------------------------------------------------- */

function setupEditButtons(containerId) {

  window.log(`[renderTree] setupEditButtons START id=${containerId}`);

  const container = document.getElementById(containerId);

  window.log(`[renderTree] container lookup = ${container ? "FOUND" : "NOT FOUND"}`);

  if (!container) return;

  container.style.display = "flex";           // ensure flex layout
  container.style.flexWrap = "wrap";          // wrap buttons if narrow screen
  container.style.justifyContent = "flex-start";
  container.style.alignItems = "center";
  container.style.gap = "4px";                // small spacing
  container.style.padding = "2px";            // optional padding
  container.style.minHeight = "40px";   // ensures container is visible
  container.style.width = "100%";       // prevents collapse on narrow screens
  const rect2 = container.getBoundingClientRect();
  window.log(`[renderTree] container rect after styles height=${rect2.height} width=${rect2.width}`);
  window.log(`[renderTree] container display=${container.style.display}`);

  window.log(`[renderTree] children BEFORE=${container.children.length}`);

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

  buttons.forEach((btn) => {

    window.log(`[renderTree] create button ${btn.id}`);

    const b = document.createElement("button");

    b.id = btn.id;
    b.textContent = btn.label;
    b.disabled = true;

    // BUTTON SIZE FIX FOR MOBILE
    b.style.flex = "1 0 auto";
    b.style.minWidth = "36px";    // enforce visible width
    b.style.height = "36px";      // enforce visible height
    b.style.fontSize = "16px";    // readable on small screens

    b.onclick = () => {

      window.log(`[renderTree] BUTTON CLICK ${btn.id}`);

      const node = findNodeByPath(treeRoot, window.selectedNodePath);

      if (!node) {
        window.log("[renderTree] ERROR selected node not found");
        return;
      }

      btn.action(node);

      updateEditButtons();

      if (typeof renderTree.reRender === "function") {
        renderTree.reRender(window.selectedNodePath);
      }
    };

    container.appendChild(b);

  });

  window.log(`[renderTree] children AFTER=${container.children.length}`);

  window.log(`[renderTree] container HTML snapshot:`);

  window.log(container.innerHTML);

  updateEditButtons();

  window.log("[renderTree] setupEditButtons COMPLETE");
}


/* --------------------------------------------------
BUTTON STATE
-------------------------------------------------- */

function updateEditButtons() {

  const selected = !!window.selectedNodePath;

  window.log(`[renderTree] update buttons selected=${selected}`);

  const ids = [
    "up","down","left","right","after",
    "copyUrl","edit","save","drop","publish"
  ];

  ids.forEach((id) => {

    const btn = document.getElementById(id);

    if (!btn) {
      window.log(`[renderTree] button missing id=${id}`);
      return;
    }

    btn.disabled = !selected;

    window.log(`[renderTree] button ${id} disabled=${btn.disabled}`);
  });
}


/* --------------------------------------------------
NODE SEARCH
-------------------------------------------------- */

function findNodeByPath(nodes, path) {

  for (const n of nodes) {

    if (n.path === path) return n;

    if (n.children) {

      const r = findNodeByPath(n.children, path);

      if (r) return r;
    }
  }

  return null;
}


/* --------------------------------------------------
STUB ACTIONS
-------------------------------------------------- */

function copyNodeUrl(node){
  window.log(`[stub] copy URL ${node.path}`);
}

function saveNode(node){
  window.log(`[stub] save ${node.path}`);
}

function publishNode(node){
  window.log(`[stub] publish ${node.path}`);
}
