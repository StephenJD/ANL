// static/js/webeditor/editButtons.js
import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";
window.log("editButtons FILE LOADED 2026-03-10");

let treeRootRef = null;
let startEditCallbackRef = null;

// ----------------------------
// INIT BUTTONS
// ----------------------------
export function initEditButtons(containerId, treeRoot, startEditCallback) {
  treeRootRef = treeRoot;
  startEditCallbackRef = startEditCallback;

  function tryInit() {
    const container = document.getElementById(containerId);
    if (!container) {
      window.log(`[editButtons] container NOT FOUND, retrying...`);
      requestAnimationFrame(tryInit);
      return;
    }

    const rect = container.getBoundingClientRect();
    if (rect.height === 0) {
      window.log(`[editButtons] container height=0, waiting for layout...`);
      requestAnimationFrame(tryInit);
      return;
    }

    window.log(`[editButtons] container ready → creating buttons`);

    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "center";
    container.style.gap = "4px";
    container.style.padding = "2px";

    container.innerHTML = "";

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
      const b = document.createElement("button");
      b.id = btn.id;
      b.textContent = btn.label;
      b.disabled = true;
      b.style.flex = "1 0 auto";
      b.style.minWidth = "36px";
      b.style.height = "36px";
      b.style.fontSize = "16px";

      b.onclick = () => {
        const node = findNodeByPath(treeRootRef, window.selectedNodePath);
        if (!node) return;
        btn.action(node);
        updateEditButtons();
        if (typeof window.renderTree?.reRender === "function") {
          window.renderTree.reRender(window.selectedNodePath);
        }
      };

      container.appendChild(b);
    });

    updateEditButtons();
    window.log("[editButtons] initEditButtons COMPLETE");
  }

  tryInit();
}

// ----------------------------
// UPDATE BUTTON STATES
// ----------------------------
export function updateEditButtons() {
  const selected = !!window.selectedNodePath;

  const ids = ["up","down","left","right","after","copyUrl","edit","save","drop","publish"];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.disabled = !selected;
  });
}

// ----------------------------
// STUB ACTIONS
// ----------------------------
function copyNodeUrl(node){ window.log(`[stub] copy URL ${node.path}`); }
function saveNode(node){ window.log(`[stub] save ${node.path}`); }
function publishNode(node){ window.log(`[stub] publish ${node.path}`); }

// ----------------------------
// HELPER: FIND NODE
// ----------------------------
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
