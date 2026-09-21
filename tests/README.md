# Tests

Both are plain Node scripts, no install beyond Playwright for the battery.

- `verify-data.js` — re-derives every measured series in `assets/data.js`
  from `data/GSoDI_v5.1.csv` and reports any mismatch. Run: `node tests/verify-data.js`
- `battery.js` — end-to-end feature battery in headless Chromium (rendering,
  marks, tooltips, scenarios, playback, dialogs, worker-backed chat with a mock
  streaming server, persistence, mobile layout). 30 checks.
  Run: `npm i playwright` once, then `node tests/battery.js`
  (edit the REPO constant at the top if your clone lives elsewhere).
