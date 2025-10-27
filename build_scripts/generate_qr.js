// \build_scripts\generate_qr.js
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
const baseURL = match[1].replace(/\/+$/, "");
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

async function main() {
  console.log("=== Starting QR generation ===", new Date().toISOString());

  for (const file of getMarkdownFiles(contentDir)) {
    const src = fs.readFileSync(file, "utf8");
    const { data } = matter(src);

    if (data.qrCode === true) {
      // Compute relative path
      let rel = path.relative(contentDir, file).replace(/\.md$/, ""); // remove extension
      rel = rel.replace(/index$/, "");                                   // remove index
      rel = rel.replace(/\\/g, "/");                                     // normalize slashes

      // Flatten path for filename to match Hugo partial
      const flatName = rel.split("/").filter(Boolean).join("_");

      // Construct URL for QR code
      const url = `${baseURL}/${rel}/`;

      // Ensure output directory exists and generate QR file
      const outFile = path.join(outputDir, flatName + ".png");
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      await QRCode.toFile(outFile, url, { width: 64, margin: 1 });

      console.log(`Generated QR for: ${url}`);
    }
  }

  console.log("=== QR generation complete ===", new Date().toISOString());
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
