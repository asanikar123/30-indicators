const fs = require('fs');
const frag = fs.readFileSync('/home/user/30-indicators/assets/data.js', 'utf8');
const histM = frag.match(/var HIST = (\{.*?\});/s);
const HIST = JSON.parse(histM[1]);
const ovM = frag.match(/var OVERALL = (\[[^\]]*\]);/s);
const OVERALL = ovM ? JSON.parse(ovM[1]) : null;

// indicator index -> GSoDI v5.1 column
const MAP = {
  0:'C_SD11', 1:'C_SD12', 2:'C_SD13', 3:'C_SD14', 4:'C_SD31', 5:'C_SD54',
  6:'C_SD22A', 7:'C_SD33', 8:'C_SD22B', 9:'C_SD22C', 10:'C_SD22D', 11:'C_SD22E',
  12:'C_SD21', 13:'C_SD23B', 15:'C_SD23A', 16:'C_SD23C',
  18:'C_SD32', 19:'C_SD41', 20:'C_SD42',
  24:'C_SD52', 25:'C_SD51', 27:'C_SD53'
};

const csv = fs.readFileSync('/home/user/30-indicators/data/GSoDI_v5.1.csv', 'utf8').split('\n');
const header = csv[0].split(',').map(h => h.replace(/"/g, ''));
const col = {}; header.forEach((h, i) => col[h.trim()] = i);
const us = {};
for (const line of csv) {
  if (!line.startsWith('"United States"')) continue;
  const parts = line.split(',');
  us[+parts[col['ID_year']]] = parts;
}
const years = []; for (let y = 1975; y <= 2020; y++) years.push(y);
console.log('US rows found:', Object.keys(us).length, '(1975:', !!us[1975], '2020:', !!us[2020], ')');

let seriesOK = 0, seriesBad = 0;
const alt = {}; // try alternates if mismatch
for (const [idx, code] of Object.entries(MAP)) {
  const embedded = HIST.s[idx];
  if (!embedded) { console.log('idx', idx, 'no embedded series!'); continue; }
  const derived = years.map(y => {
    const v = parseFloat(us[y][col[code]]);
    return Math.round(v * 100);
  });
  const diffs = [];
  for (let k = 0; k < years.length; k++) if (derived[k] !== embedded[k]) diffs.push(years[k] + ':' + embedded[k] + '≠' + derived[k]);
  if (diffs.length === 0) { seriesOK++; }
  else { seriesBad++; console.log('MISMATCH idx', idx, code, 'count', diffs.length, diffs.slice(0, 5).join(' ')); }
}
console.log('series exact-match:', seriesOK, '/', Object.keys(MAP).length);

// measured2020 (ind[5]) check
const indM = frag.match(/var INDICATORS = \[(.*?)\];/s);
const rows = indM[1].match(/\[.*?\]\s*\]/g) || [];
// simpler: extract last numeric or null per line
const lines = indM[1].split('\n').filter(l => l.trim().startsWith('['));
let m2020ok = 0, m2020bad = 0;
lines.forEach((l, i) => {
  const mm = l.match(/,\s*(\d+|null)\]/);
  if (!mm) return;
  const val = mm[1] === 'null' ? null : +mm[1];
  const code = MAP[i];
  if (!code) { if (val !== null && !(i in MAP)) { /* unmapped with value? */ if (val !== null) console.log('idx', i, 'has measured2020', val, 'but no CSV mapping'); } return; }
  const want = Math.round(parseFloat(us[2020][col[code]]) * 100);
  if (val === want) m2020ok++; else { m2020bad++; console.log('measured2020 MISMATCH idx', i, 'page', val, 'csv', want, code); }
});
console.log('measured-2020 dotted marks exact-match:', m2020ok, '/', m2020ok + m2020bad);

// OVERALL check: per-year mean of the 22 embedded series
if (OVERALL) {
  let ovBad = 0;
  years.forEach((y, k) => {
    const vals = Object.keys(MAP).map(idx => HIST.s[idx][k]);
    const mean = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    if (mean !== OVERALL[k]) { ovBad++; if (ovBad < 4) console.log('OVERALL mismatch', y, 'page', OVERALL[k], 'recomputed', mean); }
  });
  console.log('OVERALL series:', ovBad === 0 ? 'exact match (mean of 22, rounded)' : ovBad + ' mismatches');
}
