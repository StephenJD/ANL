// netlify/functions/list_content_tree.js
import path from "path";
import { walkDir } from "./webeditor/walkDir.js";
import { requireBindingAuth } from "./authHelper.js";

export async function handler(event, context) {
    const auth = await requireBindingAuth(event, "edit_website");
    if (auth.unauthorized) return auth.response;

    try {
        const rootDir = path.join(process.cwd(), "content");
        console.log("[list_content_tree] Listing content at:", rootDir);

        const rootNodes = await walkDir(rootDir);

        // Instead of stripping parent entirely, just replace circular reference with path
        function makeJsonSafe(node) {
            return {
                ...node,
                parent: node.parent ? { path: node.parent.path } : null,
                children: node.children.map(makeJsonSafe)
            };
        }

        const jsonSafeTree = rootNodes.map(makeJsonSafe);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonSafeTree)
        };
    } catch (err) {
        console.error("[list_content_tree] Fatal error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
}

