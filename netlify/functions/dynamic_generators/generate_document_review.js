// \netlify\functions\generate_document_review.js
import fs from "fs";
import path from "path";

export default async function generate_document_review() {
  // Load all metadata JSON files from private_html to find pages with review params
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
            if (meta.last_reviewed && meta.review_period) {
              reviewDocs.push({
                path: fullPath.replace(privateHtmlDir, "").replace(/\.json$/, "").replace(/\\/g, "/"),
                last_reviewed: meta.last_reviewed,
                review_period: meta.review_period,
                reviewed_by: meta.reviewed_by || "unknown",
                title: meta.title || ""
              });
            }
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
  let html = `<h1>Form Review Status</h1>
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
    const last = new Date(doc.last_reviewed);
    let due = new Date(last);
    const period = doc.review_period;

    // Parse period (e.g. "6m" or "12m" or "1y")
    const match = period.match(/^(\d+)([my])$/);
    if (match) {
      const num = parseInt(match[1]);
      if (match[2] === "m") {
        due.setMonth(due.getMonth() + num);
      } else if (match[2] === "y") {
        due.setFullYear(due.getFullYear() + num);
      }
    }

    const isOverdue = due < today;
    const daysUntilDue = (due - today) / (1000 * 60 * 60 * 24);
    const isUpcoming = !isOverdue && daysUntilDue <= 30;

    const bgColor = isOverdue ? "background-color:#ffe5e5;" : isUpcoming ? "background-color:#fff8e1;" : "";
    const dueStr = due.toISOString().split("T")[0];
    const status = isOverdue ? " (Overdue)" : isUpcoming ? " (Upcoming)" : "";
    const color = isOverdue ? "red" : isUpcoming ? "orange" : "green";

    const editPath = `content${doc.path}.md`.replace(/\//g, "/");

    html += `
    <tr style="${bgColor}">
      <td><code>${doc.path}</code></td>
      <td>${doc.last_reviewed}</td>
      <td>${doc.review_period}</td>
      <td>${doc.reviewed_by}</td>
      <td>
        <span style="color:${color};">${dueStr}${status}</span>
      </td>
      <td>
        <a href="https://github.com/StephenJD/ANL/edit/main/content${doc.path}.md" target="_blank">
          ✏ Edit
        </a>
      </td>
    </tr>`;
  });

  html += `
  </tbody>
</table>`;

  return html;
}