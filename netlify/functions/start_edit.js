// \netlify\functions\start_edit.mjs

import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export default async function start_edit(event) {

  // If event.body is string, parse; if object, use directly
  const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  const { file } = body;

  const src = path.join(contentRoot, file);
  const dst = path.join(editsRoot, file);

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);

  const content = fs.readFileSync(dst, "utf8");

  return {
    statusCode: 200,
    body: JSON.stringify({
      file,
      content
    })
  };
}
