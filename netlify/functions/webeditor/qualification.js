// netlify/functions/webeditor/qualification.js
export function qualification (type, parentType = null) {
  if (!type) return "Unknown";

  switch(type){
    case "dynamic":
    case "login":
    case "form":
    case "document":
      if (parentType === "collated_page" || parentType === "home" ) {
          return `Section:`;
      }
      return `Content:`;
    case "home":
    case "collated_page":
      return `Collated:`
    case "document-folder":
    case "see_also":
      return `Navigation:`;
    default:
      return 'unknown:';
  }
}
