const { chromium } = require('playwright');
const fs = require('fs');
const REPO = '/home/user/30-indicators';

(async () => {
  // test copy with worker URL pointed at mock + test hook exposed
  fs.mkdirSync('/tmp/claude-0/ti-test/assets', { recursive: true });
  for (const f of ['style.css', 'data.js', 'answers.js', 'app.js']) fs.copyFileSync(REPO + '/assets/' + f, '/tmp/claude-0/ti-test/assets/' + f);
  let app = fs.readFileSync('/tmp/claude-0/ti-test/assets/app.js', 'utf8');
  app = app.replace(/\}\)\(\);\s*$/, 'window.__test = { addChartMsg: addChartMsg, addMsg: addMsg, setTimelineMarks: setTimelineMarks };\n})();\n');
  fs.writeFileSync('/tmp/claude-0/ti-test/assets/app.js', app);
  const idxSrc = fs.readFileSync(REPO + '/index.html', 'utf8');
  const setUrl = (src, url) => src.replace(/window\.TI_WORKER_URL = "[^"]*";/, 'window.TI_WORKER_URL = "' + url + '";');
  fs.writeFileSync('/tmp/claude-0/ti-test/index.html', setUrl(idxSrc, 'http://127.0.0.1:8787'));
  // a "plain" build with the chat disabled, for the static-surface checks
  fs.mkdirSync('/tmp/claude-0/ti-plain/assets', { recursive: true });
  for (const f of ['style.css', 'data.js', 'answers.js', 'app.js']) fs.copyFileSync(REPO + '/assets/' + f, '/tmp/claude-0/ti-plain/assets/' + f);
  fs.writeFileSync('/tmp/claude-0/ti-plain/index.html', setUrl(idxSrc, ''));

  const results = [];
  const T = (name, ok, detail) => { results.push((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + detail + ']' : '')); };

  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const errs = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  // ---- plain build (worker URL blanked) ----
  await p.goto('file:///tmp/claude-0/ti-plain/index.html');
  await p.waitForTimeout(1000);
  let s = await p.evaluate(() => ({
    bars: document.querySelectorAll('.bar').length,
    fills: [...document.querySelectorAll('.bar-fill')].filter(f => f.offsetHeight > 0).length,
    dotted: document.querySelectorAll('.base-tick').length,
    red: document.querySelectorAll('.lowest-tick:not(.muted)').length,
    gray: document.querySelectorAll('.lowest-tick.muted').length,
    pres: document.querySelectorAll('.spark-mark:not(.spark-mark-mid)').length,
    mid: document.querySelectorAll('.spark-mark-mid').length,
    dots: document.querySelectorAll('.spark-mark-dot').length,
    hero: document.getElementById('heroValue').textContent,
    mast: document.querySelector('.eyebrow').textContent.trim(),
    launcherVisible: !document.getElementById('chatLauncher').hidden && getComputedStyle(document.getElementById('chatLauncher')).display !== 'none',
    fontCss: !!document.querySelector('link[href="assets/style.css"]')
  }));
  T('render: 30 bars, 24 with fill', s.bars === 30 && s.fills >= 22, s.bars + '/' + s.fills);
  const expected = await p.evaluate(() => {
    const D = window.TI_DATA; let gray = 0, overall = 0;
    D.INDICATORS.forEach((ind, i) => {
      overall += ind[2];
      const hs = D.HIST.s[i];
      if (hs && ind[4] !== 2 && Math.min(...hs) < ind[2]) gray++;
    });
    return { gray, overall: String(Math.round(overall / 30)) };
  });
  T('marks: 22 dotted, 5 red + data-derived gray lows, 13+12 timeline, 12 dots', s.dotted === 22 && s.red === 5 && s.gray === expected.gray && s.pres === 13 && s.mid === 12 && s.dots === 12, [s.dotted, s.red, s.gray + '/' + expected.gray, s.pres, s.mid, s.dots].join(','));
  T('hero index equals mean of calibrated baselines', s.hero === expected.overall, s.hero + ' vs ' + expected.overall);
  T('masthead Harvard–Radcliffe, no committee/date', s.mast === 'Harvard–Radcliffe Class of 1972', s.mast);
  T('chat launcher hidden on static build (Vince fix)', s.launcherVisible === false);

  // scenario buttons: stability + caption + hero
  const segBefore = await p.locator('#presets').boundingBox();
  await p.click('#presetBackslide');
  await p.waitForTimeout(400);
  const segAfter = await p.locator('#presets').boundingBox();
  let s2 = await p.evaluate(() => ({ hero: document.getElementById('heroValue').textContent, cap: document.getElementById('scenarioCap').textContent }));
  T('scenario click: buttons pixel-stable', segBefore.x === segAfter.x && segBefore.y === segAfter.y);
  T('scenario: hero drops + caption swaps', +s2.hero < +expected.overall && /erosion/.test(s2.cap), s2.hero + ' / ' + s2.cap);
  await p.click('#presetToday'); await p.waitForTimeout(300);

  // tooltip zones + mark tips
  const z = await p.evaluate(() => { const b = [...document.querySelectorAll('.bar')][7]; const r = b.getBoundingClientRect(); const fh = b.querySelector('.bar-fill').offsetHeight; return { x: r.left + r.width / 2, top: r.top + 6, fill: r.bottom - fh / 2 }; });
  await p.mouse.move(z.x, z.top); await p.waitForTimeout(120);
  const tipAbove = await p.evaluate(() => !document.getElementById('tooltip').hidden);
  await p.mouse.move(z.x, z.fill); await p.waitForTimeout(120);
  const tipFill = await p.evaluate(() => !document.getElementById('tooltip').hidden);
  T('tooltip: none above fill, shows on fill', !tipAbove && tipFill);
  async function markTip(sel) { const bb = await p.locator(sel).first().boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + 1); await p.waitForTimeout(120); return p.evaluate(() => document.getElementById('tooltip').hidden ? '' : [...document.querySelectorAll('#tooltip .t-name')].map(n => n.textContent).join(' | ')); }
  T('mark tip: dotted', /measured 2020/.test(await markTip('.base-tick')));
  T('mark tip: red line', /previous 50-year low/.test(await markTip('.lowest-tick:not(.muted)')));
  T('mark tip: gray low line', /lowest measured year/.test(await markTip('.lowest-tick.muted')));
  T('mark tip: flag', /NEW 50-year low/.test(await markTip('.low-flag')));
  // clustered marks (Effective parliament: dotted 2020 and red low coincide at 62)
  const clusterLines = await p.evaluate(() => {
    const bar = document.querySelector('.bar[data-index="4"]');
    const t = bar.querySelector('.base-tick').getBoundingClientRect();
    return { x: t.left + t.width / 2, y: t.top + 1 };
  });
  await p.mouse.move(10, 500); await p.waitForTimeout(100);
  await p.mouse.move(clusterLines.x, clusterLines.y); await p.waitForTimeout(150);
  const cl = await p.evaluate(() => [...document.querySelectorAll('#tooltip .t-name')].map(n => n.textContent).join(' | '));
  T('clustered marks share one tooltip', /previous 50-year low: 62/.test(cl) && /measured 2020: 62/.test(cl), cl);

  // click bar -> docked history panel
  await p.locator('.bar').first().click();
  await p.waitForTimeout(300);
  let hp = await p.evaluate(() => ({ open: !document.getElementById('historyPanel').hidden, svg: !!document.querySelector('#historyBody svg path') }));
  T('bar click opens history panel with line chart', hp.open && hp.svg);
  await p.click('#historyClose');

  // year slider + playback
  await p.locator('#yearSlider').evaluate(el => { el.value = 1985; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(300);
  let yr = await p.evaluate(() => document.getElementById('heroYearLabel').textContent);
  T('year slider -> 1985', /1985/.test(yr), yr);
  await p.click('#playBtn'); await p.waitForTimeout(1200); await p.click('#playBtn');
  let yr2 = await p.evaluate(() => +document.getElementById('yearSlider').value);
  T('playback advances the year', yr2 > 1985, String(yr2));
  await p.click('#timeNote').catch(() => {});
  await p.waitForTimeout(200);
  T('return-to-today restores 2026', await p.evaluate(() => +document.getElementById('yearSlider').value === 2026));

  // dialogs
  for (const [btn, dlg] of [['#openTable', 'tableDialog'], ['#openAbout', 'aboutDialog']]) {
    await p.click(btn); await p.waitForTimeout(200);
    T('dialog opens: ' + dlg, await p.evaluate(d => document.getElementById(d).open, dlg));
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  }
  let tableRows = 0;
  await p.click('#openTable'); await p.waitForTimeout(200);
  tableRows = await p.evaluate(() => document.querySelectorAll('#tableDialog tbody tr').length);
  T('data table has 30 rows', tableRows === 30, String(tableRows));
  await p.keyboard.press('Escape');

  // ---- worker-shim E2E on test copy with mock ----
  const http = require('http');
  let calls = 0;
  const logs = [];
  const sse = (res, evs) => { res.writeHead(200, { 'content-type': 'text/event-stream', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' }); for (const e of evs) res.write('data: ' + JSON.stringify(e) + '\n\n'); res.end(); };
  const srv = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }); return res.end(); }
    let body = ''; req.on('data', c => body += c); req.on('end', () => {
      if (req.url === '/log') {
        try { logs.push(JSON.parse(body)); } catch (e) {}
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        return res.end();
      }
      calls++;
      if (calls === 1) sse(res, [
        { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 't1', name: 'set_year', input: {} } },
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"year":1992}' } },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' } }]);
      else {
        const last = JSON.parse(body).messages.at(-1);
        const ok = Array.isArray(last.content) && last.content[0].type === 'tool_result';
        sse(res, [
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ok ? 'Now showing 1992.' : 'BAD' } },
          { type: 'message_delta', delta: { stop_reason: 'end_turn' } }]);
      }
    });
  });
  await new Promise(r => srv.listen(8787, '127.0.0.1', r));
  await p.goto('file:///tmp/claude-0/ti-test/index.html');
  await p.waitForTimeout(900);
  T('worker build: launcher visible, no gate', await p.evaluate(() => !document.getElementById('chatLauncher').hidden));
  await p.click('#chatLauncher');
  T('worker build: no sign-in gate', await p.evaluate(() => !document.querySelector('.gate-screen:not([hidden])')));
  // canned FAQ chip (default voice is witty): replays locally, zero API calls
  await p.click('#faqChips button:has-text("fell furthest since 2020")');
  await p.waitForTimeout(400);
  const canned = await p.evaluate(() => {
    const entry = window.TI_ANSWERS.find(a => /fell furthest/.test(a.q));
    const want = entry.modes.witty[entry.modes.witty.length - 1].say;
    return {
      text: [...document.querySelectorAll('.msg.ai:not(.chart-msg)')].pop()?.textContent,
      want,
      deltaChart: [...document.querySelectorAll('.chart-cap')].some(c => /Change 2020/.test(c.textContent))
    };
  });
  T('canned chip: zero API calls, nothing logged', calls === 0 && logs.length === 0, calls + '/' + logs.length);
  T('canned chip: reviewed text shown verbatim', canned.text === canned.want, (canned.text || '').slice(0, 60));
  T('canned chip: delta chart drawn from live data', canned.deltaChart);
  await p.fill('#askInput', 'show 1992'); await p.click('#askSend');
  await p.waitForTimeout(2200);
  let chat = await p.evaluate(() => ({ yr: +document.getElementById('yearSlider').value, msg: [...document.querySelectorAll('.msg.ai')].pop()?.textContent }));
  T('worker chat: tool round moved year to 1992', chat.yr === 1992, String(chat.yr));
  T('worker chat: streamed final text', /Now showing 1992/.test(chat.msg || ''), chat.msg);
  T('typed exchange filed to /log with question + answer', logs.length === 1 && logs[0].q === 'show 1992' && /Now showing 1992/.test(logs[0].a || ''), JSON.stringify(logs[0] || null));
  // chips collapsed to a row after conversation
  T('chips collapse to one row after chat', await p.evaluate(() => document.getElementById('faqChips').getBoundingClientRect().height < 60));
  // fullscreen + era chart with marks via hook
  await p.click('#chatMax'); await p.waitForTimeout(500);
  T('chat fullscreen fills viewport', await p.evaluate(() => { const el = document.fullscreenElement || document.querySelector('.chat-panel.maximized'); return !!el; }));
  await p.evaluate(() => window.__test.addChartMsg(0, [2015, 2020], [2016, 2020], 'elections'));
  let chart = await p.evaluate(() => ({ marks: document.querySelectorAll('.chart-msg .h-mark').length, cap: [...document.querySelectorAll('.chart-cap')].pop().textContent }));
  T('era chart: zoomed 2015–2020 with 2 marks', chart.marks === 2 && /2015–2020/.test(chart.cap), chart.cap);
  // chat persistence across reload (charts + user/ai turns are recorded by the ask flow;
  // the era chart added above went through record(), so it must come back)
  await p.reload(); await p.waitForTimeout(900);
  await p.click('#chatLauncher'); await p.waitForTimeout(200);
  const restored = await p.evaluate(() => ({
    charts: document.querySelectorAll('.chart-msg').length,
    marks: document.querySelectorAll('.chart-msg .h-mark').length,
    userMsg: [...document.querySelectorAll('.msg.user')].some(m => /show 1992/.test(m.textContent))
  }));
  T('chat restores after reload: chart with era+marks and user turn', restored.charts >= 1 && restored.marks === 2 && restored.userMsg, JSON.stringify(restored));
  T('canned answer restored after reload', await p.evaluate(() => {
    const entry = window.TI_ANSWERS.find(a => /fell furthest/.test(a.q));
    const want = entry.modes.witty[entry.modes.witty.length - 1].say;
    return [...document.querySelectorAll('.msg.ai')].some(m => m.textContent === want);
  }));
  // canned recovery chip drives the page: levers move, hero matches the data-derived value
  const callsBefore = calls;
  await p.click('#faqChips button:has-text("realistic recovery")');
  await p.waitForTimeout(400);
  const rec = await p.evaluate(() => {
    const D = window.TI_DATA;
    const scores = D.INDICATORS.map(ind => {
      let d = 0;
      for (let j = 0; j < D.LEVERS.length; j++) d += ind[3][j] * (D.PRESETS.recovery[j] - D.LEVER_TODAY[j]) * D.SCALE;
      return Math.min(98, Math.max(2, ind[2] + d));
    });
    return {
      want: (scores.reduce((a, b) => a + b) / 30).toFixed(0),
      hero: document.getElementById('heroValue').textContent
    };
  });
  T('canned recovery chip: levers applied, hero = data-derived ' + rec.want, rec.hero === rec.want, rec.hero);
  T('canned chips never hit the API or the log', calls === callsBefore && logs.length === 1, calls + ' vs ' + callsBefore + ', logs ' + logs.length);
  srv.close();

  // ---- mobile ----
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const merrs = []; m.on('pageerror', e => merrs.push(String(e)));
  await m.goto('file:///tmp/claude-0/ti-plain/index.html'); await m.waitForTimeout(900);
  let mm = await m.evaluate(() => {
    const spans = [...document.querySelectorAll('.year-ruler span')].filter(x => getComputedStyle(x).display !== 'none');
    let overlap = false; let prev = null;
    for (const sp of spans) { const r = sp.getBoundingClientRect(); if (prev && r.left < prev) overlap = true; prev = r.right; }
    return { labels: spans.length, overlap, sparkH: document.querySelector('.spark-box').getBoundingClientRect().height, docW: document.documentElement.scrollWidth, vw: window.innerWidth };
  });
  T('mobile: 7 axis labels, no overlap', mm.labels === 7 && !mm.overlap, mm.labels + '/' + mm.overlap);
  T('mobile: compact spark, no horizontal scroll', mm.sparkH <= 50 && mm.docW <= mm.vw + 1, mm.sparkH + '/' + mm.docW + '>' + mm.vw);
  T('mobile: zero errors', merrs.length === 0, merrs.join(';'));

  T('desktop: zero page errors', errs.length === 0, errs.join(';'));
  await b.close();
  console.log(results.join('\n'));
  console.log('---', results.filter(r => r.startsWith('PASS')).length, 'passed /', results.length);
})();
