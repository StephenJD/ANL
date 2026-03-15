// /netlify/functions/get_role_options.js
import { getSecureItem } from "./multiSecureStore.js";
import { requireBindingAuth } from "./authHelper.js";

let cachedRoles = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

export async function handler(event) {
    const auth = await requireBindingAuth(event, "content_editor");
    if (auth.unauthorized) return auth.response;

    try {
        const now = Date.now();
        if (cachedRoles && now - cacheTimestamp < CACHE_TTL) {
            return {
                statusCode: 200,
                body: JSON.stringify(cachedRoles)
            };
        }

        const BIN_ID = process.env["USER_ACCESS_BIN"];
        const token = "Role_Details";

        const roles = await getSecureItem(BIN_ID, token);

        if (!roles || !Array.isArray(roles)) {
            cachedRoles = [];
        } else {
            cachedRoles = roles.map(r => r.name || r.role || r);
        }

        cacheTimestamp = now;

        return {
            statusCode: 200,
            body: JSON.stringify(cachedRoles)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to get roles", details: err.message })
        };
    }
}

