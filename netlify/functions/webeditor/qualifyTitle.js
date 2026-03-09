// netlify/functions/webeditor/qualifyTitle.js
export function qualifyTitle(node, parentType = null) {
  if (!node || !node.type) return node.name || "Untitled";

  // If parent is collated_page, children are Sections
  if (parentType === "collated_page" && node.type !== "home" && node.type !== "collated_page") {
    return `Section: ${node.title || node.name}`;
  }

  switch(node.type){
    case "dynamic":
    case "document":
      return `Content: ${node.title || node.name}`;
    case "home":
    case "collated_page":
      return `Collated: ${node.title || node.name}`;
    case "see_also":
      return `Navigation: ${node.title || node.name}`;
    default:
      return node.title || node.name;
  }
}
