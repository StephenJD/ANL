// \netlify\functions\start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join("/tmp", "edits"); // writable in Netlify

export default async function start_edit(event) {
  try {
    // Ensure event.body is a string
    const body = typeof event.body === "string" ? event.body : JSON.stringify(event.body);
    const { file } = JSON.parse(body);

    console.log("Received file:", file);

    if (!file) throw new Error("No file provided");

    const src = path.join(contentRoot, file);
    const dst = path.join(editsRoot, file);

    console.log("Source path:", src);
    console.log("Destination path:", dst);

    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);

    const content = fs.readFileSync(dst, "utf8");
    console.log("File loaded successfully");

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
