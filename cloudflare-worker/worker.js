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
 *
 * Optional — answer cache (saves money on repeated questions):
 *   5. dash.cloudflare.com → Storage & Databases → KV → Create namespace
 *      (any name, e.g. "ti-chat-cache").
 *   6. Worker → Settings → Bindings → Add → KV namespace → variable name
 *      exactly CACHE → pick the namespace → Deploy.
 *   Without the binding the worker runs exactly as before (no caching).
 *
 * Optional — question inbox (saves each typed question + answer to GitHub):
 *   7. github.com → Settings → Developer settings → Fine-grained personal
 *      access tokens → Generate: Repository access = ONLY the indicators
 *      repo; Permissions = Contents: Read and write; nothing else.
 *   8. Worker → Settings → Variables → add secret GITHUB_TOKEN.
 *   Questions land as JSON files under data/questions/ on the repo's
 *   "questions" branch (never main, so the site does not redeploy per
 *   question). Without the secret, /log is accepted and discarded.
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

const GITHUB_REPO = "asanikar123/30-indicators";
const QUESTIONS_BRANCH = "questions"; // never main: a commit there would redeploy the site
const MAX_Q_CHARS = 600;
const MAX_A_CHARS = 6000;

const bucket = new Map();

export default {
  async fetch(request, env, ctx) {
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

    // Question inbox: the page posts each typed question + the answer it got.
    // Committed as one JSON file each to the repo's "questions" branch for
    // review; a no-op (still 204) when the GITHUB_TOKEN secret is absent.
    if (new URL(request.url).pathname === "/log") {
      if (env.GITHUB_TOKEN && typeof body.q === "string" && body.q.trim()) {
        const doc = {
          q: body.q.trim().slice(0, MAX_Q_CHARS),
          a: typeof body.a === "string" ? body.a.slice(0, MAX_A_CHARS) : null,
          mode: typeof body.mode === "string" ? body.mode.slice(0, 20) : null,
          at: new Date().toISOString(),
        };
        // chart specs (not images): small recipes the review page redraws from data
        if (Array.isArray(body.charts) && body.charts.length) {
          const cj = JSON.stringify(body.charts.slice(0, 6));
          if (cj.length <= 8000) doc.charts = JSON.parse(cj);
        }
        const name = doc.at.replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 7);
        const ghBody = JSON.stringify({
          message: "Question from the page",
          branch: QUESTIONS_BRANCH,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(doc, null, 2) + "\n"))),
        });
        ctx.waitUntil((async () => {
          try {
            const put = () => fetch(
              "https://api.github.com/repos/" + GITHUB_REPO + "/contents/data/questions/" + name + ".json", {
                method: "PUT",
                headers: {
                  "authorization": "Bearer " + env.GITHUB_TOKEN,
                  "accept": "application/vnd.github+json",
                  "user-agent": "thirty-indicators-worker",
                  "content-type": "application/json",
                },
                body: ghBody,
              });
            const res = await put();
            if (res.status === 409) await put(); // rare ref race: retry once
          } catch (e) { /* logging is best-effort */ }
        })());
      }
      return new Response(null, { status: 204, headers: cors });
    }

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
    const payloadJson = JSON.stringify(payload);

    // Answer cache (optional): identical requests — chiefly the shortlisted FAQ
    // chips, which every visitor sends verbatim — replay a stored answer at zero
    // API cost. Requires a KV namespace bound as CACHE; without the binding this
    // block is a no-op. Follow-ups carry per-viewer history so they never hit.
    const CACHE_TTL_SECONDS = 7 * 24 * 3600;
    let cacheKey = null;
    if (env.CACHE) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payloadJson));
      cacheKey = "v1:" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
      const hit = await env.CACHE.get(cacheKey);
      if (hit) {
        return new Response(hit, {
          status: 200,
          headers: { ...cors, "content-type": "text/event-stream", "x-ti-cache": "hit" },
        });
      }
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
      },
      body: payloadJson,
    });

    if (!cacheKey || upstream.status !== 200 || !upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { ...cors, "content-type": upstream.headers.get("content-type") || "text/event-stream" },
      });
    }

    // Stream to the visitor while buffering a copy; store only complete streams.
    const [toClient, toBuffer] = upstream.body.tee();
    ctx.waitUntil((async () => {
      try {
        const text = await new Response(toBuffer).text();
        if (text.includes("message_stop")) {
          await env.CACHE.put(cacheKey, text, { expirationTtl: CACHE_TTL_SECONDS });
        }
      } catch (e) { /* caching is best-effort */ }
    })());

    return new Response(toClient, {
      status: 200,
      headers: { ...cors, "content-type": upstream.headers.get("content-type") || "text/event-stream", "x-ti-cache": "miss" },
    });
  },
};
