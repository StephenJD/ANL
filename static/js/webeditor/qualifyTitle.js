// static/js/webeditor/qualifyTitle.js

export function qualifyTitle(node) {
  if (!node || !node.type) return node.name || "Untitled";
  switch(node.type){
    case "dynamic": return `Content: ${node.title || node.name}`;
    case "home": return `Collated: ${node.title || node.name}`;
    case "see_also": return `Navigation: ${node.title || node.name}`;
    default: return node.title || node.name;
  }
}
