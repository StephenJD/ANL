// netlify/functions/webeditor/start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join("/tmp/edits");

export async function handler(event) {
    console.info("[start_edit] Received event");

    try {
        // Read and parse the JSON body
        let body;
        try {
            body = JSON.parse(event.body);
        } catch (e) {
            console.error("[start_edit] JSON parse error:", e);
            return { statusCode: 400, body: "Invalid JSON" };
        }
        console.info("[start_edit] Parsed body:", body);

        const file = body.file;
        if (!file) {
            console.error("[start_edit] No file provided");
            return { statusCode: 400, body: "No file provided" };
        }
        console.info("[start_edit] Received file:", file);

        // Determine source path
        const src = path.isAbsolute(file) ? file : path.join(contentRoot, file);
        if (!fs.existsSync(src)) {
            console.error("[start_edit] Source file does not exist:", src);
            return { statusCode: 404, body: "File not found" };
        }

        // Destination path in /tmp/edits mirrors relative content tree
        const dst = path.join(editsRoot, path.relative(contentRoot, src));
        console.info("[start_edit] Source path:", src);
        console.info("[start_edit] Destination path:", dst);

        // Ensure destination folder exists
        fs.mkdirSync(path.dirname(dst), { recursive: true });

        // Copy file to /tmp/edits
        fs.copyFileSync(src, dst);

        // Read file content for editor
        const content = fs.readFileSync(dst, "utf8");

        return {
            statusCode: 200,
            body: JSON.stringify({ file: path.relative(contentRoot, src), content })
        };

    } catch (err) {
        console.error("[start_edit] start_edit error:", err);
        return { statusCode: 500, body: "Server error" };
    }
}
