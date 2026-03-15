// netlify/functions/list_shared_images.js
import fs from "fs";
import path from "path";
import { ALLOWED_EXTENSIONS, resolveSiteRoot, mirrorSharedImagesToPublic } from "./imageUtils.js";
import { requireBindingAuth } from "./authHelper.js";

export async function handler(event) {
  const auth = await requireBindingAuth(event, "edit_website");
  if (auth.unauthorized) return auth.response;

  try {
    const siteRoot = resolveSiteRoot();
    const sharedDir = path.join(siteRoot, "static", "images", "shared");
    if (!fs.existsSync(sharedDir)) {
      return {
        statusCode: 200,
        body: JSON.stringify([])
      };
    }

    const files = fs.readdirSync(sharedDir, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    mirrorSharedImagesToPublic(siteRoot, files);

    const urls = files.map(name => `/images/shared/${name}`);

    return {
      statusCode: 200,
      body: JSON.stringify(urls)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to list shared images", details: err.message })
    };
  }
}

