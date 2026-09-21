/**
 * Key-holding proxy for the "30 Indicators" chat on GitHub Pages.
 *
 * The page sends {messages, tools}; this worker adds the Anthropic API key,
 * pins the model, and streams the response back. The key never reaches the
 * browser. Origin-locked + lightly rate-limited; also set a hard monthly
 * spend limit in the Anthropic console as the real backstop.
 *
 * Setup (one time):
 *   1. dash.cloudflare.com → Workers & Pages → Create Worker → paste this file.
 *   2. Worker → Settings → Variables → add secret ANTHROPIC_API_KEY
 *      (create the key at console.anthropic.com → API keys).
 *   3. Note the worker URL (https://<name>.<account>.workers.dev) and put it
 *      in index.html as window.TI_WORKER_URL.
 *   4. console.anthropic.com → Billing → set a monthly spend limit.
 */

const ALLOWED_ORIGINS = [
  "https://asanikar123.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

const MODEL = "claude-opus-5";
const MAX_TOKENS = 3000;
const MAX_BODY_BYTES = 200_000;
const RATE_LIMIT = { windowMs: 300_000, maxRequests: 25 }; // per IP, per isolate

const bucket = new Map();

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const okOrigin = ALLOWED_ORIGINS.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": okOrigin ? origin : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!okOrigin) return new Response("Forbidden", { status: 403 });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const rec = bucket.get(ip) || { n: 0, t: now };
    if (now - rec.t > RATE_LIMIT.windowMs) { rec.n = 0; rec.t = now; }
    rec.n += 1;
    bucket.set(ip, rec);
    if (rec.n > RATE_LIMIT.maxRequests) {
      return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: cors });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new Response("Too large", { status: 413, headers: cors });
    let body;
    try { body = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400, headers: cors }); }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response("Bad request", { status: 400, headers: cors });
    }

    const payload = {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      messages: body.messages,
      tools: Array.isArray(body.tools) ? body.tools.slice(0, 8) : undefined,
      fallbacks: "default",
    };

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "content-type": upstream.headers.get("content-type") || "text/event-stream" },
    });
  },
};
