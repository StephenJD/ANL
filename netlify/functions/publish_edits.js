// netlify/functions/publish_edits.js
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import fetch from "node-fetch";

const editsRoot = path.join(process.cwd(), "edits");
// Keep in sync with static/js/webeditor/fieldSchema.js (fileTypeRules.fileTypes)
const fileTypeRules = {
  fileTypes: ["document", "form", "dynamic"]
};

function slugify(value) {
  const raw = String(value || "").toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "untitled";
}

function getTypeFromEdited(node) {
  const edited = node?.edit?.edited;
  if (!edited || typeof edited !== "string") return "";
  const match = edited.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return "";
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.split("#")[0].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^type\s*:\s*(.+)$/i);
    if (m) {
      let val = String(m[1]).trim().toLowerCase();
      val = val.replace(/^["']|["']$/g, "");
      return val;
    }
  }
  return "";
}

function isFolderNode(node) {
  if (node?.isIndex === false) return false;
  if (node?.isIndex) return true;
  const p = String(node?.path || "");
  if (p.endsWith(".md")) return false;
  const typeValue = getTypeFromEdited(node);
  if (fileTypeRules.fileTypes.includes(typeValue)) return false;
  return true;
}

function getBasenameFromPath(nodePath) {
  const p = String(nodePath || "");
  if (!p) return "";
  return path.posix.basename(p);
}

function hasDirectStagedChild(node) {
  return (node.children || []).some(c => !!c.edit?.staged);
}

function computeNewPaths(nodes, parentNewPath = "") {
  const shouldRenumber = nodes && nodes.length ? nodes.some(n => !!n.edit?.staged) : false;
  const count = nodes?.length || 0;
  const width = Math.max(2, String(count).length);

  for (let i = 0; i < count; i++) {
    const node = nodes[i];
    const folder = isFolderNode(node);
    let baseName = getBasenameFromPath(node.path);

    if (shouldRenumber) {
      const idx = String(i + 1).padStart(width, "0");
      const slug = slugify(node.title || node.rawName || node.path);
      baseName = `${idx}_${slug}${folder ? "" : ".md"}`;
    }

    const newPath = parentNewPath ? `${parentNewPath}/${baseName}` : baseName;
    node.__newPath = newPath;

    if (node.children?.length) {
      computeNewPaths(node.children, newPath);
    }
  }
}

function buildRenameList(nodes, renames = []) {
  for (const node of nodes || []) {
    const oldPath = String(node.path || "");
    const newPath = String(node.__newPath || "");
    if (newPath && oldPath && oldPath !== newPath) {
      renames.push({ from: oldPath, to: newPath });
    } else if (newPath && oldPath.startsWith("__new__/")) {
      renames.push({ from: oldPath, to: newPath });
    }
    if (node.children?.length) buildRenameList(node.children, renames);
  }
  return renames;
}

function findNodeByPath(nodes, pathValue) {
  for (const n of nodes || []) {
    if (n.path === pathValue || n.__newPath === pathValue) return n;
    if (n.children?.length) {
      const found = findNodeByPath(n.children, pathValue);
      if (found) return found;
    }
  }
  return null;
}

function renameChildrenIfNeeded(nodes, contentRoot, parentNewPath = "") {
  if (!nodes?.length) return;
  const shouldRenumber = nodes.some(n => !!n.edit?.staged);
  if (!shouldRenumber) {
    for (const node of nodes) {
      if (node.children?.length) {
        renameChildrenIfNeeded(node.children, contentRoot, node.__newPath || parentNewPath);
      }
    }
    return;
  }

  const parentFsPath = path.join(contentRoot, parentNewPath);
  fs.mkdirSync(parentFsPath, { recursive: true });

  const toRename = [];
  for (const node of nodes) {
    const oldBase = getBasenameFromPath(node.path);
    if (!oldBase || String(node.path || "").startsWith("__new__/")) continue;
    const newBase = path.posix.basename(node.__newPath || oldBase);
    if (oldBase !== newBase) {
      toRename.push({ oldBase, newBase });
    }
  }

  // First pass: rename to temp names to avoid collisions
  toRename.forEach((item, idx) => {
    const tmpBase = `__tmp__${idx}__${item.oldBase}`;
    const src = path.join(parentFsPath, item.oldBase);
    const tmp = path.join(parentFsPath, tmpBase);
    if (fs.existsSync(src)) {
      fs.renameSync(src, tmp);
      item.tmpBase = tmpBase;
    }
  });

  // Second pass: temp to final
  toRename.forEach(item => {
    if (!item.tmpBase) return;
    const tmp = path.join(parentFsPath, item.tmpBase);
    const dst = path.join(parentFsPath, item.newBase);
    if (fs.existsSync(tmp)) {
      fs.renameSync(tmp, dst);
    }
  });

  for (const node of nodes) {
    if (node.children?.length) {
      renameChildrenIfNeeded(node.children, contentRoot, node.__newPath || parentNewPath);
    }
  }
}

function writeStagedContent(nodes, contentRoot) {
  for (const node of nodes || []) {
    if (node.edit?.staged && typeof node.edit.edited === "string") {
      const targetPath = node.__newPath || node.path;
      const filePath = isFolderNode(node)
        ? path.join(contentRoot, targetPath, "_index.md")
        : path.join(contentRoot, targetPath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, node.edit.edited, "utf8");
    }
    if (node.children?.length) writeStagedContent(node.children, contentRoot);
  }
}

function runGit(command, cwd) {
  return execSync(command, { cwd, stdio: "pipe" }).toString("utf8").trim();
}

function getFileRelPath(node, pathValue) {
  if (String(pathValue || "").endsWith(".md")) return String(pathValue);
  if (!isFolderNode(node)) return String(pathValue || "") + ".md";
  return String(pathValue || "") + "/_index.md";
}

function buildStagedContentMap(nodes, map = new Map()) {
  for (const node of nodes || []) {
    if (node.edit?.staged && typeof node.edit.edited === "string") {
      const fileRel = getFileRelPath(node, node.__newPath || node.path);
      map.set(fileRel, node.edit.edited);
    }
    if (node.children?.length) buildStagedContentMap(node.children, map);
  }
  return map;
}

function collectStagedDiagnostics(nodes, out = []) {
  for (const node of nodes || []) {
    if (node.edit?.staged && typeof node.edit.edited === "string") {
      const parsedType = getTypeFromEdited(node);
      out.push({
        path: node.path,
        newPath: node.__newPath || node.path,
        isIndex: node.isIndex,
        parsedType
      });
    }
    if (node.children?.length) collectStagedDiagnostics(node.children, out);
  }
  return out;
}

async function githubGetFile(repo, relPath, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/content/${relPath}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPutFile(repo, relPath, content, token, message) {
  const encoded = Buffer.from(content || "").toString("base64");
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/content/${relPath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: encoded
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${relPath} failed: ${res.status} ${text}`);
  }
}

async function githubDeleteFile(repo, relPath, token, sha, message) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/content/${relPath}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message, sha })
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`GitHub DELETE ${relPath} failed: ${res.status} ${text}`);
  }
}

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const tree = Array.isArray(body.tree) ? body.tree : [];
    const mode = String(body.mode || "local").toLowerCase();
    const localRoot = String(body.localRoot || "");
    if (!tree.length) {
      return { statusCode: 400, body: "Missing tree" };
    }

    computeNewPaths(tree, "");
    const renames = buildRenameList(tree, []);
    const diagnostics = collectStagedDiagnostics(tree, []);

    if (mode === "web") {
      const repo = process.env.GITHUB_REPO || "StephenJD/ANL";
      const token = process.env.GITHUB_TOKEN;
      if (!token) return { statusCode: 500, body: "Missing GITHUB_TOKEN" };

      const stagedMap = buildStagedContentMap(tree);
      // Write staged content first
      for (const [fileRel, content] of stagedMap.entries()) {
        await githubPutFile(repo, fileRel, content, token, `Publish edit ${fileRel}`);
      }

      // Handle renames (move/renumber), including unstaged items
      for (const r of renames) {
        if (String(r.from).startsWith("__new__/")) continue;
        const oldNode = findNodeByPath(tree, r.from);
        const newNode = findNodeByPath(tree, r.to) || oldNode;
        const oldRel = getFileRelPath(oldNode, r.from);
        const newRel = getFileRelPath(newNode, r.to);

        if (stagedMap.has(newRel)) {
          if (oldRel !== newRel) {
            const existing = await githubGetFile(repo, oldRel, token);
            if (existing?.sha) {
              await githubDeleteFile(repo, oldRel, token, existing.sha, `Remove old ${oldRel}`);
            }
          }
          continue;
        }

        const existing = await githubGetFile(repo, oldRel, token);
        if (!existing?.content) continue;
        const decoded = Buffer.from(existing.content, "base64").toString("utf8");
        await githubPutFile(repo, newRel, decoded, token, `Move ${oldRel} -> ${newRel}`);
        if (oldRel !== newRel && existing?.sha) {
          await githubDeleteFile(repo, oldRel, token, existing.sha, `Remove old ${oldRel}`);
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ published: true, renamed: renames.length, renames, diagnostics })
      };
    }

    const repoRoot = localRoot || process.env.LOCAL_GIT_ROOT || process.cwd();
    const gitDir = path.join(repoRoot, ".git");
    if (!fs.existsSync(gitDir)) {
      return {
        statusCode: 409,
        body: JSON.stringify({ needLocalRoot: true })
      };
    }

    const contentRoot = path.join(repoRoot, "content");
    fs.mkdirSync(editsRoot, { recursive: true });
    const renamePath = path.join(editsRoot, "rename_map.json");
    fs.writeFileSync(renamePath, JSON.stringify(renames, null, 2), "utf8");

    renameChildrenIfNeeded(tree, contentRoot, "");
    writeStagedContent(tree, contentRoot);

    runGit("git add content", repoRoot);
    const staged = runGit("git diff --cached --name-only", repoRoot);
    if (staged) {
      runGit("git commit -m \"Publish edits\"", repoRoot);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ published: true, renamed: renames.length, renames, diagnostics })
    };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
