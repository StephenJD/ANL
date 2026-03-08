// static/js/webeditor/parseMarkdown.js
import { normalizeFrontMatter } from "./normalizeFrontMatter.js";

export function parseMarkdown(md) {
  if (typeof md !== "string") throw new Error("Markdown input must be a string");

  const parts = md.split("---");
  const frontRaw = parts[1] || "";
  const rawBody = parts.slice(2).join("---");

  const rawFields = {};
  frontRaw.split("\n").forEach(line => {
    const i = line.indexOf(":");
    if (i > 0) {
      const key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      const hashIdx = value.indexOf("#");
      if (hashIdx >= 0) value = value.slice(0, hashIdx).trim();
      rawFields[key] = value;
    }
  });

  const frontMatter = normalizeFrontMatter(md);

  return { frontMatter, rawBody, rawFields };
}
