// \netlify\functions\start_edit.js

const fs = require("fs");
const path = require("path");

const contentRoot = path.join(process.cwd(), "content");
const editsRoot = path.join(process.cwd(), "edits");

exports.handler = async function(event) {

    // =====================
    // Parse body safely
    // =====================
    let file;
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        file = body.file;
        console.log("Received file:", file);
    } catch(err) {
        console.error("start_edit: failed to parse body", err, event.body);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid request body" })
        };
    }

    if (!file) {
        console.error("start_edit: no file specified");
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No file specified" })
        };
    }

    // =====================
    // Build paths
    // =====================
    const src = path.join(contentRoot, file);
    const dst = path.join(editsRoot, file);
    console.log("Source path:", src);
    console.log("Destination path:", dst);

    // =====================
    // Copy file
    // =====================
    try {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        console.log("Ensured edits folder exists:", path.dirname(dst));

        if (!fs.existsSync(src)) {
            console.error("Source file does not exist:", src);
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Source file not found" })
            };
        }

        fs.copyFileSync(src, dst);
        console.log("Copied file to edits folder");

        const content = fs.readFileSync(dst, "utf8");
        console.log("Read file content, length:", content.length);

        return {
            statusCode: 200,
            body: JSON.stringify({ file, content })
        };

    } catch(err) {
        console.error("start_edit error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
