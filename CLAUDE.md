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
- `assets/answers.js` — canned FAQ-chip answers as `window.TI_ANSWERS`
  (scholar + witty voices; unhinged deliberately goes live). Steps run the
  chat's own tools so charts/levers come from TI_DATA; only the prose is
  stored. Every figure in the prose is checked by
  `node tests/verify-answers.js` — run it after editing answers or data,
  and add a check when a new answer states a new figure. A chip whose text
  has no entry (or whose voice has none) falls through to the live AI, so
  new chips in index.html need a matching entry here.
- `assets/app.js` — one IIFE, all behavior. Sections in order: tooltip/chart
  build, levers, dialogs, HIST-derived rendering (sparkline, marks), chat
  (artifact `claude.use("sample")` backend and the worker-API backend with a
  client-side tool loop), AI tool definitions, prompt text.
- `assets/style.css` — tokens on `:root` with dark-mode overrides; custom
  range-slider styling; `@media (max-width: 899px)` is the mobile layout.
- `questions.html` — standalone, unlinked review page for the question
  inbox (reads the `questions` branch via the public GitHub API; search,
  voice filters, duplicate grouping, localStorage shortlist with a
  copy-for-Claude action). Redraws each exchange's charts from TI_DATA via
  the logged chart specs (loads assets/data.js). Test entries (mode
  "debug" / SELF-TEST) are hidden by default. Has its own inline styles
  mirroring the site tokens.
- `cloudflare-worker/worker.js` — standalone key-holding proxy; the API key
  lives only in the worker's secret store, never in this repo. Also serves
  `/log`: each typed question + answer (plus the charts of the exchange as
  small redrawable specs, never images) from the public site is committed
  as a JSON file to `data/questions/` on the `questions` branch (needs the
  GITHUB_TOKEN secret — fine-grained, contents-write, this repo only — in
  the worker's secret store; a safe no-op without it). The `questions`
  branch is an inbox: never merge it to main, and don't open PRs from it.
  Repo merges do NOT redeploy the worker — it's pasted into the Cloudflare
  dashboard manually.

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
node tests/verify-answers.js                   # canned FAQ prose vs the data
NODE_PATH=$(npm root -g) node tests/battery.js # 46-check e2e suite
```

The battery covers rendering/marks, scenario-button pixel-stability,
tooltip zones, clustered mark tooltips, history panel, playback, dialogs,
the worker chat against a mock SSE server, canned FAQ replay (zero API
calls, verbatim text, data-derived charts/levers), chat persistence, and
the 390px layout. Keep expectations data-derived (they read `TI_DATA`), not
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
