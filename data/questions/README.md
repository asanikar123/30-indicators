# Question inbox

Each JSON file here is one question typed into the public site's chat,
with the answer the AI gave, committed automatically by the Cloudflare
Worker (`cloudflare-worker/worker.js`, `/log` route). This branch is the
inbox only — it never merges to `main`.

To review: browse this folder, newest filenames last. To promote a
question to the FAQ: add a chip in `index.html` and a reviewed canned
answer in `assets/answers.js` (on a normal feature branch), then run
`node tests/verify-answers.js`.
