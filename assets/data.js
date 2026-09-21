/* Thirty Indicators — data module.
   Everything editorial or measured lives here: the indicator framework, the
   illustrative "today" scores and lever anchors, and the measured US series
   (GSoD Indices v5.1, 1975-2020, x100 — see data/README.md for provenance).
   assets/app.js reads this via window.TI_DATA and contains no data of its own. */
(function () {
  "use strict";

  var DOMAINS = [
    { key: "g1", name: "Representation", full: "Representation" },
    { key: "g2", name: "Civil Liberties", full: "Civil Liberties" },
    { key: "g3", name: "Rights & Equality", full: "Rights & Equality" },
    { key: "g4", name: "Rule of Law", full: "Rule of Law" },
    { key: "g5", name: "Participation", full: "Participation" }
  ];

  var LEVERS = [
    { id: "electoral", name: "Electoral integrity & access", desc: "Election administration, voting access, fair competition between parties." },
    { id: "press", name: "Press freedom & expression", desc: "Safety of journalists, independent media, room for critical speech." },
    { id: "courts", name: "Judicial independence", desc: "Courts free of political pressure; rulings respected and enforced." },
    { id: "restraint", name: "Executive restraint", desc: "Self-limits on power: no punishing critics, respect for constraints." },
    { id: "integrity", name: "Transparency & anti-corruption", desc: "Open books, sanctioned misconduct, merit-based public service." },
    { id: "civic", name: "Civic engagement & cohesion", desc: "Participation, cross-party cooperation, tolerance for the other side." }
  ];

  /* Indicators adapted from International IDEA's Global State of Democracy framework.
     [name, domain index, baseline (illustrative "today"), weights per lever
      (electoral, press, courts, restraint, integrity, civic), flag, measured2020]
     flag 2 = at its lowest level since 1975 per the GSoD 2026 report; flag 1 = statistically
     significant decline 2020-2025 per the same report.
     measured2020 = the US point estimate from IDEA's GSoD Indices v5.1 dataset, year 2020,
     scaled x100 (null where the indicator was added in the 2023 framework revision and has
     no v5.1 equivalent; "Freedom of the press" maps to v5.1 "Media Integrity"). */
  var INDICATORS = [
    ["Credible elections",                     0, 66, [0.7, 0.1, 0.1, 0.1, 0.0, 0.0], 0, 79],
    ["Inclusive suffrage",                     0, 85, [0.8, 0.0, 0.1, 0.0, 0.0, 0.1], 0, 93],
    ["Free political parties",                 0, 74, [0.4, 0.2, 0.1, 0.3, 0.0, 0.0], 1, 92],
    ["Elected government holds real power",    0, 92, [0.6, 0.0, 0.2, 0.2, 0.0, 0.0], 0, 100],
    ["Effective parliament",                   0, 40, [0.2, 0.0, 0.1, 0.4, 0.1, 0.2], 2, 62],
    ["Local democracy",                        0, 78, [0.4, 0.0, 0.0, 0.2, 0.1, 0.3], 0, 86],

    ["Freedom of expression",                  1, 52, [0.0, 0.6, 0.1, 0.3, 0.0, 0.0], 2, 74],
    ["Freedom of the press",                   1, 50, [0.0, 0.8, 0.1, 0.2, 0.0, 0.0], 2, 80],
    ["Freedom of association & assembly",      1, 68, [0.0, 0.2, 0.2, 0.5, 0.0, 0.1], 0, 77],
    ["Freedom of religion",                    1, 60, [0.0, 0.1, 0.3, 0.2, 0.0, 0.2], 0, 66],
    ["Freedom of movement",                    1, 65, [0.0, 0.0, 0.3, 0.5, 0.0, 0.0], 0, 71],
    ["Personal integrity & security",          1, 55, [0.0, 0.1, 0.2, 0.4, 0.0, 0.3], 0, 62],

    ["Access to justice",                      2, 52, [0.0, 0.0, 0.6, 0.1, 0.2, 0.1], 2, 78],
    ["Basic welfare",                          2, 58, [0.0, 0.0, 0.0, 0.1, 0.4, 0.3], 0, 75],
    ["Political equality",                     2, 55, [0.4, 0.0, 0.2, 0.0, 0.1, 0.3], 0, null],
    ["Social group equality",                  2, 66, [0.1, 0.0, 0.3, 0.2, 0.0, 0.4], 0, 63],
    ["Gender equality",                        2, 70, [0.1, 0.0, 0.3, 0.0, 0.1, 0.3], 0, 74],
    ["Economic equality",                      2, 42, [0.0, 0.0, 0.0, 0.0, 0.4, 0.4], 2, null],

    ["Judicial independence",                  3, 52, [0.0, 0.0, 0.8, 0.2, 0.0, 0.0], 2, 80],
    ["Absence of corruption",                  3, 58, [0.0, 0.1, 0.2, 0.0, 0.7, 0.0], 0, 71],
    ["Predictable enforcement of laws",        3, 55, [0.0, 0.0, 0.5, 0.3, 0.2, 0.0], 0, 71],
    ["Executive complies with constitution",   3, 48, [0.0, 0.0, 0.4, 0.6, 0.0, 0.0], 0, null],
    ["Oversight of security forces",           3, 52, [0.0, 0.0, 0.2, 0.4, 0.3, 0.0], 0, null],
    ["Equal treatment before the law",         3, 50, [0.1, 0.0, 0.5, 0.3, 0.0, 0.0], 0, null],

    ["Electoral participation",                4, 58, [0.5, 0.0, 0.0, 0.0, 0.0, 0.5], 0, 62],
    ["Civil society participation",            4, 70, [0.0, 0.2, 0.0, 0.2, 0.0, 0.6], 0, 78],
    ["Everyday civic engagement",              4, 55, [0.0, 0.1, 0.0, 0.0, 0.0, 0.8], 0, null],
    ["Direct democracy tools",                 4, 8,  [0.3, 0.0, 0.0, 0.0, 0.0, 0.5], 0, 0],
    ["Shared factual public sphere",           4, 30, [0.0, 0.5, 0.0, 0.0, 0.1, 0.4], 0, null],
    ["Cross-party cooperation",                4, 25, [0.0, 0.0, 0.0, 0.1, 0.0, 0.9], 0, null]
  ];

  var SCALE = 0.7; /* points of indicator movement per weighted lever point */
  /* Where each arena stands today (0-100, illustrative, anchored to the report:
     press freedom and judicial independence at record lows, executive restraint
     weakest, election administration comparatively intact). Indicators respond
     to a lever's distance from ITS OWN today mark, not from 50. */
  var LEVER_TODAY = [55, 32, 38, 30, 42, 40];
  var PRESETS = {
    today:     LEVER_TODAY.slice(),
    backslide: [40, 18, 22, 15, 28, 25],
    recovery:  [75, 65, 68, 65, 70, 65]
  };
  var STATUS = [
    { min: 80, word: "Healthy",  color: "var(--status-good)" },
    { min: 65, word: "Stable",   color: "var(--status-good)" },
    { min: 50, word: "Strained", color: "var(--status-warning)" },
    { min: 35, word: "Eroding",  color: "var(--status-serious)" },
    { min: -1, word: "Critical", color: "var(--status-critical)" }
  ];

  var YEAR_MIN = 1975, YEAR_TODAY = 2026;

  /* ---------- History (US, GSoD Indices v5.1, 1975-2020, x100) ---------- */
  var HIST = {"y0":1975,"y1":2020,"s":{"0":[78,83,83,83,83,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,85,75,75,81,81,80,81,89,89,90,90,89,89,90,90,92,92,77,77,76,76,79],"1":[89,89,89,89,89,89,89,89,89,89,89,89,89,89,89,91,91,91,91,91,91,91,91,91,91,89,89,94,94,94,94,95,95,95,95,93,93,94,94,94,94,93,93,93,93,93],"2":[75,75,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,94,100,100,100,100,100,100,100,100,100,100,92,92,92,92,92],"3":[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100],"4":[78,77,76,76,76,76,75,75,75,75,75,75,75,75,75,75,75,76,76,76,77,77,77,77,77,77,77,77,77,77,77,77,77,77,78,78,78,78,78,78,78,78,69,65,63,62],"5":[78,78,78,78,78,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,88,83,85,85,85,83,94,94,94,94,94,94,94,94,94,94,94,94,88,86,86,86],"6":[82,84,81,84,84,84,84,84,84,84,84,84,84,84,84,88,86,88,88,88,88,88,88,88,88,88,88,86,88,90,90,90,90,90,90,90,90,90,90,90,90,89,75,74,72,74],"7":[85,85,85,85,85,85,86,86,85,85,86,85,85,85,85,85,85,85,84,84,84,84,84,84,84,86,84,84,84,84,84,84,85,85,87,86,86,86,86,86,86,85,79,79,78,80],"8":[78,78,78,78,78,84,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,83,79,83,90,90,90,92,92,84,84,77],"9":[79,79,79,79,79,79,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,80,71,71,71,71,71,71,80,80,80,80,80,80,80,80,79,70,66,66,66],"10":[91,91,91,91,91,91,88,88,88,88,88,93,93,93,93,93,93,93,93,93,93,93,93,93,93,93,86,86,86,86,86,86,86,86,86,86,86,90,90,90,90,90,83,84,84,71],"11":[62,62,62,62,62,63,68,68,68,68,67,67,67,67,67,70,68,68,69,69,69,69,69,69,69,69,64,61,59,52,54,54,55,61,63,63,63,63,64,64,62,62,64,62,62,62],"12":[82,82,82,82,82,82,82,82,81,82,82,82,81,81,81,82,82,82,82,82,83,83,82,83,82,83,83,83,83,83,83,83,83,83,83,82,83,82,79,79,79,76,76,76,76,78],"13":[60,60,60,60,63,63,63,63,63,64,66,66,67,67,67,67,67,67,67,70,70,70,70,70,70,70,71,71,71,71,71,71,74,74,75,75,75,75,75,75,75,75,75,75,75,75],"15":[61,61,61,61,61,62,62,62,61,62,61,61,61,61,61,63,66,66,66,66,66,66,66,66,66,69,68,68,68,68,68,67,67,67,69,69,69,69,69,69,69,68,68,68,64,63],"16":[52,52,52,52,52,60,59,59,59,61,61,61,61,61,62,64,64,65,66,66,66,66,66,66,66,71,71,71,71,71,72,72,72,72,75,75,75,75,75,75,75,74,72,73,72,74],"18":[78,78,78,78,78,78,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,79,80,80,80,79,79,79,79,79,79,79,80,80,80,84,84,84,84,82,84,84,80],"19":[76,76,76,76,76,78,73,73,73,74,74,74,76,76,79,79,79,79,79,79,79,78,78,78,78,78,78,77,78,78,79,78,78,78,79,79,79,82,81,81,82,78,67,67,70,71],"20":[76,77,77,77,77,77,77,77,77,78,78,78,78,78,78,78,78,78,80,80,80,81,81,81,81,81,81,81,81,81,81,81,81,81,82,82,82,82,79,79,79,80,71,71,69,71],"24":[38,57,57,37,37,57,57,40,40,58,58,36,36,56,56,37,37,60,60,39,39,53,53,35,35,53,53,35,35,57,57,37,37,57,57,39,39,54,54,33,33,56,56,47,47,62],"25":[79,79,79,79,79,79,77,77,77,77,77,77,77,77,77,81,81,81,86,86,86,86,86,86,86,86,81,81,81,81,81,81,81,86,86,91,91,91,91,91,91,85,80,75,75,78],"27":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}};

  var ELECTION_YEARS = [1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
  var MIDTERM_YEARS = [1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022];

  window.TI_DATA = {
    DOMAINS: DOMAINS, LEVERS: LEVERS, INDICATORS: INDICATORS,
    SCALE: SCALE, LEVER_TODAY: LEVER_TODAY, PRESETS: PRESETS, STATUS: STATUS,
    YEAR_MIN: YEAR_MIN, YEAR_TODAY: YEAR_TODAY, HIST: HIST,
    ELECTION_YEARS: ELECTION_YEARS, MIDTERM_YEARS: MIDTERM_YEARS
  };
})();
