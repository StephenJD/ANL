// \netlify\functions\start_edit.mjs

import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export default async function start_edit(event) {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { file } = body;

    const src = path.join(process.cwd(), "content", file);
    const dst = path.join(process.cwd(), "edits", file);

    console.log("start_edit paths:", { src, dst });

    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);

    const content = fs.readFileSync(dst, "utf8");

    return {
      statusCode: 200,
      body: JSON.stringify({ file, content })
    };
  } catch (err) {
    console.error("start_edit error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
