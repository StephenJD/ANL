// /netlify/functions/trackVisit.js
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";

const BIN_ID = process.env.VISITS_BIN;
const VISIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes per client key
const visitRateCache = new Map();

function getClientKey(event) {
  const forwarded = String(event?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const nfIp = String(event?.headers?.["x-nf-client-connection-ip"] || "").trim();
  const ip = forwarded || nfIp || "unknown";
  const ua = String(event?.headers?.["user-agent"] || "unknown").slice(0, 120);
  return `${ip}|${ua}`;
}

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const key = getClientKey(event);
    const now = Date.now();
    const lastSeen = visitRateCache.get(key) || 0;
    if (now - lastSeen < VISIT_WINDOW_MS) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, counted: false }),
      };
    }
    visitRateCache.set(key, now);

    const current_counts = (await getSecureItem(BIN_ID, "visit_counts")) || {};
    const today = new Date().toISOString().slice(0, 10);

    current_counts[today] = (current_counts[today] || 0) + 1;
    await setSecureItem(BIN_ID, "visit_counts", current_counts);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, counted: true, today_count: current_counts[today] }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

