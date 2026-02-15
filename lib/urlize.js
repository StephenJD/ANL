// /lib/urlize.js

export function urlize(str) {
  return str
    .trim()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function urlizePath(pathStr = "") {
  return pathStr
    .replace(/^\/|\/$/g, "")          // remove leading/trailing slash
    .replace(/\.[^/.]+$/, "")         // strip extension (.md, .html, etc)
    .split(/[\\/]/)                   // handle / and \
    .map(segment => urlize(segment))
    .join("/");
}


