// netlify/functions/list_content_tree.js
import path from "path";
import { walkDir } from "./walkDir.js";
import fs from "fs";

export async function handler(event, context) {
  try {
    const rootDir = path.join(process.cwd(), "content");
    console.log("[list_content_tree] Listing content at:", rootDir, "Exists:", fs.existsSync(rootDir));

    const tree = walkDir(rootDir);
    console.log("[list_content_tree] Tree generated with", tree.length, "top-level nodes");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tree)
    };

  } catch (err) {
    console.error("[list_content_tree] Fatal error:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to generate content tree" })
    };
  }
}
