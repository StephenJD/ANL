
export default {
  async fetch(request, env) {
    const EXPECTED_TOKEN = env.DB_ACCESS_TOKEN;
    const token = request.headers.get("x-db-token");

    function safeEqual(a, b) {
      if (typeof a !== "string" || typeof b !== "string") return false;
      if (a.length !== b.length) return false;

      let out = 0;
      for (let i = 0; i < a.length; i++) {
        out |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return out === 0;
    }

    if (!safeEqual(token, EXPECTED_TOKEN)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const key = parts[2];

    if (!key) {
      return new Response("Missing key", { status: 400 });
    }

    if (request.method === "GET") {
      const row = await env.secure_store.prepare(
        "SELECT value FROM kv_store WHERE key = ?"
      ).bind(key).first();

      return Response.json(row ? JSON.parse(row.value) : {});
    }

    if (request.method === "PUT") {
      try {
        const bodyText = await request.text();

        let body;
        try {
          body = JSON.parse(bodyText);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        await env.secure_store.prepare(`
          INSERT INTO kv_store (key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key)
          DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(
          key,
          JSON.stringify(body),
          Date.now()
        ).run();

        return Response.json({ ok: true });

      } catch (err) {
        return new Response(err.message, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  }
};