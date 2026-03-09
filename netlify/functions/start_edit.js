// netlify/functions/start_edit.js
import fs from "fs";
import path from "path";

export async function handler(event) {
  try {
    const { file } = JSON.parse(event.body);

    // Base content directory
    const contentDir = path.join(process.cwd(), "content");

    // Full path
    let fullPath = path.join(contentDir, file);

    // If path is a folder, append _index.md
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      fullPath = path.join(fullPath, "_index.md");
    }

    // Read file
    if (!fs.existsSync(fullPath)) {
      return { statusCode: 404, body: "File not found" };
    }

    const rawContent = fs.readFileSync(fullPath, "utf-8");

    // Extract front matter (simple split for now)
    const frontMatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    const rawFrontMatter = frontMatterMatch ? frontMatterMatch[0] : "";

    return {
      statusCode: 200,
      body: JSON.stringify({ rawFrontMatter, content: rawContent }),
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
