// /netlify/functions/trackVisit.js
import { getSecureItem, setSecureItem } from "./multiSecureStore.js";

const BIN_ID = process.env.VISITS_BIN;

export async function handler() {
  try {
    const current_counts = (await getSecureItem(BIN_ID, "visit_counts")) || {};
    const today = new Date().toISOString().slice(0, 10);

    current_counts[today] = (current_counts[today] || 0) + 1;
    await setSecureItem(BIN_ID, "visit_current_counts", current_counts);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, today_count: current_counts[today] }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}

