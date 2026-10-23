// Computes every number and every mark the da-visualization video draws, and
// writes them to results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/da-visualization/check.mjs
//
// The data is the Data Analyst visualization page's own: the figures its
// charts draw (charts/<slug>.mjs at the repo root). Where a spec exports its
// data, or builds it in a shared helper (_theme, _growth, _wander), it is
// imported; where a spec keeps its data private, the same inputs are restated
// here with the same seeds and the same generator, so the video draws what
// the page draws. Everything the narration quotes (ratios, percentages, the
// correlation) is computed below, not typed. The colorblind matrix is the
// one the page's colorblind-safe chart applies, composed into one linear map.
/* global console, URL */
import { writeFileSync } from "node:fs";
import { normalSamples, rng } from "../../../../charts/_theme.mjs";
import { BIG, PERIODS, SMALL } from "../../../../charts/_growth.mjs";
import { DECADE_PCT, SERIES as WANDER, WINDOW, WINDOW_LENGTH, WINDOW_PCT } from "../../../../charts/_wander.mjs";

const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const pct = (a, b) => (b / a - 1) * 100;
const out = {};

// ── 1. The encoding ranking (encoding-accuracy) ─────────────────────────────
// Relative judgement error, normalised so position = 1 (Cleveland & McGill and
// the work that extended it), as the page's chart gives it.
out.encodings = {
  rows: [
    { key: "Position", error: 1.0 },
    { key: "Length", error: 1.4 },
    { key: "Angle", error: 1.8 },
    { key: "Area", error: 2.5 },
    { key: "Color", error: 3.0 },
  ],
};
out.encodings.colorVsPosition = round(out.encodings.rows[4].error / out.encodings.rows[0].error, 1);

// ── 2. Line or bar (line-vs-bar-four-cases) ─────────────────────────────────
out.lineBar = {
  values: [180, 205, 198, 240, 262, 291],
  weeks: ["W1", "W2", "W3", "W4", "W5", "W6"],
  types: ["Login", "Billing", "Export", "Search", "Mobile", "API"],
};

// ── 3. Pie or bar (pie-vs-bar) ──────────────────────────────────────────────
{
  const shares = [
    { key: "Sedan", value: 31 },
    { key: "SUV", value: 24 },
    { key: "Truck", value: 22.5 },
    { key: "Van", value: 14 },
    { key: "Coupe", value: 8.5 },
  ];
  const sorted = [...shares].sort((a, b) => b.value - a.value);
  let closest = { gap: Infinity, pair: [] };
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i].value - sorted[i + 1].value;
    if (gap < closest.gap) closest = { gap, pair: [sorted[i].key, sorted[i + 1].key] };
  }
  out.pie = { shares, total: shares.reduce((s, d) => s + d.value, 0), closest };
}

// ── 4. Histogram or bar chart (histogram-vs-bar-chart) ──────────────────────
{
  const N = 420;
  const CHANNELS = ["Email", "Chat", "Phone", "Portal", "Social"];
  const WEIGHTS = [0.34, 0.27, 0.17, 0.14, 0.08];
  const HOURS_MAX = 24;
  const draw = rng(70141);
  const tickets = Array.from({ length: N }, () => {
    let r = draw();
    let k = 0;
    while (k < WEIGHTS.length - 1 && r > WEIGHTS[k]) {
      r -= WEIGHTS[k];
      k += 1;
    }
    let hours = 0.4 - 5 * Math.log(1 - draw());
    while (hours >= HOURS_MAX) hours = 0.4 - 5 * Math.log(1 - draw());
    return { channel: CHANNELS[k], hours };
  });
  const byChannel = CHANNELS.map((channel) => ({ key: channel, count: tickets.filter((t) => t.channel === channel).length })).sort(
    (a, b) => b.count - a.count,
  );
  const BIN = 2;
  const bins = Array.from({ length: HOURS_MAX / BIN }, (_, i) => ({
    lo: i * BIN,
    count: tickets.filter((t) => t.hours >= i * BIN && t.hours < (i + 1) * BIN).length,
  }));
  out.tickets = { n: N, byChannel, bin: BIN, hoursMax: HOURS_MAX, bins, sortedBins: [...bins].sort((a, b) => b.count - a.count) };
}

// ── 5. Bin width (histogram-bin-width) ──────────────────────────────────────
{
  const data = [...normalSamples(600, 8, 1.5, 314), ...normalSamples(400, 15, 1.8, 271)];
  const DOMAIN = [2, 22];
  const hist = (width) => {
    const bins = Math.round((DOMAIN[1] - DOMAIN[0]) / width);
    const counts = new Array(bins).fill(0);
    for (const v of data) {
      const i = Math.floor((v - DOMAIN[0]) / width);
      if (i >= 0 && i < bins) counts[i] += 1;
    }
    // Density, so a bin's height does not depend on its width.
    return counts.map((c) => round(c / (data.length * width), 4));
  };
  out.bins = { n: data.length, domain: DOMAIN, panels: [5, 1, 0.25].map((width) => ({ width, density: hist(width) })) };
}

// ── 6. A truncated axis (bar-truncation, bar-truncation-cropped) ────────────
{
  const bars = [
    { key: "Team A", value: 94.1 },
    { key: "Team B", value: 95.3 },
    { key: "Team C", value: 96.8 },
    { key: "Team D", value: 98.2 },
    { key: "Team E", value: 99.0 },
  ];
  const CROP = 94;
  const lo = bars[0].value;
  const hi = bars[bars.length - 1].value;
  out.truncation = {
    bars,
    crop: CROP,
    top: 100,
    // How much bigger the best score really is, and how much taller its bar
    // draws on the cropped axis.
    realPct: round(pct(lo, hi), 1),
    croppedRatio: round((hi - CROP) / (lo - CROP), 1),
  };
}

// ── 7. A non-zero baseline (zero-baseline-bars-not-lines) ───────────────────
{
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const score = [94.2, 94.0, 94.6, 95.1, 95.4, 95.0, 95.8, 96.3, 96.1, 96.9, 97.2, 97.6];
  const FLOOR = 92;
  out.baseline = {
    months,
    score,
    floor: FLOOR,
    risePct: round(pct(score[0], score[11]), 1),
    barRatio: round((score[11] - FLOOR) / (score[0] - FLOOR), 2),
  };
}

// ── 8. Log scales (_growth) ─────────────────────────────────────────────────
{
  const series = [BIG, SMALL].map((s) => ({
    key: s.key,
    start: s.start,
    growthPct: Math.round(s.growth * 100),
    values: Array.from({ length: PERIODS + 1 }, (_, t) => round(s.start * (1 + s.growth) ** t, 1)),
  }));
  out.log = { periods: PERIODS, series };
}

// ── 9. A dual axis (dual-axis-illusion) ─────────────────────────────────────
{
  const N = 28;
  const next = rng(18);
  const gauss = () => {
    const a = Math.max(next(), Number.EPSILON);
    return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
  };
  const A = Array.from({ length: N }, (_, i) => 120 + i * 6.2 + gauss() * 9);
  const B = Array.from({ length: N }, () => 41 + gauss() * 2.4);
  const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const mx = mean(A);
  const my = mean(B);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < N; i++) {
    num += (A[i] - mx) * (B[i] - my);
    dx += (A[i] - mx) ** 2;
    dy += (B[i] - my) ** 2;
  }
  out.dual = {
    a: A.map((v) => round(v, 1)),
    b: B.map((v) => round(v, 2)),
    corr: round(num / Math.sqrt(dx * dy), 2),
    fitted: [round(Math.min(...B) - 1.5, 2), round(Math.max(...B) + 1.5, 2)],
    zero: [0, round(Math.max(...B) * 1.25, 2)],
  };
}

// ── 10. Other ways charts mislead ───────────────────────────────────────────
// A cherry-picked window (_wander), an inverted axis (inverted-y-axis), and a
// gap filled with zeroes (missing-as-zero).
out.cherry = {
  values: WANDER.map((d) => round(d.value, 2)),
  window: { start: WINDOW.start, end: WINDOW.end, months: WINDOW_LENGTH },
  windowPct: WINDOW_PCT,
  decadePct: DECADE_PCT,
};
{
  const years = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];
  const values = [521, 548, 596, 634, 712, 768, 803, 841];
  out.inverted = { years, values, domain: [400, 900], risePct: Math.round(pct(values[0], values[values.length - 1])) };
}
{
  const DAYS = 30;
  const OUTAGE = [14, 15, 16, 17];
  const u = rng(1720);
  const base = Array.from({ length: DAYS }, (_, d) => round(62 + d * 0.5 + Math.sin(d * 0.8) * 4 + (u() - 0.5) * 5, 2));
  out.missing = { days: DAYS, outage: OUTAGE, values: base };
}

// ── 11, 12. Dashboards (dashboard-reading-order, dashboard-metric-creep) ────
{
  const weight = (r, c) => Math.exp(-0.62 * r) * Math.exp(-0.3 * c);
  const cells = [0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => ({ r, c, w: weight(r, c) })));
  const total = cells.reduce((s, d) => s + d.w, 0);
  const shares = cells.map((d) => ({ r: d.r, c: d.c, share: round(d.w / total, 4) }));
  const ADDED = [6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 23, 24, 26, 27, 29, 31, 32, 34, 35, 37, 38, 40, 41];
  const USED = [5, 6, 7, 8, 9, 10, 10, 11, 11, 11, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 6, 6];
  out.dashboard = {
    cells: shares,
    ratio: Math.round(cells[0].w / cells[cells.length - 1].w),
    added: ADDED,
    used: USED,
    months: ADDED.length,
  };
}

// ── 13. A title that carries the finding (title-carries-the-finding) ────────
{
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenue = [412, 398, 425, 431, 419, 442, 389, 384, 397, 402, 411, 418];
  const RISE = 6;
  out.story = { months, revenue, rise: RISE, dropPct: Math.round(((revenue[RISE - 1] - revenue[RISE]) / revenue[RISE - 1]) * 100) };
}

// ── 14. Annotation (annotation-directs-attention) ───────────────────────────
{
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WOBBLE = [0, 0.4, -0.5, 0.3, -0.2, 0.5, -0.4, 0.6, -0.3, 0.4, -0.5, 0.2];
  const SHIP = 5;
  const BEFORE = 1.1;
  const AFTER = 4.3;
  const values = months.map((_, i) => round(22 + BEFORE * Math.min(i, SHIP) + AFTER * Math.max(0, i - SHIP) + WOBBLE[i], 1));
  out.annotation = {
    months,
    values,
    ship: SHIP,
    beforeSlope: BEFORE,
    afterSlope: AFTER,
    multiple: Math.round(AFTER / BEFORE),
  };
}

// ── 17. Accessibility (colorblind-safe) ─────────────────────────────────────
// The page's Viénot, Brettel & Mollon deuteranope transform is linear in
// linear RGB, so it composes into one 3x3 matrix: the columns are the images
// of pure linear red, green and blue. An SVG feColorMatrix applies it in
// linear RGB, on the brand colors, without a single hex value in a scene.
{
  const map = ([r, g, b]) => {
    const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
    const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
    const M2 = 0.494207 * L + 1.24827 * S;
    return [
      0.080944 * L - 0.130504 * M2 + 0.116721 * S,
      -0.0102485 * L + 0.0540194 * M2 - 0.113615 * S,
      -0.000365294 * L - 0.00412163 * M2 + 0.693513 * S,
    ];
  };
  const cols = [map([1, 0, 0]), map([0, 1, 0]), map([0, 0, 1])];
  // Rows of the matrix, each with feColorMatrix's alpha column and offset.
  const rows = [0, 1, 2].map((i) => [...cols.map((c) => round(c[i], 5)), 0, 0]);
  out.deuteranope = { matrix: [...rows, [0, 0, 0, 1, 0]].flat() };
}

// ── At speed ────────────────────────────────────────────────────────────────
// Area against radius (bubble-area-vs-radius): the value 5 against the value 1.
out.bubbles = { values: [1, 2, 3, 4, 5], radiusRatio: 5 ** 2 / 1 ** 2, areaRatio: 5 / 1 };
// The data-ink chart's week (data-ink-ratio).
out.ink = {
  bars: [
    { key: "Mon", v: 62 },
    { key: "Tue", v: 71 },
    { key: "Wed", v: 68 },
    { key: "Thu", v: 84 },
    { key: "Fri", v: 79 },
    { key: "Sat", v: 41 },
    { key: "Sun", v: 33 },
  ],
};
// Overplotting (overplotting-alpha): two clusters and a bridge.
{
  const N = 2000;
  const cluster = (n, mx, my, sd, seed) => {
    const xs = normalSamples(n, mx, sd, seed);
    const ys = normalSamples(n, my, sd, seed + 7919);
    return xs.map((x, i) => [round(x, 3), round(ys[i], 3)]);
  };
  const points = [...cluster(N, 3.2, 3.4, 0.85, 101), ...cluster(N, 6.6, 6.2, 0.85, 202), ...cluster(Math.round(N / 6), 5, 4.8, 1.5, 303)];
  out.scatter = { n: points.length, points };
}
// Part to whole (part-to-whole-over-time).
{
  const MONTHS = 12;
  const CHANNELS = [
    { key: "Mobile", from: 20, to: 96 },
    { key: "Web", from: 62, to: 64 },
    { key: "Partner", from: 24, to: 36 },
    { key: "Retail", from: 42, to: 22 },
  ];
  const jitter = rng(51204);
  const values = CHANNELS.map((c) =>
    Array.from({ length: MONTHS }, (_, i) => {
      const t = i / (MONTHS - 1);
      return Math.round(c.from + (c.to - c.from) * t + (jitter() - 0.5) * 6);
    }),
  );
  const totals = Array.from({ length: MONTHS }, (_, i) => values.reduce((s, v) => s + v[i], 0));
  out.parts = { channels: CHANNELS.map((c, k) => ({ key: c.key, values: values[k] })), totals };
}

const file = new URL("./results.json", import.meta.url);
writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${file.pathname}`);
console.log(
  JSON.stringify(
    {
      colorVsPosition: out.encodings.colorVsPosition,
      closest: out.pie.closest,
      tickets: out.tickets.byChannel,
      truncation: [out.truncation.realPct, out.truncation.croppedRatio],
      baseline: [out.baseline.risePct, out.baseline.barRatio],
      log: out.log.series.map((s) => [s.key, s.start, s.growthPct, s.values.at(-1)]),
      dualCorr: out.dual.corr,
      cherry: [out.cherry.windowPct, out.cherry.decadePct, out.cherry.window],
      inverted: out.inverted.risePct,
      dash: [out.dashboard.ratio, out.dashboard.added.at(-1), out.dashboard.used.at(-1)],
      story: out.story.dropPct,
      annotation: [out.annotation.multiple, out.annotation.values],
      scatterN: out.scatter.n,
      web: out.parts.channels[1].values,
      deut: out.deuteranope.matrix,
    },
    null,
    0,
  ),
);
