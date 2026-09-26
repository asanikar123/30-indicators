/* Checks TI_DATA.TERMS (the timeline story cards) against the data:
   structure (contiguous 1975 -> today, one est chapter at the end) and
   every figure each note states, recomputed from HIST. Run after editing
   TERMS or data; add a check when a note states a new figure. */
"use strict";
var path = require("path");
global.window = {};
require(path.join(__dirname, "..", "assets/data.js"));
var D = window.TI_DATA;
var TERMS = D.TERMS;
var y0 = D.HIST.y0;

var fails = 0;
function check(name, ok, detail) {
  console.log((ok ? "ok  " : "FAIL") + "  " + name + (ok || !detail ? "" : "  [" + detail + "]"));
  if (!ok) fails++;
}

var keys = Object.keys(D.HIST.s);
var N = D.HIST.s[keys[0]].length;
var OVERALL = [];
for (var k = 0; k < N; k++) {
  var sum = 0;
  keys.forEach(function (key) { sum += D.HIST.s[key][k]; });
  OVERALL.push(Math.round(sum / keys.length));
}
function at(y) { return OVERALL[y - y0]; }
function series(re) {
  for (var i = 0; i < D.INDICATORS.length; i++) {
    if (re.test(D.INDICATORS[i][0]) && D.HIST.s[i]) return D.HIST.s[i];
  }
  return null;
}
function move(re, a, b) { var s = series(re); return s[b - y0] - s[a - y0]; }
function noteOf(i) { return TERMS[i].note; }
function has(i, figs) {
  return figs.every(function (f) { return noteOf(i).indexOf(String(f)) !== -1; });
}
var todayMean = Math.round(D.INDICATORS.reduce(function (a, ind) { return a + ind[2]; }, 0) / 30);

/* ---- structure ---- */
check("terms start at 1975 and end today", TERMS[0].from === D.YEAR_MIN && TERMS[TERMS.length - 1].to === D.YEAR_TODAY);
var contiguous = TERMS.every(function (t, i) { return i === 0 || TERMS[i - 1].to === t.from; });
check("chapters are contiguous", contiguous);
check("exactly one estimated chapter, last", TERMS.filter(function (t) { return t.est; }).length === 1 && TERMS[TERMS.length - 1].est === true);
TERMS.forEach(function (t) {
  check("note present and sized: " + t.who, typeof t.note === "string" && t.note.length > 40 && t.note.length < 340, String((t.note || "").length));
});

/* ---- per-chapter figures ---- */
// Ford: parties +19 in a year, turnout 38 -> 57
var parties = series(/political parties/i), part = series(/electoral participation/i);
check("Ford: parties jumped 19 in a year", parties[1977 - y0] - parties[1976 - y0] === 19 && has(0, [19]));
check("Ford: turnout 38 -> 57", part[1975 - y0] === 38 && part[1976 - y0] === 57 && has(0, [38, 57]));

// Carter: local democracy +10, gender +7 over 1977-81
check("Carter: local democracy +10", move(/local democracy/i, 1977, 1981) === 10 && has(1, [10]));
check("Carter: gender equality +7", move(/gender/i, 1977, 1981) === 7 && has(1, [7]));

// Reagan: two-point band 1981-89; corruption +6; movement +5
var band = OVERALL.slice(1981 - y0, 1989 - y0 + 1);
check("Reagan: overall inside a two-point band", Math.max.apply(null, band) - Math.min.apply(null, band) === 2 && /two-point band/.test(noteOf(2)));
check("Reagan: corruption +6, movement +5", move(/corruption/i, 1981, 1989) === 6 && move(/movement/i, 1981, 1989) === 5 && has(2, [6, 5]));

// GHW Bush: civil society +9, social group equality +5, climb to 77
check("GHWB: civil society +9, group equality +5", move(/civil society/i, 1989, 1993) === 9 && move(/social group/i, 1989, 1993) === 5 && has(3, [9, 5]));
var first77 = y0 + OVERALL.findIndex(function (v) { return v >= 77; });
check("GHWB: first climb to 77 falls in this chapter", at(1993) === 77 && first77 >= 1989 && first77 <= 1993 && has(3, [77]), String(first77));

// Clinton: credible elections 85 -> 75 in 2000
var cred = series(/credible/i);
check("Clinton: recount drop 10, 85 -> 75", cred[1999 - y0] === 85 && cred[2000 - y0] === 75 && has(4, [10, 85, 75]));

// GW Bush: rebuilt to 90 by 2008; era ends at 79, all-time peak
check("GWB: credible elections 90 by 2008", cred[2008 - y0] === 90 && has(5, [90]));
check("GWB: ends at 79 = all-time measured peak", at(2009) === 79 && Math.max.apply(null, OVERALL) === 79 && has(5, [79]));

// Obama: peaks 79 in 2009 and 2012-13; expression -14 (89 -> 75) into 2017
var expr = series(/expression/i);
check("Obama: 79 in 2009 and 2012-13", at(2009) === 79 && at(2012) === 79 && at(2013) === 79 && has(6, [79]));
check("Obama: expression 89 -> 75 crossing into 2017", expr[2016 - y0] === 89 && expr[2017 - y0] === 75 && has(6, [14, 89, 75]));

// Trump I: association -15, parliament -7, turnout 62 highest of record
check("Trump I: association -15, parliament -7", move(/association/i, 2017, 2020) === -15 && move(/effective parliament/i, 2017, 2020) === -7 && has(7, [15, 7]));
check("Trump I: 2020 turnout 62 = 50-year high", part[2020 - y0] === 62 && Math.max.apply(null, part) === 62 && has(7, [62]));

// Since 2020: calibrated 67, below every measured year
check("Since 2020: calibrated overall = 67 stated", todayMean === 67 && has(8, [67]), String(todayMean));
check("Since 2020: 67 below the measured floor", todayMean < Math.min.apply(null, OVERALL), todayMean + " vs " + Math.min.apply(null, OVERALL));

console.log(fails === 0 ? "\nall term-card checks passed" : "\n" + fails + " CHECK(S) FAILED");
process.exit(fails ? 1 : 0);
