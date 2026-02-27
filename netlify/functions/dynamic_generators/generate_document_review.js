// \netlify\functions\generate_document_review.js
import fs from "fs";
import path from "path";
import { urlize } from "../../../lib/urlize.js";

function resolveContentPathFromPrivatePath(privatePathNoExt) {
  const contentRoot = path.join(process.cwd(), "content");
  const segments = String(privatePathNoExt || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  if (!segments.length) return null;

  let currentDir = contentRoot;
  const resolvedParts = ["content"];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    if (!isLast) {
      const matchDir = entries.find(
        (e) => e.isDirectory() && urlize(e.name) === segment
      );
      if (!matchDir) return null;
      resolvedParts.push(matchDir.name);
      currentDir = path.join(currentDir, matchDir.name);
      continue;
    }

    const matchFile = entries.find((e) => {
      if (!e.isFile() || !e.name.toLowerCase().endsWith(".md")) return false;
      const base = e.name.replace(/\.md$/i, "");
      return urlize(base) === segment || urlize(e.name) === `${segment}.md`;
    });

    if (!matchFile) return null;
    resolvedParts.push(matchFile.name);
  }

  return resolvedParts.join("/");
}

export default async function generate_document_review() {
  // Load all metadata JSON files from private_html to list all docs
  const privateHtmlDir = path.join(process.cwd(), "private_html");
  const reviewDocs = [];

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith(".json")) {
          try {
            const meta = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
            reviewDocs.push({
              path: fullPath.replace(privateHtmlDir, "").replace(/\.json$/, "").replace(/\\/g, "/"),
              last_reviewed: meta.last_reviewed || "",
              review_period: meta.review_period || "",
              reviewed_by: meta.reviewed_by || "unknown",
              title: meta.title || ""
            });
          } catch (err) {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      console.error("[generate_document_review] Error walking dir:", err);
    }
  }

  walkDir(privateHtmlDir);

  const today = new Date();

  // Build HTML table
  let html = `<div class="wide-content"><h1>Form Review Status</h1>
<table>
  <thead>
    <tr>
      <th>File</th>
      <th>Last Reviewed</th>
      <th>Review Period</th>
      <th>Reviewed By</th>
      <th>Next Review Due</th>
      <th>Edit</th>
    </tr>
  </thead>
  <tbody>`;

  reviewDocs.forEach(doc => {
    const hasReviewDate = Boolean(doc.last_reviewed);
    const hasReviewPeriod = Boolean(doc.review_period);
    const hasReviewData = hasReviewDate && hasReviewPeriod;
    const last = hasReviewDate ? new Date(doc.last_reviewed) : null;
    let due = hasReviewDate ? new Date(last) : null;
    const period = doc.review_period;

    // Parse period (e.g. "6m" or "12m" or "1y")
    const match = period.match(/^(\d+)([my])$/);
    if (match && due) {
      const num = parseInt(match[1]);
      if (match[2] === "m") {
        due.setMonth(due.getMonth() + num);
      } else if (match[2] === "y") {
        due.setFullYear(due.getFullYear() + num);
      }
    }

    const isOverdue = hasReviewData && due < today;
    const daysUntilDue = hasReviewData ? (due - today) / (1000 * 60 * 60 * 24) : null;
    const isUpcoming = hasReviewData && !isOverdue && daysUntilDue <= 30;

    const bgColor = isOverdue ? "background-color:#ffe5e5;" : isUpcoming ? "background-color:#fff8e1;" : "";
    const dueStr = hasReviewData ? due.toISOString().split("T")[0] : "N/A";
    const status = isOverdue ? " (Overdue)" : isUpcoming ? " (Upcoming)" : "";
    const color = isOverdue ? "red" : isUpcoming ? "orange" : "green";

    const contentPath = resolveContentPathFromPrivatePath(doc.path);
    if (!contentPath) return;

    html += `
    <tr style="${bgColor}">
      <td><code>${doc.path}</code></td>
      <td>${doc.last_reviewed || "N/A"}</td>
      <td>${doc.review_period || "N/A"}</td>
      <td>${doc.reviewed_by}</td>
      <td>
        <span style="color:${hasReviewData ? color : "inherit"};">${dueStr}${status}</span>
      </td>
      <td>
        <a href="https://github.com/StephenJD/ANL/blob/main/${contentPath}" target="_blank">
          Edit
        </a>
      </td>
    </tr>`;
  });

  html += `
  </tbody>
</table></div>`;

  return html;
}
