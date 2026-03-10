// static/js/webeditor/editButtons.js
import { moveNode, dropMove, moveAfterNextSelected } from "./treeMoveActions.js";
window.log("editButtons FILE LOADED 2026-03-10");

let treeRootRef = null;
let startEditCallbackRef = null;

function waitForVisibleContainer(containerId, callback) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const check = () => {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      callback(container);
    } else {
      requestAnimationFrame(check);
    }
  };
  check();
}

export function initEditButtons(containerId, treeRoot, startEditCallback) {
  treeRootRef = treeRoot;
  startEditCallbackRef = startEditCallback;

  waitForVisibleContainer(containerId, (container) => {
    window.log(`[editButtons] container ready for buttons`);

    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.justifyContent = "flex-start";
    container.style.alignItems = "center";
    container.style.gap = "4px";
    container.style.padding = "2px";
    container.style.minHeight = "40px";
    container.style.width = "100%";

    window.log(`[editButtons] container rect after styles height=${container.getBoundingClientRect().height} width=${container.getBoundingClientRect().width}`);
    window.log(`[editButtons] children BEFORE=${container.children.length}`);

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

      container.appendChild(b);
    });

    window.log(`[editButtons] children AFTER wrapper=${container.children.length}`);
    updateEditButtons();
    window.log("[editButtons] initEditButtons COMPLETE");
  });
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
