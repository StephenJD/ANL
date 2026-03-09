export function moveNode(nodeObj, direction, treeData) {
  // adjust nodeObj position in treeData based on direction
  // return true if moved, false otherwise
}

export function addMoveButtons(nodeEl, nodeObj, treeData, renderTreeFn, clickHandler) {
  const btnContainer = document.createElement('span');
  btnContainer.style.marginLeft = '10px';

  const buttons = [
    { dir: 'up', label: '↑' },
    { dir: 'down', label: '↓' },
    { dir: 'left', label: '←' },
    { dir: 'right', label: '→' },
  ];

  buttons.forEach(({dir,label})=>{
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.marginLeft = '2px';
    btn.onclick = () => {
      if(moveNode(nodeObj, dir, treeData)){
        // re-render tree in place
        const container = nodeEl.closest('#tree');
        if(container) {
          container.innerHTML = '';
          container.appendChild(renderTreeFn(treeData, clickHandler, addMoveButtons));
        }
      }
    };
    btnContainer.appendChild(btn);
  });

  nodeEl.appendChild(btnContainer);
}
