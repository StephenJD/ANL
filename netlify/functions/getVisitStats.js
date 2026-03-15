// /netlify/functions/getVisitStats.js
import { getSecureItem } from "./multiSecureStore.js";
import { requireBindingAuth } from "./authHelper.js";

const BIN_ID = process.env.VISITS_BIN;

export async function handler(event) {
  const auth = await requireBindingAuth(event, "visit_stats");
  if (auth.unauthorized) return auth.response;

  try {
    const visits = (await getSecureItem(BIN_ID, "visit_counts")) || {};

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
