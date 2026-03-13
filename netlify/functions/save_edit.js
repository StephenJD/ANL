// netlify/functions/save_edit.js
import fs from "fs";
import path from "path";

const editsRoot = path.join(process.cwd(), "edits");

export async function handler(event) {
  try {
    const { file, content } = JSON.parse(event.body || "{}");
    if (!file) {
      return { statusCode: 400, body: "Missing file" };
    }

    const dst = path.join(editsRoot, file);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, content || "", "utf8");

    return {
      statusCode: 200,
      body: JSON.stringify({ saved: true }),
      headers: { "Content-Type": "application/json" }
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
