// \build_scripts\generate_qr.js
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      let rel = path.relative(contentDir, file).replace(/\.md$/, "");
      rel = rel.replace(/index$/, "");
      rel = rel.replace(/\\/g, "/");

      const flatName = rel.split("/").filter(Boolean).join("_");

      const url = `${baseURL}/${rel}/`;

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
