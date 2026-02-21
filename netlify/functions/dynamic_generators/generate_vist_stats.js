// \netlify\functions\visitTracker.js
import { getSecureItem } from "../multiSecureStore.js";

const BIN_ID = process.env.VISITS_BIN;

export default async function visitTracker() {
  try {
    const visits = (await getSecureItem(BIN_ID, "visit_counts")) || {};

    if (!visits || Object.keys(visits).length === 0) {
      return "<p>No visit data available.</p>";
    }

    let html = '<div class="visit-stats">';
    html += '<h2>Daily Counts</h2><ul>';

    Object.keys(visits)
      .sort((a, b) => b.localeCompare(a))
      .forEach(day => {
        html += `<li>${day}: ${visits[day]}</li>`;
      });

    html += '</ul>';

    const last7Days = Object.keys(visits)
      .sort()
      .slice(-7)
      .reduce((sum, day) => sum + visits[day], 0);

    html += `<h2>Last 7 Days Total: ${last7Days}</h2>`;
    html += '</div>';

    return html;
  } catch (err) {
    console.error("[visitTracker] Error:", err);
    return `<p>Error loading visit stats: ${err.message}</p>`;
  }
}
