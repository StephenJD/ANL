// static/js/webeditor/editButtons.js
import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";
window.log("editButtons FILE LOADED 2026-03-10");

let treeRootRef = null;
let startEditCallbackRef = null;

export function initEditButtons(containerId, treeRoot, startEditCallback) {

  treeRootRef = treeRoot;
  startEditCallbackRef = startEditCallback;

  const container = document.getElementById(containerId);
  window.log(`[editButtons] container lookup = ${container ? "FOUND" : "NOT FOUND"}`);
  if (!container) return;

  // force container visible
  container.style.display = "block";
  container.style.width = "100%";
  container.style.minHeight = "40px";
  container.style.padding = "2px";
  container.innerHTML = "";

  // create wrapper for buttons
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexWrap = "wrap";
  wrapper.style.justifyContent = "flex-start";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "4px";
  wrapper.style.width = "100%";
  wrapper.style.minHeight = "40px";
  wrapper.style.backgroundColor = "rgba(255,0,0,0.1)"; // temporary visible debugging aid

  container.appendChild(wrapper);

  const buttons = [
    { id:"up", label:"↑", action:(n)=>moveNode(n,"up",treeRootRef) },
    { id:"down", label:"↓", action:(n)=>moveNode(n,"down",treeRootRef) },
    { id:"left", label:"←", action:(n)=>moveNode(n,"left",treeRootRef) },
    { id:"right", label:"→", action:(n)=>moveNode(n,"right",treeRootRef) },
    { id:"after", label:"→|", action:(n)=>moveAfterNextSelected(n,treeRootRef,window.nextSelectedPath) },
    { id:"copyUrl", label:"🔗", action:(n)=>copyNodeUrl(n) },
    { id:"edit", label:"✎", action:(n)=>startEditCallbackRef(n.path) },
    { id:"save", label:"💾", action:(n)=>saveNode(n) },
    { id:"drop", label:"↺", action:(n)=>dropMove(n) },
    { id:"publish", label:"📤", action:(n)=>publishNode(n) }
  ];

  buttons.forEach(btn => {
    window.log(`[editButtons] create button ${btn.id}`);
    const b = document.createElement("button");
    b.id = btn.id;
    b.textContent = btn.label;
    b.disabled = true;
    b.style.flex = "1 0 auto";
    b.style.minWidth = "36px";
    b.style.height = "36px";
    b.style.fontSize = "16px";

    b.onclick = () => {
      window.log(`[editButtons] BUTTON CLICK ${btn.id}`);
      const node = findNodeByPath(treeRootRef, window.selectedNodePath);
      if (!node) {
        window.log("[editButtons] ERROR selected node not found");
        return;
      }
      btn.action(node);
      updateEditButtons();
      if (typeof window.renderTree?.reRender === "function") {
        window.renderTree.reRender(window.selectedNodePath);
      }
    };

    wrapper.appendChild(b);
  });

  window.log(`[editButtons] children AFTER wrapper=${wrapper.children.length}`);
  updateEditButtons();
  window.log("[editButtons] initEditButtons COMPLETE");
}

export function updateEditButtons() {
  const selected = !!window.selectedNodePath;
  window.log(`[editButtons] update buttons selected=${selected}`);

  const ids = ["up","down","left","right","after","copyUrl","edit","save","drop","publish"];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) {
      window.log(`[editButtons] button missing id=${id}`);
      return;
    }
    btn.disabled = !selected;
    window.log(`[editButtons] button ${id} disabled=${btn.disabled}`);
  });
}

/* --------------------------------------------------
STUB ACTIONS
-------------------------------------------------- */
function copyNodeUrl(node){ window.log(`[stub] copy URL ${node.path}`); }
function saveNode(node){ window.log(`[stub] save ${node.path}`); }
function publishNode(node){ window.log(`[stub] publish ${node.path}`); }

/* --------------------------------------------------
HELPER NODE SEARCH
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
