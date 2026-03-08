// netlify/functions/webeditor/publish_edits.js 
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const editsRoot = path.join(process.cwd(), "edits");

export default async function publish_edits() {

  const files = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const e of entries) {
      const full = path.join(dir, e.name);

      if (e.isDirectory()) {
        walk(full);
      } else if (e.name.endsWith(".md")) {
        files.push(full);
      }
    }
  }

  walk(editsRoot);

  for (const file of files) {

    const rel = file.replace(editsRoot + path.sep, "");
    const content = fs.readFileSync(file, "utf8");

    const encoded = Buffer.from(content).toString("base64");

    await fetch(
      `https://api.github.com/repos/StephenJD/ANL/contents/content/${rel}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Publish edit ${rel}`,
          content: encoded
        })
      }
    );
  }

  return JSON.stringify({ published: files.length });
}
