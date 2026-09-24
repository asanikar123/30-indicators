(function () {
  "use strict";

  /* All datasets and tunable constants live in assets/data.js (window.TI_DATA). */
  var D = window.TI_DATA;
  var DOMAINS = D.DOMAINS, LEVERS = D.LEVERS, INDICATORS = D.INDICATORS,
      SCALE = D.SCALE, LEVER_TODAY = D.LEVER_TODAY, PRESETS = D.PRESETS,
      STATUS = D.STATUS, YEAR_MIN = D.YEAR_MIN, YEAR_TODAY = D.YEAR_TODAY,
      HIST = D.HIST, ELECTION_YEARS = D.ELECTION_YEARS, MIDTERM_YEARS = D.MIDTERM_YEARS;





  var leverValues = PRESETS.today.slice();
  var baselineMean = mean(INDICATORS.map(function (d) { return d[2]; }));
  var currentYear = YEAR_TODAY;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function mean(arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length; }

  function scoreOf(ind) {
    var delta = 0;
    for (var j = 0; j < LEVERS.length; j++) {
      delta += ind[3][j] * (leverValues[j] - LEVER_TODAY[j]) * SCALE;
    }
    return clamp(ind[2] + delta, 2, 98);
  }

  /* Where a lever "stood" in a past year: the w-weighted mean of the measured
     indicators it drives (bridged toward its today anchor for 2021-2025), so
     the locked sliders travel through history during playback. */
  function leverHistValue(j, year) {
    var num = 0, den = 0;
    INDICATORS.forEach(function (ind, i) {
      var w = ind[3][j];
      if (!w || !HIST.s[i]) return;
      num += w * HIST.s[i][Math.min(year, HIST.y1) - HIST.y0];
      den += w;
    });
    var proxy = den ? num / den : LEVER_TODAY[j];
    if (year <= HIST.y1) return Math.round(proxy);
    var t = (year - HIST.y1) / (YEAR_TODAY - HIST.y1);
    return Math.round(proxy + (LEVER_TODAY[j] - proxy) * t);
  }

  /* The value a column shows for the current year: lever-driven today,
     measured 1975-2020, and a linear bridge from the 2020 measurement to
     today's illustrative baseline for 2021-2025. Null = no data that year. */
  function displayedValue(i) {
    var ind = INDICATORS[i];
    if (currentYear === YEAR_TODAY) return scoreOf(ind);
    var s = HIST.s[i];
    if (!s) return null;
    if (currentYear <= HIST.y1) return s[currentYear - HIST.y0];
    var t = (currentYear - HIST.y1) / (YEAR_TODAY - HIST.y1);
    var last = s[s.length - 1];
    return Math.round(last + (ind[2] - last) * t);
  }

  /* ---------- Build gridlines ---------- */
  var plot = document.getElementById("plot");
  [0, 25, 50, 75, 100].forEach(function (v) {
    var line = document.createElement("div");
    line.className = "gridline" + (v === 0 ? " zero" : "");
    line.style.bottom = v + "%";
    var lab = document.createElement("span");
    lab.className = "grid-label";
    lab.textContent = v;
    line.appendChild(lab);
    plot.appendChild(line);
  });

  /* ---------- Build bars ---------- */
  var barsRoot = document.getElementById("bars");
  var barEls = [];
  DOMAINS.forEach(function (dom, gi) {
    var group = document.createElement("div");
    group.className = "group " + dom.key;
    INDICATORS.forEach(function (ind, i) {
      if (ind[1] !== gi) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bar " + dom.key;
      b.dataset.index = i;
      var fill = document.createElement("div");
      fill.className = "bar-fill";
      b.appendChild(fill);
      if (ind[5] !== null) {
        var tick = document.createElement("div");
        tick.className = "base-tick";
        tick.style.bottom = ind[5] + "%";
        tick.dataset.tipTitle = "Dotted line · measured 2020: " + ind[5];
        tick.dataset.tipBody = "The last year with real data (GSoD Indices v5.1).";
        b.appendChild(tick);
      }
      if (ind[4] === 2) {
        var flag = document.createElement("span");
        flag.className = "low-flag";
        flag.textContent = "▼";
        flag.dataset.tipTitle = "▼ At a NEW 50-year low";
        flag.dataset.tipBody = "The 2026 report puts this indicator below its previous 1975–2020 floor (the red line).";
        b.appendChild(flag);
      }
      group.appendChild(b);
      barEls[i] = b;
    });
    barsRoot.appendChild(group);
  });

  var meanLine = document.createElement("div");
  meanLine.className = "mean-line";
  var meanLabel = document.createElement("span");
  meanLabel.className = "mean-label";
  meanLine.appendChild(meanLabel);
  plot.appendChild(meanLine);

  var groupLabels = document.getElementById("groupLabels");
  DOMAINS.forEach(function (dom, gi) {
    var s = document.createElement("span");
    var sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = "var(--dom-" + (gi + 1) + ")";
    s.appendChild(sw);
    s.appendChild(document.createTextNode(dom.name));
    groupLabels.appendChild(s);
  });

  /* ---------- Tooltip ---------- */
  var tooltip = document.getElementById("tooltip");
  var chartInner = document.getElementById("chartInner");
  function showTip(barEl) {
    var i = +barEl.dataset.index;
    var ind = INDICATORS[i];
    var score = displayedValue(i);
    var isToday = currentYear === YEAR_TODAY;
    tooltip.innerHTML = "";
    var name = document.createElement("div"); name.className = "t-name"; name.textContent = ind[0];
    var dom = document.createElement("div"); dom.className = "t-domain"; dom.textContent = DOMAINS[ind[1]].full;
    var val = document.createElement("div"); val.className = "t-val";
    if (score === null) {
      val.textContent = "No data for " + currentYear + " (added in the 2023 framework)";
    } else if (isToday) {
      var d = score - ind[2];
      var deltaTxt = Math.abs(d) < 0.5 ? "unchanged" :
        (d > 0 ? "+" : "−") + Math.abs(d).toFixed(0) + " from start";
      val.textContent = score.toFixed(0) + " / 100 · " + deltaTxt;
    } else {
      val.textContent = currentYear + ": " + score.toFixed(0) + " / 100 " +
        (currentYear <= HIST.y1 ? "(measured)" : "(estimated)");
    }
    tooltip.appendChild(name); tooltip.appendChild(dom); tooltip.appendChild(val);
    if (isToday && ind[5] !== null) {
      var measured = document.createElement("div");
      measured.className = "t-domain";
      measured.textContent = "Measured 2020: " + ind[5] + " (GSoD Indices v5.1)";
      tooltip.appendChild(measured);
    }
    if (HIST.s[i]) {
      var lows = HIST.s[i];
      var lowVal = Math.min.apply(null, lows);
      var lowNote = document.createElement("div");
      lowNote.className = "t-domain";
      lowNote.textContent = (ind[4] === 2 ? "Previous low (red line): " : "Lowest measured 1975–2020: ") +
        lowVal + " (in " + (HIST.y0 + lows.indexOf(lowVal)) + ")";
      tooltip.appendChild(lowNote);
    }
    if (isToday && ind[4]) {
      var flagNote = document.createElement("div");
      flagNote.className = "t-domain";
      flagNote.textContent = ind[4] === 2
        ? "▼ Report: at a NEW 50-year low, below its previous floor (red line)"
        : "Report: significant decline, 2020–2025";
      tooltip.appendChild(flagNote);
    }
    tooltip.hidden = false;
    var barRect = barEl.getBoundingClientRect();
    var innerRect = chartInner.getBoundingClientRect();
    var tipW = tooltip.offsetWidth;
    var x = barRect.left - innerRect.left + barRect.width / 2 - tipW / 2;
    x = clamp(x, 0, innerRect.width - tipW);
    var fillH = ((score === null ? 0 : score) / 100) * barEl.offsetHeight;
    var y = barRect.bottom - innerRect.top - fillH - tooltip.offsetHeight - 8;
    tooltip.style.left = x + "px";
    tooltip.style.top = Math.max(y, 0) + "px";
  }
  function hideTip() { tooltip.hidden = true; }
  /* Instant styled tooltip for the marks (dotted 2020, red previous-low, ▼ flag) */
  function showMarkTip(mark) {
    /* Marks that sit within a few pixels of each other (on ▼ columns the dotted
       2020 line and the red previous-low line can coincide exactly) share one
       combined tooltip listing every clustered mark. */
    var marks = [mark];
    var bar = mark.closest(".bar");
    if (bar) {
      var myRect = mark.getBoundingClientRect();
      var myC = (myRect.top + myRect.bottom) / 2;
      bar.querySelectorAll(".base-tick, .lowest-tick, .low-flag").forEach(function (m) {
        if (m === mark) return;
        var r = m.getBoundingClientRect();
        if (Math.abs((r.top + r.bottom) / 2 - myC) <= 14) marks.push(m);
      });
      marks.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
    }
    tooltip.innerHTML = "";
    marks.forEach(function (m, k) {
      var name = document.createElement("div");
      name.className = "t-name";
      if (k > 0) name.style.marginTop = "5px";
      name.textContent = m.dataset.tipTitle || "";
      tooltip.appendChild(name);
      if ((marks.length === 1 || m === mark) && m.dataset.tipBody) {
        var body = document.createElement("div");
        body.className = "t-domain";
        body.textContent = m.dataset.tipBody;
        tooltip.appendChild(body);
      }
    });
    tooltip.hidden = false;
    var mRect = mark.getBoundingClientRect();
    var innerRect = chartInner.getBoundingClientRect();
    var tipW = tooltip.offsetWidth;
    var x = clamp(mRect.left - innerRect.left + mRect.width / 2 - tipW / 2, 0, innerRect.width - tipW);
    var y = mRect.top - innerRect.top - tooltip.offsetHeight - 6;
    tooltip.style.left = x + "px";
    tooltip.style.top = Math.max(y, 0) + "px";
  }
  /* Tooltip only while the pointer is over the filled part of the column
     (plus a small grace zone), not the empty space above it. */
  var tipBar = null;
  barsRoot.addEventListener("mousemove", function (e) {
    var mark = e.target.closest(".base-tick, .lowest-tick, .low-flag");
    if (mark) {
      if (tipBar !== mark) { tipBar = mark; showMarkTip(mark); }
      return;
    }
    var bar = e.target.closest(".bar");
    var want = null;
    if (bar) {
      var rect = bar.getBoundingClientRect();
      var fill = bar.querySelector(".bar-fill");
      var fillH = fill ? fill.offsetHeight : 0;
      if (e.clientY >= rect.bottom - fillH - 14) want = bar;
    }
    if (want !== tipBar) {
      tipBar = want;
      if (want) showTip(want); else hideTip();
    }
  });
  barsRoot.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".bar")) {
      tipBar = null;
      hideTip();
    }
  });
  barsRoot.addEventListener("focusin", function (e) {
    var bar = e.target.closest(".bar");
    if (bar) showTip(bar);
  });
  barsRoot.addEventListener("focusout", hideTip);

  /* ---------- Levers ---------- */
  var leverGrid = document.getElementById("leverGrid");
  var leverInputs = [];
  var leverValEls = [];
  LEVERS.forEach(function (lv, j) {
    var card = document.createElement("div");
    card.className = "lever";
    card.dataset.lever = j;
    var top = document.createElement("div");
    top.className = "lever-top";
    var label = document.createElement("label");
    label.htmlFor = "lever-" + lv.id;
    label.textContent = lv.name;
    var valEl = document.createElement("span");
    valEl.className = "lever-value";
    valEl.id = "lever-" + lv.id + "-value";
    top.appendChild(label); top.appendChild(valEl);
    var input = document.createElement("input");
    input.type = "range";
    input.min = "0"; input.max = "100"; input.step = "1";
    input.value = leverValues[j];
    input.id = "lever-" + lv.id;
    input.title = lv.desc;
    card.title = lv.desc;
    var wrap = document.createElement("div");
    wrap.className = "slider-wrap";
    var mark = document.createElement("span");
    mark.className = "today-mark";
    /* Track padding ~8px each side around the thumb travel. */
    mark.style.left = "calc((100% - 16px) * " + (LEVER_TODAY[j] / 100).toFixed(3) + " + 8px)";
    wrap.appendChild(input);
    wrap.appendChild(mark);
    card.appendChild(top); card.appendChild(wrap);
    leverGrid.appendChild(card);
    leverInputs[j] = input;
    leverValEls[j] = valEl;
    input.addEventListener("input", function () {
      leverValues[j] = +input.value;
      clearPresetHighlight();
      scheduleRender();
    });
  });

  /* Hovering (or focusing) a lever spotlights the indicators it drives,
     with intensity proportional to the coupling weight. */
  function spotlight(j) {
    INDICATORS.forEach(function (ind, i) {
      var w = ind[3][j];
      barEls[i].style.opacity = w ? Math.min(1, 0.72 + 0.31 * w) : 0.07;
    });
  }
  function unspotlight() {
    barEls.forEach(function (bar) { bar.style.opacity = ""; });
  }
  leverGrid.addEventListener("mouseover", function (e) {
    var card = e.target.closest(".lever");
    if (card) spotlight(+card.dataset.lever);
  });
  leverGrid.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(".lever")) unspotlight();
  });
  leverGrid.addEventListener("focusin", function (e) {
    var card = e.target.closest(".lever");
    if (card) spotlight(+card.dataset.lever);
  });
  leverGrid.addEventListener("focusout", unspotlight);

  /* ---------- Presets ---------- */
  var presetsRoot = document.getElementById("presets");
  var scenarioCap = document.getElementById("scenarioCap");
  var SCENARIO_CAPTIONS = {
    today: "Sept 2026 · where the report places the U.S.",
    backslide: "If the erosion of the last decade continues",
    recovery: "If reforms reverse the decline"
  };
  function clearPresetHighlight() {
    presetsRoot.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
    });
    scenarioCap.textContent = "Custom · set with the levers below";
  }
  presetsRoot.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-preset]");
    if (!btn) return;
    var vals = PRESETS[btn.dataset.preset];
    leverValues = vals.slice();
    leverInputs.forEach(function (input, j) { input.value = vals[j]; });
    clearPresetHighlight();
    btn.setAttribute("aria-pressed", "true");
    scenarioCap.textContent = SCENARIO_CAPTIONS[btn.dataset.preset];
    render();
  });

  /* ---------- Dialogs ---------- */
  document.querySelectorAll("[data-open-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var dlg = document.getElementById(btn.dataset.openDialog);
      if (dlg && !dlg.open) dlg.showModal();
      if (dlg && dlg.id === "tableDialog" && tableDirty) updateTable();
    });
  });
  document.querySelectorAll("dialog").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) dlg.close();
    });
    dlg.querySelectorAll("[data-close-dialog]").forEach(function (btn) {
      btn.addEventListener("click", function () { dlg.close(); });
    });
  });


  /* Measured overall index: per-year mean of the 22 indicators with v5.1 series. */
  var OVERALL = (function () {
    var keys = Object.keys(HIST.s);
    var n = HIST.s[keys[0]].length;
    var out = [];
    for (var k = 0; k < n; k++) {
      var sum = 0;
      keys.forEach(function (key) { sum += HIST.s[key][k]; });
      out.push(Math.round(sum / keys.length));
    }
    return out;
  })();
  function getSeries(idx) { return idx === -1 ? OVERALL : HIST.s[idx]; }
  function getIndName(idx) { return idx === -1 ? "Overall health index" : INDICATORS[idx][0]; }
  function getColor(idx) { return idx === -1 ? "var(--accent)" : "var(--dom-" + (INDICATORS[idx][1] + 1) + ")"; }

  var sparkDot = null, sparkVal = null, sparkYpx = null, sparkTailEl = null;
  /* The spark spans the slider's full 1975->today domain: measured values as a
     solid line to 2020, then a dashed tail to the live index (clamped into the
     measured band when a scenario pushes past it; the chip shows the true value). */
  function buildSpark() {
    var el = document.getElementById("heroSpark");
    sparkDot = document.getElementById("sparkDot");
    sparkVal = document.getElementById("sparkVal");
    if (!el || !sparkDot) return;
    var vMin = Math.min(Math.min.apply(null, OVERALL), Math.round(baselineMean));
    var vMax = Math.max(Math.max.apply(null, OVERALL), Math.round(baselineMean));
    var lo = vMin - 4, hi = vMax + 4;
    sparkYpx = function (v, boxH) {
      var c = Math.max(lo, Math.min(hi, v));
      return boxH - 3 - (c - lo) / (hi - lo) * (boxH - 6);
    };
    var span = YEAR_TODAY - HIST.y0;
    var d = OVERALL.map(function (v, k) {
      return (k ? "L" : "M") + (k / span * 1020).toFixed(1) + " " + sparkYpx(v, 64).toFixed(1);
    }).join(" ");
    el.appendChild(svgEl("path", { d: d }));
    sparkTailEl = svgEl("path", { "class": "spark-tail" });
    el.appendChild(sparkTailEl);
    document.getElementById("sparkHi").textContent = vMax;
    document.getElementById("sparkLo").textContent = vMin;
  }

  function clearTimelineMarks() {
    var el = document.getElementById("heroSpark");
    if (!el) return;
    el.querySelectorAll(".spark-mark").forEach(function (m) { m.remove(); });
    el.parentNode.querySelectorAll(".spark-mark-dot").forEach(function (m) { m.remove(); });
  }
  /* subtle=true draws faint midterm-style lines without dots */
  function drawTimelineMarks(years, subtle) {
    var el = document.getElementById("heroSpark");
    if (!el) return 0;
    var box = el.parentNode;
    var span = YEAR_TODAY - HIST.y0;
    var boxH = box.offsetHeight || 64;
    var n = 0;
    (Array.isArray(years) ? years : []).slice(0, 30).forEach(function (yr) {
      yr = Math.round(Number(yr));
      if (!(yr >= HIST.y0 && yr <= YEAR_TODAY)) return;
      var frac = (yr - HIST.y0) / span;
      var x = (frac * 1020).toFixed(1);
      el.appendChild(svgEl("line", { x1: x, x2: x, y1: 0, y2: 64,
        "class": subtle ? "spark-mark spark-mark-mid" : "spark-mark" }));
      /* a dot on the trace itself for measured years, so the marker reads at a glance */
      if (!subtle && yr <= HIST.y1 && sparkYpx) {
        var dot = document.createElement("div");
        dot.className = "spark-mark-dot";
        dot.style.left = (frac * 100) + "%";
        dot.style.top = (sparkYpx(OVERALL[yr - HIST.y0], boxH) / boxH * 100) + "%";
        box.appendChild(dot);
      }
      n++;
    });
    return n;
  }
  function setTimelineMarks(years) {
    clearTimelineMarks();
    return drawTimelineMarks(years, false);
  }

  var historyPanel = document.getElementById("historyPanel");
  var historyTitle = document.getElementById("historyTitle");
  var historyBody = document.getElementById("historyBody");
  document.getElementById("historyClose").addEventListener("click", function () {
    historyPanel.hidden = true;
  });
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  barsRoot.addEventListener("click", function (e) {
    var bar = e.target.closest(".bar");
    if (bar) openHistory(+bar.dataset.index);
  });

  function openHistory(i) {
    var ind = i === -1 ? null : INDICATORS[i];
    var series = getSeries(i);
    historyTitle.textContent = getIndName(i);
    historyBody.innerHTML = "";
    if (!series) {
      var p = document.createElement("p");
      p.textContent = "No historical series exists for this indicator: it was added in IDEA's 2023 framework revision, and the public v5.1 dataset (1975–2020) predates it.";
      historyBody.appendChild(p);
    } else {
      historyBody.appendChild(buildHistoryChart(series, i,
        { W: 316, H: 210, L: 26, R: 308, T: 12, B: 178, years: [1975, 1995, 2015] }));
      var note = document.createElement("p");
      note.className = "history-note";
      note.textContent = "United States, " + HIST.y0 + "–" + HIST.y1 +
        ", measured by International IDEA (GSoD Indices v5.1); 0–1 scores shown ×100. Hover for year-by-year values." +
        (i === 24 ? " The sawtooth is real: turnout alternates between presidential and midterm years." : "") +
        (i === -1 ? " This is the mean of the 22 indicators with measured series." : "");
      historyBody.appendChild(note);
      if (ind && ind[4]) {
        var fp = document.createElement("p");
        fp.className = "history-note";
        fp.textContent = ind[4] === 2
          ? "▼ The 2026 report finds this indicator has since fallen to its lowest level in the dataset's history."
          : "The 2026 report finds a statistically significant decline in this indicator since 2020.";
        historyBody.appendChild(fp);
      }
    }
    historyPanel.hidden = false;
  }

  /* Zoom a line chart's y-axis to the data so trends stay legible; the axis
     labels keep the real 0-100 values honest. */
  function yRangeOf(seriesList) {
    var vMin = 100, vMax = 0;
    seriesList.forEach(function (s) {
      s.forEach(function (v) { if (v < vMin) vMin = v; if (v > vMax) vMax = v; });
    });
    var lo = Math.max(0, Math.floor((vMin - 6) / 10) * 10);
    var hi = Math.min(100, Math.ceil((vMax + 6) / 10) * 10);
    if (hi - lo < 20) { lo = Math.max(0, lo - 10); hi = Math.min(100, hi + 10); }
    var mid = Math.round((lo + hi) / 2 / 5) * 5;
    return { lo: lo, hi: hi, ticks: mid > lo && mid < hi ? [lo, mid, hi] : [lo, hi] };
  }

  function buildHistoryChart(series, idx, dims) {
    var W = dims ? dims.W : 660, H = dims ? dims.H : 250, L = dims ? dims.L : 30,
        R = dims ? dims.R : 646, T = dims ? dims.T : 14, B = dims ? dims.B : 222;
    var yearTicks = dims ? dims.years : [1975, 1985, 1995, 2005, 2015];
    var y0 = dims && dims.y0 != null ? dims.y0 : HIST.y0;
    var n = series.length;
    var xAt = function (k) { return L + (R - L) * k / (n - 1); };
    var range = yRangeOf([series]);
    var yAt = function (v) { return B - (B - T) * (v - range.lo) / (range.hi - range.lo); };
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, "class": "history-svg", role: "img" });
    svg.setAttribute("aria-label", getIndName(idx) + ", United States, " + y0 + " to " + (y0 + n - 1) +
      ". Ends at " + series[n - 1] + " out of 100.");
    range.ticks.forEach(function (v) {
      svg.appendChild(svgEl("line", { x1: L, x2: R, y1: yAt(v), y2: yAt(v), "class": v === 0 ? "h-grid h-zero" : "h-grid" }));
      var t = svgEl("text", { x: L - 6, y: yAt(v) + 3, "text-anchor": "end", "class": "h-axis" });
      t.textContent = v; svg.appendChild(t);
    });
    yearTicks.forEach(function (yr) {
      var x = xAt(yr - y0);
      var anchor = x > R - 14 ? "end" : x < L + 14 ? "start" : "middle";
      var t = svgEl("text", { x: x, y: B + 14, "text-anchor": anchor, "class": "h-axis" });
      t.textContent = yr; svg.appendChild(t);
    });
    (dims && dims.marks ? dims.marks : []).forEach(function (yr) {
      var k = yr - y0;
      if (k < 0 || k > n - 1) return;
      svg.appendChild(svgEl("line", { x1: xAt(k), x2: xAt(k), y1: T, y2: B, "class": "h-mark" }));
    });
    var color = getColor(idx);
    var d = series.map(function (v, k) { return (k ? "L" : "M") + xAt(k).toFixed(1) + " " + yAt(v).toFixed(1); }).join(" ");
    var path = svgEl("path", { d: d, "class": "h-line" });
    path.style.stroke = color;
    svg.appendChild(path);
    var end = svgEl("circle", { cx: xAt(n - 1), cy: yAt(series[n - 1]), r: 3.5 });
    end.style.fill = color;
    svg.appendChild(end);
    var endLab = svgEl("text", { x: R, y: Math.max(yAt(series[n - 1]) - 9, T + 9), "text-anchor": "end", "class": "h-hlabel" });
    endLab.textContent = (y0 + n - 1) + ": " + series[n - 1];
    svg.appendChild(endLab);
    var guide = svgEl("line", { y1: T, y2: B, "class": "h-guide", visibility: "hidden" });
    var dot = svgEl("circle", { r: 3.5, visibility: "hidden" });
    dot.style.fill = color;
    var hlab = svgEl("text", { "class": "h-hlabel", "text-anchor": "middle", visibility: "hidden" });
    svg.appendChild(guide); svg.appendChild(dot); svg.appendChild(hlab);
    svg.addEventListener("mousemove", function (e) {
      var rect = svg.getBoundingClientRect();
      var vx = (e.clientX - rect.left) / rect.width * W;
      var k = Math.max(0, Math.min(n - 1, Math.round((vx - L) / (R - L) * (n - 1))));
      var x = xAt(k), y = yAt(series[k]);
      guide.setAttribute("x1", x); guide.setAttribute("x2", x); guide.setAttribute("visibility", "visible");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("visibility", "visible");
      hlab.setAttribute("x", Math.min(Math.max(x, L + 42), R - 42));
      hlab.setAttribute("y", Math.max(y - 10, T + 10));
      hlab.setAttribute("visibility", "visible");
      hlab.textContent = (y0 + k) + " · " + series[k];
      endLab.setAttribute("visibility", "hidden");
    });
    svg.addEventListener("mouseleave", function () {
      guide.setAttribute("visibility", "hidden");
      dot.setAttribute("visibility", "hidden");
      hlab.setAttribute("visibility", "hidden");
      endLab.setAttribute("visibility", "visible");
    });
    return svg;
  }

  /* ---------- Table ---------- */
  var tableBody = document.getElementById("tableBody");
  var tableCells = [];
  INDICATORS.forEach(function (ind, i) {
    var tr = document.createElement("tr");
    var tdName = document.createElement("td");
    var sw = document.createElement("span");
    sw.className = "row-swatch";
    sw.style.background = "var(--dom-" + (ind[1] + 1) + ")";
    tdName.appendChild(sw);
    tdName.appendChild(document.createTextNode(ind[0]));
    if (ind[4]) {
      var tag = document.createElement("span");
      tag.className = ind[4] === 2 ? "delta-down" : "";
      tag.style.fontSize = "11px";
      tag.textContent = ind[4] === 2 ? " ▼ 50-yr low" : " ↓ declining";
      tdName.appendChild(tag);
    }
    var tdDom = document.createElement("td");
    tdDom.textContent = DOMAINS[ind[1]].name;
    var tdMeasured = document.createElement("td");
    tdMeasured.className = "num";
    tdMeasured.textContent = ind[5] === null ? "–" : ind[5];
    var tdBase = document.createElement("td");
    tdBase.className = "num";
    tdBase.textContent = ind[2];
    var tdNow = document.createElement("td");
    tdNow.className = "num";
    var tdDelta = document.createElement("td");
    tdDelta.className = "num";
    tr.appendChild(tdName); tr.appendChild(tdDom); tr.appendChild(tdMeasured);
    tr.appendChild(tdBase); tr.appendChild(tdNow); tr.appendChild(tdDelta);
    tableBody.appendChild(tr);
    tableCells[i] = { now: tdNow, delta: tdDelta };
  });

  /* ---------- Render ---------- */
  var heroValue = document.getElementById("heroValue");
  var heroYearLabel = document.getElementById("heroYearLabel");
  var heroWord = document.getElementById("heroWord");
  var heroDot = document.getElementById("heroDot");
  var heroDelta = document.getElementById("heroDelta");

  function render() {
    var isToday = currentYear === YEAR_TODAY;
    var displayed = INDICATORS.map(function (_, i) { return displayedValue(i); });
    document.body.classList.toggle("time-past", !isToday);
    leversSection.classList.toggle("time-locked", !isToday);
    timeNote.hidden = isToday;

    INDICATORS.forEach(function (ind, i) {
      var bar = barEls[i];
      var v = displayed[i];
      var noData = v === null;
      bar.classList.toggle("no-data", noData);
      bar.querySelector(".bar-fill").style.height = (noData ? 0 : v) + "%";
      var flagEl = bar.querySelector(".low-flag");
      if (flagEl && !noData) flagEl.style.bottom = "calc(" + v + "% + 4px)";
      if (noData) {
        bar.setAttribute("aria-label",
          ind[0] + " (" + DOMAINS[ind[1]].full + "): no data for " + currentYear +
          "; the indicator was added in the 2023 framework");
      } else if (isToday) {
        var d = v - ind[2];
        var deltaTxt = Math.abs(d) < 0.5 ? "" :
          ", " + (d > 0 ? "up " : "down ") + Math.abs(d).toFixed(0) + " from its start of " + ind[2];
        var flagTxt = ind[4] === 2 ? ". The report puts it at its lowest level since 1975" :
          ind[4] === 1 ? ". The report finds a significant decline since 2020" : "";
        bar.setAttribute("aria-label",
          ind[0] + " (" + DOMAINS[ind[1]].full + "): " + v.toFixed(0) + " out of 100" + deltaTxt + flagTxt);
      } else {
        bar.setAttribute("aria-label",
          ind[0] + " (" + DOMAINS[ind[1]].full + "), " + currentYear + ": " + v.toFixed(0) +
          " out of 100" + (currentYear <= HIST.y1 ? ", measured" : ", estimated"));
      }
    });

    var vals = displayed.filter(function (v) { return v !== null; });
    var m = mean(vals);
    heroValue.textContent = m.toFixed(0);
    heroYearLabel.textContent = "Overall index · " + (isToday ? "2026" : currentYear);
    meanLine.style.bottom = m + "%";
    meanLabel.textContent = "overall " + m.toFixed(0);
    var st = STATUS.find(function (s) { return m >= s.min; });
    heroWord.textContent = st.word;
    heroDot.style.background = st.color;
    if (isToday) {
      var d3 = m - baselineMean;
      heroDelta.textContent = Math.abs(d3) < 0.5 ? "" :
        (d3 > 0 ? "▲ +" : "▼ −") + Math.abs(d3).toFixed(1) + " vs start";
    } else {
      heroDelta.textContent = currentYear <= HIST.y1 ? "measured · GSoD v5.1" : "estimated";
    }

    LEVERS.forEach(function (lv, j) {
      var shown = isToday ? leverValues[j] : leverHistValue(j, currentYear);
      leverInputs[j].value = shown;
      leverInputs[j].style.setProperty("--fill", shown + "%");
      leverValEls[j].textContent = shown;
    });

    if (sparkDot && sparkYpx) {
      var boxH = sparkDot.parentNode.offsetHeight || 56;
      var span = YEAR_TODAY - HIST.y0;
      var todayM = mean(INDICATORS.map(scoreOf));
      var v2020 = OVERALL[OVERALL.length - 1];
      if (sparkTailEl) {
        sparkTailEl.setAttribute("d",
          "M " + ((HIST.y1 - HIST.y0) / span * 1020).toFixed(1) + " " + sparkYpx(v2020, 64).toFixed(1) +
          " L 1020 " + sparkYpx(todayM, 64).toFixed(1));
      }
      var pct, yv, ypx;
      if (currentYear <= HIST.y1) {
        pct = (currentYear - HIST.y0) / span * 100;
        yv = OVERALL[currentYear - HIST.y0];
        ypx = sparkYpx(yv, boxH);
      } else {
        var tt = (currentYear - HIST.y1) / (YEAR_TODAY - HIST.y1);
        pct = ((HIST.y1 - HIST.y0) + tt * (YEAR_TODAY - HIST.y1)) / span * 100;
        yv = m;
        var y20r = sparkYpx(v2020, boxH);
        ypx = y20r + (sparkYpx(todayM, boxH) - y20r) * tt;
      }
      sparkDot.style.left = pct + "%";
      sparkDot.style.top = ypx + "px";
      if (sparkVal) {
        sparkVal.textContent = Math.round(yv);
        if (pct > 88) {
          sparkVal.style.left = "auto";
          sparkVal.style.right = "0";
          sparkVal.style.transform = "none";
        } else {
          sparkVal.style.right = "auto";
          sparkVal.style.left = pct + "%";
          sparkVal.style.transform = "translateX(-50%)";
        }
        sparkVal.style.top = (ypx < 18 ? ypx + 7 : ypx - 18) + "px";
      }
    }
    yearSlider.style.setProperty("--fill",
      ((currentYear - YEAR_MIN) / (YEAR_TODAY - YEAR_MIN) * 100) + "%");

    lastDisplayed = displayed;
    lastIsToday = isToday;
    if (tableDialogEl.open) updateTable();
    else tableDirty = true;
  }

  /* The table lives in a dialog that is closed almost all the time, so its 30
     rows refresh only when visible; renders from continuous input coalesce to
     one per animation frame. */
  var tableDirty = true, lastDisplayed = null, lastIsToday = true;
  var tableDialogEl = document.getElementById("tableDialog");

  function updateTable() {
    tableDirty = false;
    if (!lastDisplayed) return;
    INDICATORS.forEach(function (ind, i) {
      var v = lastDisplayed[i];
      var cells = tableCells[i];
      var noData = v === null;
      cells.now.textContent = noData ? "–" : v.toFixed(0);
      if (!lastIsToday || noData || Math.abs(v - ind[2]) < 0.5) {
        cells.delta.textContent = "–";
      } else {
        var d2 = v - ind[2];
        cells.delta.innerHTML = "";
        var span = document.createElement("span");
        span.className = d2 > 0 ? "delta-up" : "delta-down";
        span.textContent = (d2 > 0 ? "▲ +" : "▼ −") + Math.abs(d2).toFixed(0);
        cells.delta.appendChild(span);
      }
    });
  }

  var renderQueued = false;
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      render();
    });
  }

  /* ---------- Year slider & playback ---------- */
  var leversSection = document.getElementById("leversSection");
  var timeNote = document.getElementById("timeNote");
  var yearSlider = document.getElementById("yearSlider");
  var playBtn = document.getElementById("playBtn");
  var playTimer = null;

  function setYear(y, fromSlider) {
    currentYear = y;
    if (!fromSlider) yearSlider.value = y;
    scheduleRender();
  }
  var PLAY_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>';
  var PAUSE_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';
  function stopPlay() {
    if (playTimer !== null) { clearInterval(playTimer); playTimer = null; }
    document.body.classList.remove("playing");
    playBtn.innerHTML = PLAY_ICON;
    playBtn.setAttribute("aria-label", "Play history from 1975");
  }
  playBtn.addEventListener("click", function () {
    if (playTimer !== null) { stopPlay(); return; }
    if (currentYear >= YEAR_TODAY) setYear(YEAR_MIN);
    document.body.classList.add("playing");
    playBtn.innerHTML = PAUSE_ICON;
    playBtn.setAttribute("aria-label", "Pause");
    playTimer = setInterval(function () {
      if (currentYear >= YEAR_TODAY) { stopPlay(); return; }
      setYear(currentYear + 1);
    }, 200);
  });
  timeNote.addEventListener("click", function () {
    stopPlay();
    setYear(YEAR_TODAY);
  });
  var sliderSettle = null;
  yearSlider.addEventListener("input", function () {
    stopPlay();
    document.body.classList.add("playing");
    clearTimeout(sliderSettle);
    sliderSettle = setTimeout(function () { document.body.classList.remove("playing"); }, 250);
    setYear(+yearSlider.value, true);
  });

  /* ---------- Ask Claude (artifact "sample" capability) ---------- */
  var chatLauncher = document.getElementById("chatLauncher");
  var chatPanel = document.getElementById("chatPanel");
  var chatClose = document.getElementById("chatClose");
  var modeRow = document.getElementById("modeRow");
  var chatLog = document.getElementById("chatLog");
  var askForm = document.getElementById("askForm");
  var askInput = document.getElementById("askInput");
  var askSend = document.getElementById("askSend");
  var sampleNS = null;
  var chatHistory = [];
  var chatMode = "witty";

  var MODES = {
    scholar: "a measured seminar leader: precise, dry, factual.",
    witty: "a razor-sharp late-night host working a room of Harvard–Radcliffe '72 alums — men and women both. Every answer must land one genuine laugh: a wry aside, a lethal understatement, a joke at the data's expense (never the audience's). Think Mark Twain handed a spreadsheet. Delivery crackles; the numbers underneath stay exactly right.",
    unhinged: "a fully unhinged cable-news doom prophet moonlighting as a standup comic. Conspiracy-board energy. Wild similes ('civil liberties sliding like a piano out a dorm window'). Address the chart directly, as if it personally betrayed you. Accuse individual data points of insolence. ONE ALL-CAPS ERUPTION per answer, minimum. Theatrical despair, operatic sighing, a man watering a plastic plant while the republic wobbles. And the twist that makes it art: every single number is scrupulously, maddeningly correct — you are a lunatic with a fact-checker."
  };

  var sampleState = "pending";
  var dbNS = null;
  if (window.claude && typeof window.claude.use === "function") {
    chatLauncher.hidden = false;
    setTimeout(function () {
      Promise.resolve(window.claude.use("sample")).then(function (ns) {
        sampleNS = ns;
        sampleState = ns ? "ready" : "unavailable";
        if (ns) hideGate();
        else if (!chatPanel.hidden) showGate();
      }, function () {
        sampleState = "unavailable";
        if (!chatPanel.hidden) showGate();
      });
      Promise.resolve(window.claude.use("db")).then(function (ns) { dbNS = ns; }, function () {});
    }, 0);
  } else if (window.TI_WORKER_URL) {
    /* GitHub Pages build: the chat runs through a key-holding proxy worker.
       No sign-in, no gate — same tool/streaming contract as the artifact runtime. */
    sampleNS = makeApiSample(String(window.TI_WORKER_URL));
    sampleState = "ready";
    chatLauncher.hidden = false;
    var apiHint = document.querySelector(".ask-hint");
    if (apiHint) apiHint.textContent = "Answers written live by Claude (AI) · chart answers can take a minute · no sign-in needed.";
  }

  /* sampleNS-compatible chat over the Anthropic Messages API via a proxy that
     holds the key. Runs the tool loop client-side: our tools execute in this page. */
  function makeApiSample(workerUrl) {
    return function (turns, opts) {
      opts = opts || {};
      var apiTools = (opts.tools || []).map(function (t) {
        return { name: t.name, description: t.description,
                 input_schema: t.inputSchema || { type: "object", properties: {} } };
      });
      var execMap = {};
      (opts.tools || []).forEach(function (t) { execMap[t.name] = t.execute; });
      var messages = turns.map(function (t) { return { role: t.role, content: t.content }; });
      var textAll = "";
      function emit() { if (opts.onText && textAll) try { opts.onText({ text: textAll }); } catch (e) {} }
      function collectText(blocks) {
        return blocks.filter(function (b) { return b && b.type === "text"; })
          .map(function (b) { return b.text || ""; }).join("");
      }
      function joinRounds(prefix, roundText) {
        if (!prefix) return roundText;
        return roundText ? prefix + "\n\n" + roundText : prefix;
      }
      async function loop() {
        for (var round = 0; round < 8; round++) {
          var res = await fetch(workerUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages: messages, tools: apiTools })
          });
          if (!res.ok) {
            var errText = "";
            try { errText = await res.text(); } catch (e) {}
            throw { code: res.status === 429 ? "rate_limited" : "upstream_error",
                    message: "HTTP " + res.status + ": " + errText.slice(0, 200),
                    text: textAll || undefined };
          }
          var roundPrefix = textAll;
          var blocks = [];
          var stopReason = null;
          var reader = res.body.getReader();
          var dec = new TextDecoder();
          var buf = "";
          while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            buf += dec.decode(chunk.value, { stream: true });
            var lines = buf.split("\n");
            buf = lines.pop();
            for (var li = 0; li < lines.length; li++) {
              var line = lines[li];
              if (line.indexOf("data:") !== 0) continue;
              var data = line.slice(5).trim();
              if (!data) continue;
              var ev = null;
              try { ev = JSON.parse(data); } catch (e) { continue; }
              if (ev.type === "content_block_start") {
                blocks[ev.index] = JSON.parse(JSON.stringify(ev.content_block));
                if (blocks[ev.index].type === "tool_use") blocks[ev.index]._json = "";
              } else if (ev.type === "content_block_delta") {
                var b = blocks[ev.index];
                if (!b) continue;
                if (ev.delta.type === "text_delta") {
                  b.text = (b.text || "") + ev.delta.text;
                  textAll = joinRounds(roundPrefix, collectText(blocks));
                  emit();
                } else if (ev.delta.type === "input_json_delta") {
                  b._json += ev.delta.partial_json;
                } else if (ev.delta.type === "thinking_delta") {
                  b.thinking = (b.thinking || "") + (ev.delta.thinking || "");
                } else if (ev.delta.type === "signature_delta") {
                  b.signature = ev.delta.signature;
                }
              } else if (ev.type === "message_delta") {
                if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
              } else if (ev.type === "error") {
                throw { code: "upstream_error",
                        message: (ev.error && ev.error.message) || "stream error",
                        text: textAll || undefined };
              }
            }
          }
          blocks = blocks.filter(Boolean);
          blocks.forEach(function (b) {
            if (b.type === "tool_use") {
              try { b.input = b._json ? JSON.parse(b._json) : (b.input || {}); } catch (e) { b.input = {}; }
              delete b._json;
            }
          });
          textAll = joinRounds(roundPrefix, collectText(blocks));
          emit();
          if (stopReason === "refusal") {
            throw { code: "refused", message: "declined" };
          }
          if (stopReason !== "tool_use") {
            return { text: textAll, truncated: stopReason === "max_tokens", modelTierApplied: "complex" };
          }
          messages.push({ role: "assistant", content: blocks });
          var results = [];
          blocks.forEach(function (blk) {
            if (blk.type !== "tool_use") return;
            try {
              var out = execMap[blk.name] ? execMap[blk.name](blk.input || {}) : { error: "unknown tool " + blk.name };
              results.push({ type: "tool_result", tool_use_id: blk.id,
                             content: JSON.stringify(out == null ? "ok" : out) });
            } catch (e) {
              results.push({ type: "tool_result", tool_use_id: blk.id,
                             content: "Error: " + ((e && e.message) || String(e)), is_error: true });
            }
          });
          messages.push({ role: "user", content: results });
        }
        throw { code: "upstream_error", message: "too many tool rounds", text: textAll || undefined };
      }
      return loop();
    };
  }

  /* Anonymous question log (shared db; writes silently refused for viewers
     without write access). Disclosed in the chat hint. */
  function logQuestion(q) {
    if (!dbNS) return;
    try {
      var id = "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      var res = dbNS.doc("questions/" + id).set({ q: q, mode: chatMode, at: new Date().toISOString() });
      if (res && res.catch) res.catch(function () {});
    } catch (e) {}
  }

  /* Public-site question inbox: after a live exchange completes, send the
     typed question and the answer it got to the worker's /log route, which
     files them on the repo's "questions" branch for review. Best effort,
     fire-and-forget; canned chip replays never come through here. */
  function logExchange(q, a) {
    if (dbNS || !window.TI_WORKER_URL) return;
    try {
      fetch(String(window.TI_WORKER_URL).replace(/\/+$/, "") + "/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: q, a: a, mode: chatMode })
      }).catch(function () {});
    } catch (e) {}
  }

  /* Per-viewer chat persistence in browser storage: best effort only. */
  var transcript = [];
  var replaying = false;
  function record(entry) {
    if (replaying) return;
    transcript.push(entry);
    try {
      localStorage.setItem("ti_chat_v1", JSON.stringify({
        turns: chatHistory.slice(-12),
        log: transcript.slice(-40),
        mode: chatMode
      }));
    } catch (e) {}
  }
  function restoreChat() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem("ti_chat_v1") || "null"); } catch (e) {}
    if (!d) return;
    if (Array.isArray(d.turns)) chatHistory = d.turns;
    if (d.mode && MODES[d.mode]) {
      chatMode = d.mode;
      modeRow.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.mode === chatMode ? "true" : "false");
      });
    }
    replaying = true;
    try {
      (Array.isArray(d.log) ? d.log : []).forEach(function (m) {
        if (m.t === "user" || m.t === "ai") {
          addMsg(m.t, String(m.x || ""));
        } else if (m.t === "chart" && (m.i === -1 || (INDICATORS[m.i] && HIST.s[m.i]))) {
          addChartMsg(m.i, Array.isArray(m.r) ? m.r : null, m.m, m.ml);
        } else if (m.t === "multi" && Array.isArray(m.i)) {
          var ok = m.i.filter(function (i) { return i === -1 || (INDICATORS[i] && HIST.s[i]); }).slice(0, 3);
          if (ok.length) addMultiMsg(ok, Array.isArray(m.r) ? m.r : null, m.m, m.ml);
        } else if (m.t === "delta" && Array.isArray(m.e)) {
          addDeltaMsg(m.e, String(m.c || ""));
        }
      });
      transcript = Array.isArray(d.log) ? d.log : [];
    } catch (e) {}
    replaying = false;
  }

  var gateDiv = null;
  var chatBody = document.querySelector(".chat-body");
  var chatFoot = document.querySelector(".chat-foot");
  var faqChipsEl = document.getElementById("faqChips");
  function showGate() {
    if (!gateDiv) {
      gateDiv = document.createElement("div");
      gateDiv.className = "gate-screen";
      var h = document.createElement("h4");
      h.textContent = "Sign in to ask questions";
      var p = document.createElement("p");
      p.textContent = "The chat runs on your own Claude account: sign in, then reload this page. If this screen persists after signing in, claude.ai currently limits chat on pages shared by someone else — everything else on this page still works without it.";
      var login = document.createElement("a");
      login.className = "gate-btn";
      login.href = "https://claude.ai/login";
      login.target = "_blank";
      login.rel = "noopener";
      login.textContent = "Sign in to Claude";
      login.addEventListener("click", function () {
        var onVis = function () {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", onVis);
            setTimeout(function () { location.reload(); }, 400);
          }
        };
        document.addEventListener("visibilitychange", onVis);
      });
      var reload = document.createElement("button");
      reload.type = "button";
      reload.className = "gate-btn ghost";
      reload.textContent = "I signed in — reload";
      reload.addEventListener("click", function () { location.reload(); });
      var alt = document.createElement("p");
      alt.className = "gate-alt";
      alt.appendChild(document.createTextNode("Signed in and still stuck? Make your own copy of this page from the artifact menu — the chat works on a copy you own."));
      gateDiv.appendChild(h);
      gateDiv.appendChild(p);
      gateDiv.appendChild(login);
      gateDiv.appendChild(reload);
      gateDiv.appendChild(alt);
      gateDiag = document.createElement("p");
      gateDiag.className = "gate-alt gate-diag";
      gateDiv.appendChild(gateDiag);
      chatBody.appendChild(gateDiv);
    }
    gateDiv.hidden = false;
    chatBody.classList.add("gating");
    chatLog.hidden = true;
    faqChipsEl.hidden = true;
    chatFoot.hidden = true;
    updateGateDiag();
  }
  var gateDiag = null;
  /* One line of ground truth for support: is this page inside a Claude viewer,
     did the viewer serve the chat runtime, and what does the permission state say. */
  function updateGateDiag() {
    if (!gateDiag) return;
    var base = "Status: viewer " + (window.claude ? "yes" : "no") + " · chat runtime " + sampleState;
    gateDiag.textContent = base;
    if (window.claude && typeof window.claude.use === "function") {
      Promise.resolve(window.claude.use("permissions")).then(function (perm) {
        if (!perm || typeof perm.state !== "function") return;
        return Promise.resolve(perm.state("sample")).then(function (st) {
          gateDiag.textContent = base + " · permission " + String(st);
        });
      }).catch(function () {});
    }
  }
  function hideGate() {
    if (gateDiv) gateDiv.hidden = true;
    chatBody.classList.remove("gating");
    chatLog.hidden = false;
    faqChipsEl.hidden = false;
    chatFoot.hidden = false;
  }

  chatLauncher.addEventListener("click", function () {
    chatPanel.hidden = !chatPanel.hidden;
    if (!chatPanel.hidden) {
      if (sampleState === "unavailable") showGate();
      askInput.focus();
    }
  });
  chatClose.addEventListener("click", function () { chatPanel.hidden = true; });
  var chatMaxBtn = document.getElementById("chatMax");
  var ICON_EXPAND = '<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M8.5 1.5h4v4M5.5 12.5h-4v-4M12.5 1.5 8 6M1.5 12.5 6 8"/></svg>';
  var ICON_SHRINK = '<svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M12.5 5.5h-4v-4M1.5 8.5h4v4M8.5 5.5 13 1M5.5 8.5 1 13"/></svg>';
  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function setMaxUi(on) {
    chatMaxBtn.innerHTML = on ? ICON_SHRINK : ICON_EXPAND;
    chatMaxBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    chatMaxBtn.setAttribute("title", on ? "Exit full screen" : "Full screen");
    scrollChatBottom();
  }
  function cssMaxToggle() { setMaxUi(chatPanel.classList.toggle("maximized")); }
  chatMaxBtn.addEventListener("click", function () {
    /* True fullscreen first (the artifact frame can be taller than the screen);
       fall back to the edge-to-edge CSS mode where the API is unavailable or blocked. */
    if (fsElement() === chatPanel) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    if (chatPanel.classList.contains("maximized")) { cssMaxToggle(); return; }
    if (chatPanel.requestFullscreen) {
      chatPanel.requestFullscreen().catch(cssMaxToggle);
    } else if (chatPanel.webkitRequestFullscreen) {
      chatPanel.webkitRequestFullscreen();
      setTimeout(function () { if (fsElement() !== chatPanel) cssMaxToggle(); }, 350);
    } else {
      cssMaxToggle();
    }
  });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(function (ev) {
    document.addEventListener(ev, function () { setMaxUi(fsElement() === chatPanel); });
  });
  modeRow.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    chatMode = btn.dataset.mode;
    modeRow.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", b === btn ? "true" : "false");
    });
    try {
      var saved = JSON.parse(localStorage.getItem("ti_chat_v1") || "{}");
      saved.mode = chatMode;
      localStorage.setItem("ti_chat_v1", JSON.stringify(saved));
    } catch (e) {}
    askInput.focus();
  });

  function pageContext() {
    var isToday = currentYear === YEAR_TODAY;
    var lines = INDICATORS.map(function (ind, i) {
      var v = displayedValue(i);
      return "- " + ind[0] + " (" + DOMAINS[ind[1]].full + "): " +
        (v === null ? "no data this year" : "now " + v.toFixed(0)) +
        ", today-start " + ind[2] +
        (ind[5] !== null ? ", measured 2020: " + ind[5] : ", no pre-2023 data") +
        (ind[4] === 2 ? ", AT 50-YEAR LOW per 2026 report" : ind[4] === 1 ? ", significant decline 2020-25 per report" : "");
    });
    return "This is 'Thirty Indicators', an interactive page for a Harvard–Radcliffe Class of 1972 reunion discussion of democratic health, based on International IDEA's 'Global State of Democracy 2026: Democracy in an Age of Conflict'. " +
      "The chart shows 30 indicators scored 0-100. Real data: the 1975-2020 history, the dotted 2020 marks, and short solid lines marking measured lows (red on report-flagged columns: the old floor the report says they fell below; gray where some past year dipped below today's score) — all US values from the GSoD Indices v5.1 dataset, x100 — plus the report's decline flags and the framework itself. Illustrative: today's starting scores and the lever weights - say so when it matters. " +
      "Report findings: the US declined significantly 2020-2025 on seven indicators (access to justice, economic equality, freedom of expression, freedom of the press, effective parliament, judicial independence, free political parties); all but the last now at their lowest since 1975. Globally, 2025 was the 11th straight year more countries declined than advanced; rule of law is the weakest category (71 countries low).\n" +
      "Presidential terms, for era questions against the yearly data: Ford 1974-77, Carter 1977-81, Reagan 1981-89, G.H.W. Bush 1989-93, Clinton 1993-2001, G.W. Bush 2001-09, Obama 2009-17, Trump 2017-21, Biden 2021-25, Trump 2025-. Measured yearly data ends in 2020; for 2021-2025 rely on the report findings above and say so.\n" +
      "Overall measured index (mean of the 22 measured indicators; chartable via show_history 'overall'): 1975 " + OVERALL[0] + ", 1985 " + OVERALL[10] + ", 1995 " + OVERALL[20] + ", 2005 " + OVERALL[30] + ", 2015 " + OVERALL[40] + ", 2020 " + OVERALL[OVERALL.length - 1] + ". The hero index on the page averages all 30 including illustrative values, so the two are not directly comparable.\n" +
      "Current view: year " + (isToday ? "today (2026)" : currentYear) +
      "; overall index " + heroValue.textContent + " (" + heroWord.textContent + ")" +
      "; levers (0-100; each has its own illustrative 'today' anchor): " +
      LEVERS.map(function (lv, j) { return lv.id + "=" + leverValues[j] + " (today " + LEVER_TODAY[j] + ")"; }).join(", ") + ".\n" +
      "Indicators:\n" + lines.join("\n");
  }

  var askTools = [
    {
      name: "set_year",
      description: "Change the year shown on the chart. 1975-2020 shows measured history, 2021-2025 an estimate, 2026 today. Use when showing the viewer a period would help.",
      inputSchema: { type: "object", properties: { year: { type: "integer", minimum: 1975, maximum: 2026 } }, required: ["year"] },
      execute: function (inp) {
        stopPlay();
        currentYear = clamp(Math.round(inp.year), YEAR_MIN, YEAR_TODAY);
        yearSlider.value = currentYear;
        render();
        return { shown: currentYear === YEAR_TODAY ? "today (2026)" : currentYear, overallIndex: heroValue.textContent };
      }
    },
    {
      name: "mark_timeline",
      description: "Replace the dashed year markers on the big overall-index timeline at the top of the page (1975-2026). Presidential election years are marked there by default; call this to mark different years (other events, one party's wins) or [] to clear. The chat's own show_history charts use marks/marksLabel instead.",
      inputSchema: { type: "object", properties: {
        years: { type: "array", items: { type: "integer" }, maxItems: 20, description: "Years to mark, 1975-2026; [] clears" } }, required: ["years"] },
      execute: function (inp) {
        var n = setTimelineMarks(inp && inp.years);
        return { marked: n, note: n ? "dashed markers now on the top timeline" : "timeline markers cleared" };
      }
    },
    {
      name: "set_levers",
      description: "Move one or more of the six levers (0-100; each lever has its own 'today' anchor, given in the context) to show the viewer a scenario. Switches the chart to today. Keys: electoral, press, courts, restraint, integrity, civic.",
      inputSchema: { type: "object", properties: {
        electoral: { type: "integer" }, press: { type: "integer" }, courts: { type: "integer" },
        restraint: { type: "integer" }, integrity: { type: "integer" }, civic: { type: "integer" } } },
      execute: function (inp) {
        stopPlay();
        currentYear = YEAR_TODAY;
        yearSlider.value = YEAR_TODAY;
        LEVERS.forEach(function (lv, j) {
          if (typeof inp[lv.id] === "number" && isFinite(inp[lv.id])) {
            leverValues[j] = clamp(Math.round(inp[lv.id]), 0, 100);
            leverInputs[j].value = leverValues[j];
          }
        });
        clearPresetHighlight();
        render();
        return {
          levers: LEVERS.map(function (lv, j) { return lv.id + "=" + leverValues[j]; }).join(","),
          overallIndex: heroValue.textContent,
          status: heroWord.textContent
        };
      }
    },
    {
      name: "get_history",
      description: "Return the measured US yearly scores (1975-2020, 0-100, GSoD Indices v5.1) for one indicator, or all 22 measured indicators when no name is given. THE tool for any pattern, correlation, or cause question: fetch the raw numbers and do the arithmetic yourself (era averages, election-year vs off-year means, per-presidency changes) before answering — never guess from a chart's shape and never ask the viewer to eyeball it.",
      inputSchema: { type: "object", properties: { indicator: { type: "string", description: "Indicator name (partial match ok); omit for all" } } },
      execute: function (inp) {
        var q = inp && inp.indicator ? String(inp.indicator).toLowerCase() : null;
        var series = {};
        INDICATORS.forEach(function (ind, i) {
          if (!HIST.s[i]) return;
          if (q && ind[0].toLowerCase().indexOf(q) === -1) return;
          series[ind[0]] = HIST.s[i];
        });
        if (!q || /overall|composite|average|total|index/.test(q)) {
          series["Overall health index (mean of 22 measured)"] = OVERALL;
        }
        return { firstYear: HIST.y0, lastYear: HIST.y1, note: "one value per year, in order", series: series };
      }
    },
    {
      name: "show_history",
      description: "Insert a measured-data line chart into the chat: one indicator, or up to three overlaid for comparison. Prefer this over describing a trajectory in words. For era or presidency questions, zoom with from/to so the chart shows only the years asked about (e.g. 2015-2020), not all of 1975-2020. Remember measured data ends in 2020: Trump's term is 2017-2020 in the data, and the Biden years are NOT in the dataset, so say so instead of charting them.",
      inputSchema: { type: "object", properties: {
        indicator: { type: "string", description: "One indicator name, partial match ok" },
        indicators: { type: "array", items: { type: "string" }, maxItems: 3, description: "Up to three indicator names to overlay" },
        from: { type: "integer", description: "First year of the chart window, 1975-2020; omit for 1975" },
        to: { type: "integer", description: "Last year of the chart window, 1975-2020; omit for 2020" },
        marks: { type: "array", items: { type: "integer" }, maxItems: 15, description: "Years to flag with dashed vertical lines (e.g. presidential election years); use whenever the question is about elections, terms, or specific events" },
        marksLabel: { type: "string", description: "What the marked years are, for the caption (e.g. 'presidential elections')" } } },
      execute: function (inp) {
        var era = inp && (inp.from != null || inp.to != null) ?
          [inp.from != null ? inp.from : HIST.y0, inp.to != null ? inp.to : HIST.y1] : null;
        var names = inp && inp.indicators && inp.indicators.length ? inp.indicators : [inp && inp.indicator];
        var idxs = [];
        names.slice(0, 3).forEach(function (nm) {
          var q = String(nm || "").toLowerCase();
          if (!q) return;
          for (var i = 0; i < INDICATORS.length; i++) {
            if (INDICATORS[i][0].toLowerCase().indexOf(q) !== -1 && HIST.s[i]) {
              if (idxs.indexOf(i) === -1) idxs.push(i);
              return;
            }
          }
          if (/overall|composite|average|total|health index/.test(q) && idxs.indexOf(-1) === -1) idxs.push(-1);
        });
        if (!idxs.length) throw new Error("No measured indicator matched " + JSON.stringify(names) + " (the eight indicators added in 2023 have no 1975-2020 series)");
        if (idxs.length === 1) addChartMsg(idxs[0], era, inp && inp.marks, inp && inp.marksLabel);
        else addMultiMsg(idxs, era, inp && inp.marks, inp && inp.marksLabel);
        return { shownInChat: idxs.map(getIndName).join(", ") };
      }
    },
    {
      name: "show_changes",
      description: "Insert a ranked bar chart of how much each indicator changed between two points, biggest movers first. THE tool for 'which fell/rose most' questions. Years 1975-2020 are measured; to='today' compares the 2020 measurement with today's illustrative starting values.",
      inputSchema: { type: "object", properties: {
        from: { type: "integer", description: "Start year, 1975-2020; default 2020" },
        to: { type: "string", description: "End: a year up to 2020, or 'today' (default)" },
        top: { type: "integer", description: "How many movers to show, default 10" } } },
      execute: function (inp) {
        var from = inp && inp.from ? clamp(Math.round(inp.from), HIST.y0, HIST.y1) : HIST.y1;
        var toRaw = inp && inp.to != null ? String(inp.to).toLowerCase() : "today";
        var toIsToday = toRaw === "today" || toRaw === "now" || toRaw === "2026";
        var toYear = toIsToday ? null : clamp(parseInt(toRaw, 10) || HIST.y1, HIST.y0, HIST.y1);
        var top = inp && inp.top ? clamp(Math.round(inp.top), 3, 15) : 10;
        var entries = [];
        INDICATORS.forEach(function (ind, i) {
          var s = HIST.s[i];
          if (!s) return;
          var a = s[from - HIST.y0];
          var b = toIsToday ? ind[2] : s[toYear - HIST.y0];
          entries.push({ name: ind[0], delta: Math.round(b - a) });
        });
        entries.sort(function (x, y) { return Math.abs(y.delta) - Math.abs(x.delta); });
        entries = entries.slice(0, top);
        entries.sort(function (x, y) { return x.delta - y.delta; });
        addDeltaMsg(entries, "Change " + from + " → " + (toIsToday ? "today" : toYear) +
          (toIsToday ? " · 2020 measured → illustrative start" : " · measured, GSoD v5.1"));
        return { shown: entries.length, biggestDrop: entries[0].name + " (" + entries[0].delta + ")" };
      }
    }
  ];

  var pendingAiDiv = null;

  /* Single scroll authority for the chat: always settle at the bottom, rAF-throttled,
     so chart inserts and streaming text never fight each other over the scroll position. */
  var chatScrollQueued = false;
  function scrollChatBottom() {
    if (chatScrollQueued) return;
    chatScrollQueued = true;
    requestAnimationFrame(function () {
      chatScrollQueued = false;
      chatBody.scrollTop = chatBody.scrollHeight;
    });
  }

  /* Normalize an optional era window into [from, to] within the measured years,
     widened to at least 5 years so a zoomed line still has shape. */
  function eraWindow(r) {
    if (!r) return null;
    var from = clamp(Math.round(r[0]), HIST.y0, HIST.y1);
    var to = clamp(Math.round(r[1]), HIST.y0, HIST.y1);
    if (to < from) { var tmp = from; from = to; to = tmp; }
    while (to - from < 5) {
      if (from > HIST.y0) from--;
      if (to - from < 5 && to < HIST.y1) to++;
      if (from === HIST.y0 && to === HIST.y1) break;
    }
    if (from === HIST.y0 && to === HIST.y1) return null;
    return [from, to];
  }
  function eraTicks(from, to) {
    var mid = Math.round((from + to) / 2);
    return mid > from && mid < to ? [from, mid, to] : [from, to];
  }

  function cleanMarks(marks) {
    if (!Array.isArray(marks)) return null;
    var ms = marks.map(Number).filter(function (y) { return y >= HIST.y0 && y <= HIST.y1; }).slice(0, 15);
    return ms.length ? ms : null;
  }

  function addChartMsg(idx, era, marks, marksLabel) {
    var div = document.createElement("div");
    div.className = "msg ai chart-msg";
    div.setAttribute("role", "button");
    div.tabIndex = 0;
    var w = eraWindow(era);
    var ms = cleanMarks(marks);
    var series = getSeries(idx);
    var y0 = HIST.y0, years = [1975, 1995, 2015];
    if (w) {
      series = series.slice(w[0] - HIST.y0, w[1] - HIST.y0 + 1);
      y0 = w[0];
      years = eraTicks(w[0], w[1]);
    }
    var svg = buildHistoryChart(series, idx,
      { W: 372, H: 148, L: 26, R: 364, T: 10, B: 120, years: years, y0: y0, marks: ms });
    div.appendChild(svg);
    var cap = document.createElement("div");
    cap.className = "chart-cap";
    cap.textContent = getIndName(idx) + " · US, " + y0 + "–" + (y0 + series.length - 1) + " measured" +
      (idx === -1 ? " · mean of 22 indicators" : "") +
      (ms ? " · dashed lines: " + (marksLabel || "marked years") : "") + " · tap for full history";
    div.appendChild(cap);
    function enlarge() { openHistory(idx); }
    div.addEventListener("click", enlarge);
    div.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enlarge(); } });
    if (pendingAiDiv && pendingAiDiv.parentNode === chatLog) chatLog.insertBefore(div, pendingAiDiv);
    else chatLog.appendChild(div);
    scrollChatBottom();
    record({ t: "chart", i: idx, r: w || undefined, m: ms || undefined, ml: marksLabel || undefined });
  }

  function addBubble(svg, capText, legendEl) {
    var div = document.createElement("div");
    div.className = "msg ai chart-msg";
    div.style.cursor = "default";
    if (legendEl) div.appendChild(legendEl);
    div.appendChild(svg);
    var cap = document.createElement("div");
    cap.className = "chart-cap";
    cap.textContent = capText;
    div.appendChild(cap);
    if (pendingAiDiv && pendingAiDiv.parentNode === chatLog) chatLog.insertBefore(div, pendingAiDiv);
    else chatLog.appendChild(div);
    scrollChatBottom();
  }

  function addMultiMsg(idxs, era, marks, marksLabel) {
    var w = eraWindow(era);
    var ms = cleanMarks(marks);
    var legend = document.createElement("div");
    legend.className = "mini-legend";
    idxs.forEach(function (idx, k) {
      var key = document.createElement("span");
      var sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = "var(--dom-" + (k + 1) + ")";
      key.appendChild(sw);
      key.appendChild(document.createTextNode(getIndName(idx)));
      legend.appendChild(key);
    });
    var yrs = w || [HIST.y0, HIST.y1];
    addBubble(buildMultiHistory(idxs, w, ms),
      "US, " + yrs[0] + "–" + yrs[1] + " measured (GSoD v5.1)" +
      (ms ? " · dashed lines: " + (marksLabel || "marked years") : ""), legend);
    record({ t: "multi", i: idxs, r: w || undefined, m: ms || undefined, ml: marksLabel || undefined });
  }

  function addDeltaMsg(entries, capText) {
    addBubble(buildDeltaChart(entries), capText);
    record({ t: "delta", e: entries, c: capText });
  }

  function buildMultiHistory(idxs, w, marks) {
    var W = 372, H = 156, L = 26, R = 342, T = 10, B = 128;
    var y0 = w ? w[0] : HIST.y0;
    var sliceOf = function (idx) {
      var s = getSeries(idx);
      return w ? s.slice(w[0] - HIST.y0, w[1] - HIST.y0 + 1) : s;
    };
    var n = sliceOf(idxs[0]).length;
    var xAt = function (k) { return L + (R - L) * k / (n - 1); };
    var range = yRangeOf(idxs.map(sliceOf));
    var yAt = function (v) { return B - (B - T) * (v - range.lo) / (range.hi - range.lo); };
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, "class": "history-svg", role: "img" });
    svg.setAttribute("aria-label", "Comparison, " + y0 + " to " + (y0 + n - 1) + ": " +
      idxs.map(function (i) { return getIndName(i) + " ends at " + sliceOf(i)[n - 1]; }).join("; "));
    range.ticks.forEach(function (v) {
      svg.appendChild(svgEl("line", { x1: L, x2: R, y1: yAt(v), y2: yAt(v), "class": v === 0 ? "h-grid h-zero" : "h-grid" }));
      var t = svgEl("text", { x: L - 6, y: yAt(v) + 3, "text-anchor": "end", "class": "h-axis" });
      t.textContent = v; svg.appendChild(t);
    });
    (w ? eraTicks(w[0], w[1]) : [1975, 1995, 2015]).forEach(function (yr) {
      var x = xAt(yr - y0);
      var anchor = x > R - 14 ? "end" : x < L + 14 ? "start" : "middle";
      var t = svgEl("text", { x: x, y: B + 14, "text-anchor": anchor, "class": "h-axis" });
      t.textContent = yr; svg.appendChild(t);
    });
    (marks || []).forEach(function (yr) {
      var k = yr - y0;
      if (k < 0 || k > n - 1) return;
      svg.appendChild(svgEl("line", { x1: xAt(k), x2: xAt(k), y1: T, y2: B, "class": "h-mark" }));
    });
    var ends = idxs.map(function (idx, k) {
      var s = sliceOf(idx);
      var color = "var(--dom-" + (k + 1) + ")";
      var d = s.map(function (v, j) { return (j ? "L" : "M") + xAt(j).toFixed(1) + " " + yAt(v).toFixed(1); }).join(" ");
      var path = svgEl("path", { d: d, "class": "h-line" });
      path.style.stroke = color;
      svg.appendChild(path);
      return { y: yAt(s[n - 1]), label: String(s[n - 1]) };
    });
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var k = 1; k < ends.length; k++) {
      if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12;
    }
    ends.forEach(function (e) {
      var t = svgEl("text", { x: R + 4, y: e.y + 3, "class": "h-mlabel" });
      t.textContent = e.label;
      svg.appendChild(t);
    });
    return svg;
  }

  function buildDeltaChart(entries) {
    var rowH = 22, T = 6, W = 372, labelW = 150;
    var H = T + entries.length * rowH + 8;
    var plotW = W - labelW - 40;
    var maxPos = 0, maxNeg = 0;
    entries.forEach(function (e) {
      if (e.delta > maxPos) maxPos = e.delta;
      if (-e.delta > maxNeg) maxNeg = -e.delta;
    });
    var total = (maxPos + maxNeg) || 1;
    var scale = plotW / total;
    var xZero = labelW + maxNeg * scale;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, "class": "history-svg", role: "img" });
    svg.setAttribute("aria-label", "Ranked change per indicator: " +
      entries.map(function (e) { return e.name + " " + e.delta; }).join(", "));
    svg.appendChild(svgEl("line", { x1: xZero, x2: xZero, y1: T, y2: H - 4, "class": "h-grid h-zero" }));
    entries.forEach(function (e, i) {
      var y = T + i * rowH;
      var name = e.name.length > 24 ? e.name.slice(0, 23) + "…" : e.name;
      var nt = svgEl("text", { x: labelW - 6, y: y + rowH / 2 + 3.5, "text-anchor": "end", "class": "h-rlabel" });
      nt.textContent = name;
      svg.appendChild(nt);
      var w = Math.max(Math.abs(e.delta) * scale, 1.5);
      var bx = e.delta < 0 ? xZero - w : xZero;
      var bar = svgEl("rect", { x: bx, y: y + 4, width: w, height: rowH - 9, rx: 2 });
      bar.style.fill = e.delta < 0 ? "var(--status-critical)" : "var(--status-good)";
      svg.appendChild(bar);
      var inside = w >= 34;
      var vt = svgEl("text", {
        x: e.delta < 0 ? (inside ? bx + 5 : xZero + 5)
                       : (inside ? bx + w - 5 : bx + w + 5),
        y: y + rowH / 2 + 3.5,
        "text-anchor": e.delta < 0 ? "start" : (inside ? "end" : "start"),
        "class": inside ? "h-vlabel h-vlabel-in" : "h-vlabel"
      });
      vt.textContent = (e.delta > 0 ? "+" : "−") + Math.abs(e.delta);
      svg.appendChild(vt);
    });
    return svg;
  }

  function addMsg(cls, text) {
    var div = document.createElement("div");
    div.className = "msg " + cls;
    div.textContent = text;
    chatLog.appendChild(div);
    scrollChatBottom();
    return div;
  }

  /* Canned FAQ answers (assets/answers.js): a matching chip in a covered voice
     replays the reviewed answer locally — instant, zero API cost. The steps run
     the chat's own tools, so charts and lever moves come from live TI_DATA;
     only the prose is stored. Voices without an entry (unhinged) go live. */
  function cannedSteps(q) {
    var list = window.TI_ANSWERS;
    if (!list) return null;
    for (var k = 0; k < list.length; k++) {
      if (list[k].q === q) return (list[k].modes || {})[chatMode] || null;
    }
    return null;
  }
  function replayCanned(q, steps) {
    addMsg("user", q);
    record({ t: "user", x: q });
    chatHistory.push({ role: "user", content: q });
    var text = "";
    for (var k = 0; k < steps.length; k++) {
      var st = steps[k];
      if (st.say) { text = st.say; continue; }
      for (var t = 0; t < askTools.length; t++) {
        if (askTools[t].name === st.call) {
          try { askTools[t].execute(st.input || {}); } catch (e) {}
          break;
        }
      }
    }
    addMsg("ai", text);
    record({ t: "ai", x: text });
    chatHistory.push({ role: "assistant", content: text });
  }

  document.getElementById("faqChips").addEventListener("click", function (e) {
    var chip = e.target.closest("button");
    if (!chip) return;
    var q = chip.textContent.trim();
    var steps = cannedSteps(q);
    if (steps && !askSend.disabled) {
      replayCanned(q, steps);
      return;
    }
    askInput.value = q;
    if (askForm.requestSubmit) askForm.requestSubmit();
    else askForm.dispatchEvent(new Event("submit", { cancelable: true }));
  });

  askForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!sampleNS) {
      if (sampleState === "pending") {
        addMsg("ai", "Still connecting to Claude — give it a second and try again.");
      } else {
        showGate();
      }
      return;
    }
    var q = askInput.value.trim();
    if (!q || askSend.disabled) return;
    askInput.value = "";
    addMsg("user", q);
    record({ t: "user", x: q });
    logQuestion(q);
    var aiDiv = addMsg("ai", "");
    var typing = document.createElement("span");
    typing.className = "typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    aiDiv.appendChild(typing);
    aiDiv.style.minHeight = "2.7em"; /* room for ~2 lines so late-arriving text doesn't reflow the charts */
    pendingAiDiv = aiDiv;
    askSend.disabled = true;
    chatHistory.push({ role: "user", content: q });
    var turns = chatHistory.slice(0, -1).slice(-8).concat([{
      role: "user",
      content: "CONTEXT (live page state, not typed by the viewer):\n" + pageContext() +
        "\n\nViewer question: " + q +
        "\n\nAudience: the Harvard–Radcliffe Class of 1972 at their reunion — the men of Harvard College and the women of Radcliffe College, one class. They graduated in June 1972 — Watergate broke months later, and this dataset begins three years after their Commencement — so they lived every year of it as voting adults, and they are in their mid-70s now. When it sharpens an answer, anchor one fact to their timeline ('the year you turned 40', 'your 25th reunion year'); at most one such anchor per answer. Never flatter them, and never assume their politics — the room spans the spectrum; be personal about the timeline, strictly neutral about the numbers." +
        "\nVoice: you are " + MODES[chatMode] +
        "\nHard rules: SHOW, don't tell — answer with a chart whenever possible: show_changes for 'which moved most' (ranked bars), show_history with up to three indicators to compare trajectories (for era or presidency questions ALWAYS zoom with from/to to just those years; measured data ends 2020, so the Biden years are outside the dataset — say so plainly; pass marks+marksLabel to flag election years or events with dashed lines when the question involves them; mark_timeline does the same on the big timeline at the top of the page), set_year for a moment in time, set_levers for a scenario." +
        "\nDEPTH: for any pattern, correlation, cause, or 'does X track Y' question, call get_history FIRST and compute the actual numbers — era averages, election-year vs off-year means, per-presidency start-to-end changes — then give the verdict WITH two or three of those computed numbers (up to four sentences). NEVER tell the viewer to check, eyeball, or match years against the chart themselves: you have the raw data, you do the arithmetic. If a president or era is asked about, name the actual years you used." +
        "\nNo repeats: never re-show a chart that is already the most recent chart in the conversation with the same indicator and window — add marks to it or answer in words with computed numbers instead. Each tool call must add something new to the screen." +
        "\nOtherwise write AT MOST two short sentences: what the viewer now sees, and the takeaway. EXCEPTION — in the witty voice you get one extra sentence for the joke, and in the unhinged voice up to five short sentences: commit to the bit completely, the performance is the product (the numbers in it must still be exact). If the question is ambiguous, or the data only partly covers it, the FIRST sentence must say what the data can and cannot answer — never present a chart as answering more than it does. Plain text; no markdown, no lists, no preamble."
    }]);
    sampleNS(turns, {
      cache: false,
      modelTier: "complex",
      tools: askTools,
      onText: function (ev) {
        aiDiv.textContent = ev.text;
        scrollChatBottom();
      }
    }).then(function (res) {
      aiDiv.textContent = res.text;
      chatHistory.push({ role: "assistant", content: res.text });
      record({ t: "ai", x: res.text });
      logExchange(q, res.text);
    }, function (err) {
      chatHistory.pop();
      logExchange(q, null);
      aiDiv.textContent =
        err && err.code === "rate_limited" ? "Rate limited — give it a moment and try again." :
        err && err.code === "cancelled" ? "Cancelled." :
        err && err.text ? err.text :
        "That didn't go through — try again.";
    }).then(function () {
      aiDiv.style.minHeight = "";
      pendingAiDiv = null;
      askSend.disabled = false;
      askInput.focus();
      scrollChatBottom();
    });
  });

  buildSpark();
  clearTimelineMarks();
  drawTimelineMarks(MIDTERM_YEARS, true);
  drawTimelineMarks(ELECTION_YEARS, false);
  /* The lowest-point mark, on every measured column: where that indicator's
     1975-2020 measured minimum sits. Red on columns the 2026 report flags (▼)
     as having fallen below that old floor; neutral gray elsewhere, where it is
     historical context rather than a claim about today. Runs after HIST. */
  INDICATORS.forEach(function (ind, i) {
    var s = HIST.s[i];
    if (!s || !barEls[i]) return;
    var lowVal = Math.min.apply(null, s);
    var lowYear = HIST.y0 + s.indexOf(lowVal);
    var lowTick = document.createElement("div");
    if (ind[4] === 2) {
      lowTick.className = "lowest-tick";
      lowTick.dataset.tipTitle = "Red line · previous 50-year low: " + lowVal + " (in " + lowYear + ")";
      lowTick.dataset.tipBody = "The 2026 report says this indicator now sits below it (▼).";
    } else {
      /* Unflagged columns: show the historical low only where history genuinely
         dipped below today's bar. When today already sits at or below every
         measured year, the bar itself is the lowest point to date — a floating
         "low" line above it would contradict the chart. */
      if (lowVal >= ind[2]) return;
      lowTick.className = "lowest-tick muted";
      lowTick.dataset.tipTitle = "Gray line · lowest measured year, 1975–2020: " + lowVal + " (in " + lowYear + ")";
      lowTick.dataset.tipBody = "Historical context from the GSoD v5.1 series.";
    }
    lowTick.style.bottom = lowVal + "%";
    barEls[i].appendChild(lowTick);
  });
  restoreChat();
  render();
})();
