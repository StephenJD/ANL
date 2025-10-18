// /netlify/functions/generate_qr.js
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const configPath = path.join(process.cwd(), "config/_default/config.toml");
const toml = fs.readFileSync(configPath, "utf8");

const match = toml.match(/baseurl\s*=\s*["']([^"']+)["']/i);
if (!match) {
  console.error("Error: baseURL not found in", configPath);
  process.exit(1);
}
const baseURL = match[1].replace(/\/+$/, ""); // remove trailing slashes
console.log(`Using baseURL: ${baseURL}`);

const contentDir = "content";
const outputDir = "static/qr";
fs.mkdirSync(outputDir, { recursive: true });

function getMarkdownFiles(dir) {
  return fs.readdirSync(dir).flatMap(f => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory()
      ? getMarkdownFiles(full)
      : f.endsWith(".md") ? [full] : [];
  });
}

(async () => {
  for (const file of getMarkdownFiles(contentDir)) {
    const src = fs.readFileSync(file, "utf8");
    const { data } = matter(src);

    if (data.qrCode === true) {
      let rel = file
        .replace(/^content[\\/]/, "")
        .replace(/\.md$/, "")
        .replace(/index$/, "");
      rel = rel.replace(/\\/g, "/"); // normalize for URL
      const url = `${baseURL}/${rel}/`;

      const outFile = path.join(outputDir, rel.replace(/[\\/]/g, "_") + ".png");
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      await QRCode.toFile(outFile, url, { width: 64, margin: 1 });

      console.log(`Generated QR for: ${url}`);
    }
  }
})();
