// \netlify\functions\start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
// Use /tmp for writable folder in Netlify functions
const editsRoot = path.join("/tmp", "edits");

export default async function start_edit(event) {
    try {
        const { file } = JSON.parse(event.body);

        console.log("Received file:", file);

        if (!file) throw new Error("No file provided");

        const src = path.join(contentRoot, file);
        const dst = path.join(editsRoot, file);

        console.log("Source path:", src);
        console.log("Destination path:", dst);

        // Ensure destination folder exists
        fs.mkdirSync(path.dirname(dst), { recursive: true });

        // Copy file for editing
        fs.copyFileSync(src, dst);

        const content = fs.readFileSync(dst, "utf8");

        console.log("File loaded successfully");

        // Netlify requires a Response or undefined
        return {
            statusCode: 200,
            body: JSON.stringify({
                file,
                content
            })
        };
    } catch (err) {
        console.error("start_edit error:", err);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
