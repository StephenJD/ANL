// \netlify\functions\start_edit.js
import fs from "fs";
import path from "path";

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

export async function handler(event) {
    console.log("[start_edit] Received event");

    // ==========================
    // Read event.body safely
    // ==========================
    let bodyStr = "";

    if (event.body instanceof ReadableStream) {
        bodyStr = await new Response(event.body).text();
    } else {
        bodyStr = event.body;
    }

    console.log("[start_edit] RAW body string:", bodyStr);

    let body;
    try {
        body = JSON.parse(bodyStr);
        console.log("[start_edit] Parsed body:", body);
    } catch (err) {
        console.error("[start_edit] JSON parse error:", err);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON body" })
        };
    }

    const { file } = body;
    console.log("[start_edit] Received file:", file);

    if (!file) {
        console.error("[start_edit] No file provided");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No file provided" })
        };
    }

    const src = path.join(contentRoot, file);
    const dst = path.join(editsRoot, file);

    console.log("[start_edit] Source path:", src);
    console.log("[start_edit] Destination path:", dst);

    try {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);

        const content = fs.readFileSync(dst, "utf8");

        console.log("[start_edit] File copied successfully");
        return {
            statusCode: 200,
            body: JSON.stringify({
                file,
                content
            })
        };
    } catch (err) {
        console.error("[start_edit] start_edit error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}
