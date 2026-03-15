// static/js/netlifyAuthFetch.js
// Shared client helper for Netlify function requests.

export function getDeviceId() {
  let id = localStorage.getItem("anl_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("anl_device_id", id);
  }
  return id;
}

export function getNetlifyAuthHeaders({ json = false, includeAuth = true } = {}) {
  const headers = { "X-Device-ID": getDeviceId() };
  if (includeAuth) {
    const token = localStorage.getItem("userLogin_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

export async function netlifyFetch(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const needsJson = init.body != null && method !== "GET";
  const mergedHeaders = {
    ...getNetlifyAuthHeaders({ json: needsJson, includeAuth: true }),
    ...(init.headers || {})
  };
  return fetch(url, { ...init, headers: mergedHeaders });
}

export async function netlifyPostJson(url, payload, init = {}) {
  return netlifyFetch(url, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    body: JSON.stringify(payload)
  });
}
