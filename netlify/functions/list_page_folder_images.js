import fs from "fs";
import path from "path";
import { ALLOWED_EXTENSIONS, resolveFolderRel, isSafeRelative } from "./imageUtils.js";
import { requireBindingAuth } from "./authHelper.js";


export async function handler(event) {
  const auth = await requireBindingAuth(event, "content_editor");
  if (auth.unauthorized) return auth.response;

  try {
    const body = JSON.parse(event.body || "{}");
    const file = body.file || "";
    const folderRel = resolveFolderRel(file);

    if (!isSafeRelative(folderRel)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid file path" }) };
    }

    const contentRoot = path.join(process.cwd(), "content");
    const folderFs = path.join(contentRoot, folderRel);
    if (!fs.existsSync(folderFs) || !fs.statSync(folderFs).isDirectory()) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [] })
      };
    }

    const images = fs.readdirSync(folderFs, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map(name => ({ name }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to list folder images", details: String(err?.message || err) })
    };
  }
}

