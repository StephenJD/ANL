// \netlify\functions\start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export default async function handler(event) {
  try {
    const { file } = JSON.parse(event.body);

    const src = path.join(contentRoot, file);
    const dst = path.join(editsRoot, file);

    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);

    const content = fs.readFileSync(dst, "utf8");

    return new Response(
      JSON.stringify({ file, content }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
