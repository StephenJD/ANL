// netlify\functions\upload_page_folder_image.js
import fs from "fs";
import path from "path";
import {
  ALLOWED_EXTENSIONS, ALLOWED_MIME,
  toPosix, resolveFolderRel, isSafeRelative,
  parseDataUrl, resolveFilename,
  resolveSiteRoot, mirrorPageFolderImageToPublic
} from "./imageUtils.js";
import { requireBindingAuth } from "./authHelper.js";

export async function handler(event) {
  const auth = await requireBindingAuth(event, "content_editor");
  if (auth.unauthorized) return auth.response;

  try {
    const body = JSON.parse(event.body || "{}");
    const file = body.file || "";
    const dataUrl = body.dataUrl || "";
    const name = body.name || body.filename || "";

    const folderRel = resolveFolderRel(file);
    if (!isSafeRelative(folderRel)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid file path" }) };
    }

    const parsed = parseDataUrl(dataUrl);
    if (!parsed?.base64 || !parsed?.contentType) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid dataUrl" }) };
    }
    if (!ALLOWED_MIME.has(parsed.contentType)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unsupported image type" }) };
    }

    const filename = resolveFilename(name, parsed.contentType);
    if (!ALLOWED_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid file extension" }) };
    }

    const siteRoot = resolveSiteRoot();
    const folderFs = path.join(siteRoot, "content", folderRel);
    fs.mkdirSync(folderFs, { recursive: true });

    const outPath = path.join(folderFs, filename);
    fs.writeFileSync(outPath, Buffer.from(parsed.base64, "base64"));
    mirrorPageFolderImageToPublic(siteRoot, folderRel, filename);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        name: filename,
        relPath: toPosix(path.posix.join(folderRel, filename))
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to upload folder image", details: String(err?.message || err) })
    };
  }
}

