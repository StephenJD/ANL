import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export default async function start_edit(event) {

  const { file } = JSON.parse(event.body);

  const src = path.join(contentRoot, file);
  const dst = path.join(editsRoot, file);

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);

  const content = fs.readFileSync(dst, "utf8");

  return JSON.stringify({
    file,
    content
  });
}
