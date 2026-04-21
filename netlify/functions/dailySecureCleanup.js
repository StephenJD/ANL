// netlify/functions/dailySecureCleanup.js

import { cleanupExpired } from "../../lib/cleanupExpired.js";

export const config = {
  schedule: "@daily"
};

export default async () => {
  console.log("dailySecureCleanup running");
  console.log("BIN_KEY =", process.env.ACCESS_TOKEN_KEY);
  await cleanupExpired(process.env.ACCESS_TOKEN_KEY);
};
