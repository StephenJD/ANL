// netlify/functions/start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");

export async function handler(event) {
    console.info("[start_edit] Received event");

    try {
        const body = JSON.parse(event.body);
        const file = body.file;
        if (!file) return { statusCode: 400, body: "No file provided" };

        // Strip leading "content/" if present
        const relativeFile = file.startsWith("content/") ? file.slice("content/".length) : file;
        const src = path.join(contentRoot, relativeFile);
        console.info("[start_edit] Reading file:", src);

        if (!fs.existsSync(src)) {
            return { statusCode: 404, body: "File not found" };
        }

        const content = fs.readFileSync(src, "utf8");
        const lines = content.split(/\r?\n/);

        let inFrontMatter = false;
        const rawFrontMatterLines = [];
        const frontMatterObject = {};

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed === "---") {
                if (!inFrontMatter) {
                    inFrontMatter = true;
                } else {
                    break; // end of front matter
                }
                continue;
            }

            if (inFrontMatter) {
                rawFrontMatterLines.push(line);

                // parse key: value or key = value
                const match = line.match(/^([\w_]+)\s*[:=]\s*(.+)$/);
                if (match) {
                    let [, key, value] = match;
                    key = key.trim();
                    value = value.trim();
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    frontMatterObject[key] = value;
                }
            }
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                rawFrontMatter: rawFrontMatterLines.join("\n"),
                frontMatter: frontMatterObject
            })
        };

    } catch (err) {
        console.error("[start_edit] Error:", err);
        return { statusCode: 500, body: "Server error" };
    }
      }
