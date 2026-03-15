// /.netlify/functions/sendFormAccessLink.js
import { setSecureItem } from "./multiSecureStore.js";
import { generateTempAccessToken } from "./generateSecureToken.js";
import { sendEmail } from "./sendEmail.js";
import { getSecureItem } from "./multiSecureStore.js";
import { getFormFrontMatter } from "./getFormFrontMatter.js";

const USER_ACCESS_BIN = process.env.USER_ACCESS_BIN;
const PERMITTED_USERS_KEY = process.env.PERMITTED_USERS_KEY;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 6;
const requestRateCache = new Map();

function getClientKey(event, email) {
  const forwarded = String(event?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const nfIp = String(event?.headers?.["x-nf-client-connection-ip"] || "").trim();
  const ip = forwarded || nfIp || "unknown";
  return `${ip}|${String(email || "").toLowerCase()}`;
}

function isRateLimited(event, email) {
  const now = Date.now();
  const key = getClientKey(event, email);
  let bucket = requestRateCache.get(key);
  if (!bucket || now - bucket.startedAt > REQUEST_WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
  }
  bucket.count += 1;
  requestRateCache.set(key, bucket);
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeAccess(access) {
  let list = access || [];
  if (!Array.isArray(list)) list = [list];
  return list.map(a => String(a || "").toLowerCase().trim()).filter(Boolean);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { email, formPath, formName, site_root } = JSON.parse(event.body || "{}");

    if (!email || !formPath || !formName || !site_root) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: "Missing required parameters" }) };
    }

    if (isRateLimited(event, email)) {
      // Enumeration-resistant: always return success-like response.
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    // Server-side access enforcement: validate that the requesting email has a role
    // permitted by the target form/page front matter.
    const metadata = await getFormFrontMatter({ formPath });
    const requiredAccess = normalizeAccess(metadata?.access);

    const requiresRole = requiredAccess.length > 0 && !requiredAccess.includes("public") && !requiredAccess.includes("none");
    let isPermitted = true;
    if (requiresRole) {
      const permittedUsers = await getSecureItem(USER_ACCESS_BIN, PERMITTED_USERS_KEY) || [];
      const user = permittedUsers.find(u => String(u?.Email || "").toLowerCase() === String(email).toLowerCase());

      if (!user) {
        isPermitted = false;
      }

      if (user) {
        const userRole = String(user?.Role || "").toLowerCase().trim();
        if (!requiredAccess.includes(userRole)) {
          isPermitted = false;
        }
      }
    }

    if (!isPermitted) {
      // Enumeration-resistant: do not reveal account/role mismatch details.
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    const valueObject = { email, formPath, formName };
    const token = generateTempAccessToken(valueObject);

    console.log("[DEBUG] Storing request-link token:", token, valueObject);

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    await setSecureItem(process.env.ACCESS_TOKEN_BIN, token, valueObject, ONE_DAY_MS);

    const accessLink = `${site_root}${formPath}?token=${encodeURIComponent(token)}`;

    const emailText = `Delete this email if you did not just request a Form-Link from Ascend Next Level.
Form link: ${accessLink}`;

    const emailHtml = `
      <p>Delete this email if you did not just request a Form-Link from <strong>Ascend Next Level</strong>.</p>
      <p>The link is valid for today only, and only for this form.</p>
      <p><a href="${accessLink}" style="padding:10px 15px;background:#2a6df4;color:#fff;text-decoration:none;border-radius:5px;">${formName}</a></p>
    `;

    try {
      await sendEmail({ to: email, subject: `Access Link for ${formName}`, html: emailHtml, text: emailText });
      console.log("[DEBUG] Access link email sent to:", email);
    } catch (emailErr) {
      console.error("[ERROR] Failed to send access link email:", emailErr);
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("[ERROR] sendFormAccessLink failed:", err);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: err.message || "Server error" }) };
  }
}
