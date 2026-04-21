// /netlify/functions/getVisitStats.js
import { getSecureItem } from "./multiSecureStore.js";
import { requireBindingAuth } from "./authHelper.js";

const BIN_KEY = process.env.VISITS_KEY;

export async function handler(event) {
  const auth = await requireBindingAuth(event, "visit_stats");
  if (auth.unauthorized) return auth.response;

  try {
    const visits = (await getSecureItem(BIN_KEY, "visit_counts")) || {};

    return {
      statusCode: 200,
      body: JSON.stringify({ visits }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
