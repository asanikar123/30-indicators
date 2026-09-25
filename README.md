# 30 Indicators of a Healthy Democracy

An interactive discussion aid built for the Harvard–Radcliffe Class of 1972,
prompted by NPR's September 15, 2026 story, ["State of U.S. democracy reaches
new low, report finds"](https://www.npr.org/2026/09/15/nx-s1-5969741/state-of-u-s-democracy-reaches-new-low-report-finds),
which covers International IDEA's *The Global State of Democracy 2026:
Democracy in an Age of Conflict*.

**Live site:** https://asanikar123.github.io/30-indicators/

## What the page shows

- **30 columns**, one per indicator, adapted from IDEA's GSoD framework
  (Representation, Civil Liberties, Rights & Equality, Rule of Law,
  Participation). Marks on each column: a **dotted line** at its measured
  2020 value, a **red line** under ▼-flagged indicators marking the old
  1975–2020 floor the 2026 report says they have now fallen below, and a
  **gray line** where some past year dipped below today's score. All marks
  and the ▼ flag explain themselves on hover.
- **A timeline with playback (1975 → today)**: 1975–2020 replays measured US
  values; the dashed tail bridges illustratively to today. Presidential
  elections are marked (dashed lines + dots), midterms as faint ticks, and
  the x-axis is labeled in election years.
- **Click any column** for its 45-year measured line chart in a docked panel.
- **Six levers** and three preset scenarios (Today / Decline / Recovery) for
  counterfactuals.
- An **"Ask a question" chat** (Scholar / Witty / Unhinged modes) that
  answers with charts, zooms to eras, marks election years, and can drive
  the page. The FAQ chips replay reviewed answers from `assets/answers.js`
  instantly at no API cost (Unhinged chips and all typed questions go to
  the live AI). It runs in two ways — see *Chat backends* below.

## How the 2026 scores are set (calibration rule)

There is no measured 2026 data; the public dataset ends in 2020. Each
indicator's "today" score is derived, not guessed:

- **No claim in the 2026 report** → today = the last measured value (2020).
- **Report: "significant decline 2020–2025"** → 2020 value − 6, never below
  the historical floor.
- **Report: "at a new 50-year low" (▼)** → the old 1975–2020 floor − 2.
- The **8 indicators added in IDEA's 2023 framework** have no historical
  series; their scores are editorial, stated on the measured scale.

The overall index is the mean of the 30 scores. The solid/dotted marks are
measured; the bars and the dashed bridge are this rule made visible.

## Repository layout

```
index.html              markup + the one config knob (TI_WORKER_URL)
questions.html          unlinked review page for the audience-question
                        inbox (filters, duplicate grouping, FAQ shortlist)
assets/style.css        all styling
assets/data.js          ALL data: framework, calibrated today-scores, lever
                        anchors, presets, measured 1975–2020 series (TI_DATA)
assets/answers.js       reviewed canned answers for the FAQ chips (replayed
                        instantly, zero API cost; charts drawn live from data)
assets/app.js           all behavior; contains no data
cloudflare-worker/      key-holding proxy for the public chat (setup in file)
data/                   archived GSoDI v5.1 dataset + provenance (README)
tests/                  verify-data.js (CSV ↔ page data diff, 22/22 exact)
                        verify-answers.js (canned FAQ figures vs the data)
                        battery.js (44-check headless end-to-end suite)
.github/workflows/      push to main → GitHub Pages deploy
```

To change content (scores, names, weights, election years), edit
`assets/data.js` only.

## Chat backends

The same page supports two chat transports; everything else about the chat
(tools, modes, charts) is identical:

1. **claude.ai artifact** — the chat runs through the artifact runtime on
   the viewer's own Claude account. The platform serves this only to the
   artifact's *owner* (or an owner-made copy), so it is a
   presenter/rehearsal surface, not the public one.
2. **This site + Cloudflare Worker** — set `window.TI_WORKER_URL` in
   `index.html` to a deployed copy of `cloudflare-worker/worker.js`. The
   worker holds the Anthropic API key in Cloudflare's secret store,
   origin-locks and rate-limits requests, and pins the model server-side;
   the key never appears in this repository, the page, or any browser.
   With the URL empty, the chat UI stays hidden. Optionally (with a
   repo-scoped GITHUB_TOKEN secret in the worker) each typed question and
   its answer is filed as a JSON document under `data/questions/` on this
   repository's `questions` branch, for review and promotion into the FAQ.

## Development

Open `index.html` in a browser — no build step. Run the tests with Node:

```
node tests/verify-data.js     # data integrity vs the archived CSV
npm i playwright && node tests/battery.js   # full feature suite
```

Anything merged to `main` deploys to the public site within a minute, so do
feature work on branches and merge via PR.

## Data & credits

Data provenance and license notes: [`data/README.md`](data/README.md).
Credits: International IDEA, *The Global State of Democracy Indices* v5.1
(1975–2020), used with attribution; findings from *The Global State of
Democracy 2026*. This page is an unofficial discussion aid, not an IDEA
publication.
