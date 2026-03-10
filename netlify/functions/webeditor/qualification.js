// netlify/functions/webeditor/qualification.js
export function qualification (type, parentType = null) {
  if (!type) return "Unknown";

  // If parent is collated_page, children are Sections
  if (parentType === "collated_page" && type !== "home" && type !== "collated_page") {
    return `Section:`;
  }

  switch(type){
    case "dynamic":
    case "login":
    case "form":
    case "document":
      return `Content:`;
    case "home":
    case "collated_page":
      return `Collated:`;
    case "see_also":
      return `Navigation:`;
    default:
      return 'unknown:';
  }
}
