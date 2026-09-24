/* Checks assets/answers.js against the data and the page:
   - every FAQ chip in index.html has a canned entry (scholar + witty), and
     every canned entry matches a real chip;
   - steps only call real chat tools, and set_levers inputs equal the
     recovery preset;
   - every figure the prose states is recomputed from TI_DATA and must
     appear in the text. Run after any edit to answers.js or data.js. */
"use strict";
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");

global.window = {};
require(path.join(root, "assets/data.js"));
require(path.join(root, "assets/answers.js"));
var D = window.TI_DATA;
var ANSWERS = window.TI_ANSWERS;
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");

var fails = 0;
function check(name, ok, detail) {
  console.log((ok ? "ok  " : "FAIL") + "  " + name + (ok || !detail ? "" : "  [" + detail + "]"));
  if (!ok) fails++;
}

/* ---- derived figures, same math as the page ---- */
var y0 = D.HIST.y0;
var keys = Object.keys(D.HIST.s);
var N = D.HIST.s[keys[0]].length;
var OVERALL = [];
for (var k = 0; k < N; k++) {
  var sum = 0;
  keys.forEach(function (key) { sum += D.HIST.s[key][k]; });
  OVERALL.push(Math.round(sum / keys.length));
}
function at(y) { return OVERALL[y - y0]; }
function eraAvg(a, b) {
  var v = OVERALL.slice(a - y0, b - y0 + 1);
  return v.reduce(function (x, y) { return x + y; }, 0) / v.length;
}
var peak = Math.max.apply(null, OVERALL);
function heroAt(levers) {
  var s = D.INDICATORS.map(function (ind) {
    var d = 0;
    for (var j = 0; j < D.LEVERS.length; j++) d += ind[3][j] * (levers[j] - D.LEVER_TODAY[j]) * D.SCALE;
    return Math.min(98, Math.max(2, ind[2] + d));
  });
  return Math.round(s.reduce(function (a, b) { return a + b; }, 0) / 30);
}
var heroToday = heroAt(D.LEVER_TODAY);
var heroRecovery = heroAt(D.PRESETS.recovery);
var epi = -1;
D.INDICATORS.forEach(function (ind, i) { if (/effective parliament/i.test(ind[0])) epi = i; });
var eps = D.HIST.s[epi];
var measured = D.INDICATORS.filter(function (ind, i) { return !!D.HIST.s[i]; }).length;

/* ---- chips <-> entries ---- */
var chips = [];
var m, re = /<div class="faq-chips"[^>]*>([\s\S]*?)<\/div>/;
var block = (re.exec(html) || [])[1] || "";
var bre = /<button type="button">([^<]+)<\/button>/g;
while ((m = bre.exec(block))) chips.push(m[1].replace(/&amp;/g, "&").trim());
check("index.html has 6 FAQ chips", chips.length === 6, String(chips.length));
chips.forEach(function (q) {
  var entry = ANSWERS.filter(function (a) { return a.q === q; })[0];
  check("chip has canned entry: " + q, !!entry);
  if (!entry) return;
  ["scholar", "witty"].forEach(function (mode) {
    var steps = (entry.modes || {})[mode];
    check("  " + mode + ": steps end in say", Array.isArray(steps) && steps.length > 0 && !!steps[steps.length - 1].say);
  });
});
ANSWERS.forEach(function (a) {
  check("entry matches a real chip: " + a.q, chips.indexOf(a.q) !== -1);
});

/* ---- steps call real tools; set_levers = recovery preset ---- */
var TOOLS = ["set_year", "mark_timeline", "set_levers", "get_history", "show_history", "show_changes"];
ANSWERS.forEach(function (a) {
  Object.keys(a.modes).forEach(function (mode) {
    a.modes[mode].forEach(function (st) {
      if (st.say) return;
      check("valid tool in '" + a.q + "' (" + mode + "): " + st.call, TOOLS.indexOf(st.call) !== -1);
      if (st.call === "set_levers") {
        var ok = D.LEVERS.every(function (lv, j) { return st.input[lv.id] === D.PRESETS.recovery[j]; });
        check("set_levers input equals recovery preset", ok, JSON.stringify(st.input));
      }
      if (st.call === "show_history" && st.input && Array.isArray(st.input.marks)) {
        var inRange = st.input.marks.every(function (yr) { return yr >= D.HIST.y0 && yr <= D.HIST.y1; });
        check("marks within measured years in '" + a.q + "'", inRange, JSON.stringify(st.input.marks));
      }
    });
  });
});

/* ---- prose figures vs recomputed values ---- */
function texts(q) {
  var entry = ANSWERS.filter(function (a) { return a.q === q; })[0];
  if (!entry) return "";
  return Object.keys(entry.modes).map(function (mode) {
    return entry.modes[mode].map(function (st) { return st.say || ""; }).join(" ");
  }).join("\n---\n");
}
function eachMode(q, name, fn) {
  var entry = ANSWERS.filter(function (a) { return a.q === q; })[0];
  if (!entry) return;
  Object.keys(entry.modes).forEach(function (mode) {
    var text = entry.modes[mode].map(function (st) { return st.say || ""; }).join(" ");
    check(name + " (" + mode + ")", fn(text), text.slice(0, 80) + "…");
  });
}

// Q1: Trump-era overall 2016 -> 2020, top drops in that window
var drop = function (i) { return D.HIST.s[i][2020 - y0] - D.HIST.s[i][2016 - y0]; };
var trumpDrops = D.INDICATORS.map(function (ind, i) {
  return D.HIST.s[i] ? { name: ind[0], d: drop(i) } : null;
}).filter(Boolean).sort(function (a, b) { return a.d - b.d; });
eachMode(chips[0], "Q1 states overall " + at(2016) + " -> " + at(2020), function (t) {
  return t.indexOf(String(at(2016))) !== -1 && t.indexOf(String(at(2020))) !== -1;
});
eachMode(chips[0], "Q1 states top-3 drop sizes " + trumpDrops.slice(0, 3).map(function (e) { return -e.d; }).join("/"), function (t) {
  return trumpDrops.slice(0, 3).every(function (e) { return t.indexOf(String(-e.d)) !== -1; });
});

// Q2: 2020 -> today deltas
var deltas = {};
D.INDICATORS.forEach(function (ind, i) {
  if (D.HIST.s[i]) deltas[ind[0]] = Math.round(ind[2] - D.HIST.s[i][N - 1]);
});
eachMode(chips[1], "Q2 states parties/press-group/parliament deltas " +
  [-deltas["Free political parties"], -deltas["Freedom of the press"], -deltas["Effective parliament"]].join("/"), function (t) {
  return t.indexOf("down " + -deltas["Free political parties"]) !== -1 &&
         t.indexOf(String(-deltas["Freedom of the press"])) !== -1 &&
         t.indexOf(String(-deltas["Effective parliament"])) !== -1;
});

// Q3: strongest era + peak + 1975/2020 symmetry
var best = eraAvg(2005, 2014);
eachMode(chips[2], "Q3 states 2005–2014 avg " + best.toFixed(1) + " and peak " + peak, function (t) {
  return t.indexOf(best.toFixed(1)) !== -1 && t.indexOf(String(peak)) !== -1;
});
eachMode(chips[2], "Q3 states 1975 = 2020 = " + at(1975), function (t) {
  return at(1975) === at(2020) && t.indexOf(String(at(1975))) !== -1;
});

// Q4: recovery hero
eachMode(chips[3], "Q4 states hero " + heroToday + " -> " + heroRecovery, function (t) {
  return t.indexOf(String(heroToday)) !== -1 && t.indexOf(String(heroRecovery)) !== -1;
});

// Q5: measured count (as a word or number)
var words = { 22: "Twenty-two" };
eachMode(chips[4], "Q5 states " + measured + " measured", function (t) {
  return t.indexOf(String(measured)) !== -1 || (words[measured] && t.indexOf(words[measured]) !== -1);
});

// Q6: effective parliament trajectory
var epPeak = Math.max.apply(null, eps);
var ep2020 = eps[N - 1];
var epFall = eps[2016 - y0] - ep2020;
var epToday = D.INDICATORS[epi][2];
eachMode(chips[5], "Q6 states parliament " + epPeak + " -> " + ep2020 + " (fall " + epFall + "), today " + epToday, function (t) {
  return [epPeak, ep2020, epFall, epToday].every(function (v) { return t.indexOf(String(v)) !== -1; });
});

console.log(fails === 0 ? "\nall answer checks passed" : "\n" + fails + " CHECK(S) FAILED");
process.exit(fails ? 1 : 0);
