// \netlify\functions\start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export default async function start_edit(event) {

  // Log raw body immediately
  console.log("RAW event.body:", event.body);

  let body;
  try {
    body = JSON.parse(event.body);
    console.log("Parsed body:", body);
  } catch (err) {
    console.error("JSON parse error:", err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" })
    };
  }

  const { file } = body;
  console.log("Received file:", file);

  if (!file) {
    console.error("No file provided");
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No file provided" })
    };
  }

  try {
    // Resolve source and destination paths
    const src = path.join(contentRoot, file);
    const dst = path.join(editsRoot, file);

    console.log("Source path:", src);
    console.log("Destination path:", dst);

    // Ensure destination folder exists
    fs.mkdirSync(path.dirname(dst), { recursive: true });

    // Copy file to edits folder
    fs.copyFileSync(src, dst);

    // Read content for editor
    const content = fs.readFileSync(dst, "utf8");

    // Return JSON with content
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
