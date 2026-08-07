/**
 * Shared rendering context for every chart spec in this folder.
 *
 * Each `charts/<slug>.mjs` exports a `render()` that calls `plot()` from here
 * and gets back an `<svg>` element; `scripts/build-charts.mjs` serializes those
 * into `lib/generated/charts.js`, and `<Chart slug="…">`
 * (app/_components/mdx/Chart.tsx) inlines the markup into the page.
 *
 * ── Why the output is theme-agnostic ────────────────────────────────────────
 *
 * The site's dark mode is a `.dark` class toggled at runtime, not a
 * `prefers-color-scheme` match, so a chart referenced as `<img src="…svg">`
 * could never follow it (an <img> can't see page CSS) and a `<picture media>`
 * would desync from the toggle. Charts are therefore *inlined*, and every
 * colour in the SVG is either:
 *
 *   • `currentColor` — Plot's own default for axis text, ticks and gridlines,
 *     left exactly as it emits them, so they follow the page foreground; or
 *   • `var(--ds-chart-N)` — a chart-scoped role token that Chart.module.css
 *     defines per theme (light values on the wrapper, dark values under
 *     `.dark`).
 *
 * The role tokens exist because the brand `500` shades are tuned to sit on
 * white; on the near-black page they need the brighter `400`/`300` steps to
 * stay legible. Mapping happens once, in CSS, so one rendered SVG serves both
 * themes with no JavaScript and no second asset. Never write a literal hex
 * into a spec — it will be wrong in one of the two themes.
 *
 * ── The look ────────────────────────────────────────────────────────────────
 *
 * Academic-minimal, in the spirit of ggplot2's `theme_minimal()`: transparent
 * panel, no frame, no tick marks, faint horizontal rules only, and labels in
 * the page's own type. Chart junk is the enemy; the data is the ink.
 */
import * as Plot from "@observablehq/plot";
import { parseHTML } from "linkedom";

export { Plot };

// Plot needs a DOM to build the SVG. linkedom is enough (Plot only creates and
// appends elements; nothing here measures layout), and one document is shared
// across every spec in a run — the elements are serialized and discarded.
const { document } = parseHTML("<!doctype html><html><body></body></html>");

/**
 * Categorical series tokens, in the order a multi-series chart should reach
 * for them. Values are supplied per theme by Chart.module.css; these strings
 * are what actually lands in the SVG.
 */
export const SERIES = [
  "var(--ds-chart-1)",
  "var(--ds-chart-2)",
  "var(--ds-chart-3)",
  "var(--ds-chart-4)",
  "var(--ds-chart-5)",
  "var(--ds-chart-6)",
  "var(--ds-chart-7)",
];

/** The primary series (brand blue), the default for a single-series chart. */
export const PRIMARY = SERIES[0];

/** A deliberately quiet colour for reference lines, annotations, and the
 *  "everything else" half of a highlighted comparison. */
export const MUTED = "var(--ds-chart-muted)";

/** Highlight colour for the one thing a chart is actually about. */
export const ACCENT = "var(--ds-chart-accent)";

/**
 * `Plot.plot()` with the house theme applied. Pass any Plot option to override
 * a default; `x`/`y`/`color` scale options are merged one level deep so a spec
 * can set `x: { label: "z" }` without losing the shared axis treatment.
 */
export function plot(options = {}) {
  const { x, y, color, style, marks = [], ...rest } = options;
  return Plot.plot({
    document,
    width: 680,
    height: 320,
    marginTop: 20,
    marginRight: 16,
    marginBottom: 42,
    marginLeft: 54,
    // `inherit` beats Plot's `font-family` presentation attribute (inline
    // style wins), so labels render in the page's Inter rather than the
    // browser's system-ui default, and the chart matches the prose around it.
    //
    // The negative tracking is the one typographic liberty taken here. Chart
    // labels are short, isolated strings — axis ticks, series names, a
    // percentage — read at a glance rather than along a line, and Inter's
    // default spacing makes them look loose and slightly juvenile at 12–13px
    // against a figure. Tightening about a hundredth of an em gives them the
    // set-tight look of a plate in a textbook without touching the body copy.
    //
    // A traditional serif was the alternative. It is *not* used here because
    // the SVG carries live text rather than outlines, so a serif would have to
    // come from either a system stack (Times on one machine, Liberation Serif
    // on another, Georgia on a third — the same figure setting differently per
    // reader) or a webfont the site does not otherwise load. If a serif is
    // ever wanted, this is the single line to change, plus loading the face.
    style: {
      fontFamily: "inherit",
      fontSize: "13px",
      letterSpacing: "-0.011em",
      background: "transparent",
      ...style,
    },
    ...rest,
    x: { tickSize: 0, tickPadding: 8, labelArrow: "none", ...x },
    y: { tickSize: 0, tickPadding: 8, labelArrow: "none", grid: true, ...y },
    color: { ...color },
    marks,
  });
}

// ── Small maths helpers, so specs stay about the picture ────────────────────

/** `n` evenly spaced values across [min, max], inclusive of both ends. */
export function linspace(min, max, n) {
  return Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));
}

/** Normal probability density at `x`. */
export function normalPdf(x, mean = 0, sd = 1) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** {x, y} samples of a normal density over [from, to]. 161 points is smooth
 *  to the eye at any width we render and keeps the path a third the bytes of
 *  the 401-point version. */
export function normalCurve(from, to, mean = 0, sd = 1, n = 161) {
  return linspace(from, to, n).map((x) => ({ x, y: normalPdf(x, mean, sd) }));
}

/**
 * A seeded pseudo-random generator (mulberry32).
 *
 * Every spec that uses random data MUST draw from one of these. The build
 * writes its output into a file that is diffed on every run, so an unseeded
 * `Math.random()` would rewrite the chart, and dirty the working tree, on
 * every single build.
 */
export function rng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller normal draws from a seeded uniform generator. */
export function normalSamples(n, mean = 0, sd = 1, seed = 42) {
  const u = rng(seed);
  return Array.from({ length: n }, () => {
    const a = Math.max(u(), Number.EPSILON);
    const b = u();
    return mean + sd * Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  });
}

/** Mean of an array of numbers. */
export function mean(xs) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
