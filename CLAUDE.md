# CLAUDE.md — working notes for Claude Code sessions

Interactive one-page data app for a Harvard–Radcliffe Class of 1972
discussion of democratic health. No build step, no framework, no npm
dependencies in the page itself. Read `README.md` first for what the page
does; this file is about how to work on it safely.

## Architecture

- `index.html` — markup only, plus one config knob: `window.TI_WORKER_URL`
  (empty string = public chat hidden; a Cloudflare Worker URL = chat on for
  everyone). Keep it empty unless the owner says otherwise.
- `assets/data.js` — ALL data as `window.TI_DATA`. Edit here for any content
  change (scores, names, weights, presets, election years). Never put data
  in app.js.
- `assets/app.js` — one IIFE, all behavior. Sections in order: tooltip/chart
  build, levers, dialogs, HIST-derived rendering (sparkline, marks), chat
  (artifact `claude.use("sample")` backend and the worker-API backend with a
  client-side tool loop), AI tool definitions, prompt text.
- `assets/style.css` — tokens on `:root` with dark-mode overrides; custom
  range-slider styling; `@media (max-width: 899px)` is the mobile layout.
- `cloudflare-worker/worker.js` — standalone key-holding proxy; the API key
  lives only in the worker's secret store, never in this repo.

## Two deploy surfaces, one source

1. **claude.ai artifact** `https://claude.ai/artifact/3K3MS6qTwQejaCzJwRG1fS`
   — publish `index.html` with the three `assets/` files as supporting
   files, to that URL. Owner-only chat (platform rule); used for fast
   iteration and rehearsal.
2. **GitHub Pages** (public, for the class): any merge to `main` deploys
   via `.github/workflows/pages.yml` within ~1 minute. Never merge to main
   casually — work on a branch, PR, and merge only when the owner says
   "push".

## Data rules (do not break)

- Measured series (`TI_DATA.HIST`, 1975–2020, ×100) must match
  `data/GSoDI_v5.1.csv` exactly — `node tests/verify-data.js` checks all 22
  series and the 2020 marks. Column semantics gotcha: `C_SD23A` = social
  group equality, `C_SD23B` = basic welfare (they were once crossed; the
  verifier exists because of it).
- 2026 "today" scores follow the calibration rule in README ("How the 2026
  scores are set"). Don't hand-tweak individual scores; change the rule or
  get an explicit owner decision.
- Everything measured vs illustrative must stay visually and verbally
  distinguished (solid/dotted = measured; dashed/plain = illustrative), and
  the chat's briefing text must keep saying which is which.

## Testing (run before any publish or push)

```
node tests/verify-data.js                      # data integrity
NODE_PATH=$(npm root -g) node tests/battery.js # 32-check e2e suite
```

The battery covers rendering/marks, scenario-button pixel-stability,
tooltip zones, clustered mark tooltips, history panel, playback, dialogs,
the worker chat against a mock SSE server, chat persistence, and the 390px
layout. Keep expectations data-derived (they read `TI_DATA`), not
hardcoded. A publish with console errors or a failing battery is not done.

## Conventions

- Plain ES5-flavored JS (`var`, `function`) to match the file; `async` is
  fine where already used (worker chat path).
- The chat AI's behavior rules live in the prompt strings near the bottom
  of app.js (depth rules, no-repeat-charts, era zooming, honesty about the
  post-2020 data gap). Edit deliberately; they were tuned against real
  failure transcripts.
- Don't add attribution or model names to page content or commits beyond
  the repo's existing footer conventions.
