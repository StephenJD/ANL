// netlify/functions/webeditor/start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join("/tmp/edits");

export async function handler(event) {
    console.info("[start_edit] Received event");

    try {
        // Read the raw body
        let rawBody = event.body;
        console.info("[start_edit] RAW body string:", rawBody);

        // Parse JSON safely
        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("[start_edit] JSON parse error:", e);
            return { statusCode: 400, body: "Invalid JSON" };
        }
        console.info("[start_edit] Parsed body:", body);

        const file = body.file;
        console.info("[start_edit] Received file:", file);

        if (!file) {
            console.error("[start_edit] No file provided");
            return { statusCode: 400, body: "No file provided" };
        }

        // Strip leading "content/" if present
        let relativeFile = file.startsWith("content/") ? file.slice("content/".length) : file;

        const src = path.join(contentRoot, relativeFile);
        const dst = path.join(editsRoot, relativeFile);

        console.info("[start_edit] Source path:", src);
        console.info("[start_edit] Destination path:", dst);

        // Ensure destination folder exists
        fs.mkdirSync(path.dirname(dst), { recursive: true });

        // Copy the file to edits
        fs.copyFileSync(src, dst);

        const content = fs.readFileSync(dst, "utf8");

        return {
            statusCode: 200,
            body: JSON.stringify({ file: relativeFile, content })
        };

    } catch (err) {
        console.error("[start_edit] start_edit error:", err);
        return { statusCode: 500, body: "Server error" };
    }
}
