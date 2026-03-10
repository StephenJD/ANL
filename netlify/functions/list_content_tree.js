// netlify/functions/list_content_tree.js
import path from "path";
import { walkDir } from "./webeditor/walkDir.js";

export async function handler(event, context) {
    try {
        const rootDir = path.join(process.cwd(), "content"); // absolute path  console.log("[list_content_tree] Listing content at:", rootDir);

        const rootNodes = await walkDir(rootDir);

        // Strip parent references before JSON output
        function stripParent(node) {
            const { parent, ...rest } = node;
            return {
                ...rest,
                children: node.children.map(stripParent)
            };
        }

        const jsonSafeTree = rootNodes.map(stripParent);

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
