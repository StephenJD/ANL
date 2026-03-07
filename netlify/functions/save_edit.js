import fs from "fs";
import path from "path";

const editsRoot = path.join(process.cwd(), "edits");

export default async function save_edit(event) {

  const { file, content } = JSON.parse(event.body);

  const dst = path.join(editsRoot, file);

  fs.mkdirSync(path.dirname(dst), { recursive: true });

  fs.writeFileSync(dst, content, "utf8");

  return JSON.stringify({ saved: true });
}
