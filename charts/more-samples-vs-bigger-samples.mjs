/**
 * Two things people mean by "more data", and only one of them is precision.
 *
 * A sampling distribution has two knobs. You can draw *more samples*, which
 * gives you more copies of the estimate, or you can make *each sample bigger*,
 * which makes every copy better. They look similar in a sentence and do
 * completely different things to the picture.
 *
 * Drawing more samples fills in the histogram. The shape gets smoother, the
 * bars get less ragged, and the width does not move, because the width of a
 * sampling distribution is the standard error and the standard error is
 * `σ/√n` where n is the size of *one* sample. Making each sample bigger
 * narrows it, by the square root of the factor: sixteen times the n gives a
 * distribution `√16 = 4` times tighter, and that is the entire content of
 * "more data helps".
 *
 * The draws are the lesson's own: its "More samples vs. larger samples" block
 * (statistics-for-data-science-python/sampling-distributions.mdx), a
 * population of a million from Normal(50, 18) with `default_rng(1)`, then
 * lever 1 (n = 40 with 500 to 32,000 samples) and lever 2 (4,000 samples with
 * n = 10 to 640). Each panel is one lever at its two ends, or at n = 160 for
 * the second, where n = 640 is too narrow to draw beside n = 10. A spec cannot
 * replay numpy's generator, so the histograms below are those runs, in
 * one-point bins, and the spreads are the ones the block prints. This
 * regenerates them:
 *
 *     import numpy as np
 *     rng = np.random.default_rng(1)
 *     population = rng.normal(50.0, 18.0, size=1_000_000)
 *     def means_of(n, k):  # the lesson's sd_of_means, keeping the means
 *         return np.array([rng.choice(population, size=n, replace=False).mean() for _ in range(k)])
 *     runs = [(40, k) for k in (500, 2000, 8000, 32000)] + [(n, 4000) for n in (10, 40, 160, 640)]
 *     means = {run: means_of(*run) for run in runs}
 *     for run in [(40, 500), (40, 32000), (10, 4000), (160, 4000)]:
 *         m = means[run]
 *         lo = int(np.floor(m.min()))
 *         counts = np.histogram(m, bins=np.arange(lo, np.floor(m.max()) + 2))[0]
 *         print(run, round(float(m.std()), 2), lo, counts.tolist())
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

const RUNS = {
  few: {
    n: 40,
    samples: 500,
    spread: 2.78,
    lo: 42,
    counts: [2, 5, 14, 28, 19, 41, 63, 72, 65, 68, 48, 38, 19, 10, 8],
  },
  many: {
    n: 40,
    samples: 32000,
    spread: 2.85,
    lo: 37,
    counts: [
      1, 2, 5, 18, 58, 169, 342, 688, 1290, 2157, 3071, 3904, 4340, 4312, 3969, 2960, 2153,
      1323, 703, 325, 134, 52, 19, 4, 0, 1,
    ],
  },
  small: {
    n: 10,
    samples: 4000,
    spread: 5.61,
    lo: 31,
    counts: [
      2, 0, 2, 2, 18, 23, 17, 33, 50, 64, 89, 110, 141, 177, 192, 223, 278, 270, 297, 299, 267,
      251, 226, 199, 173, 151, 126, 98, 67, 51, 39, 20, 16, 13, 7, 2, 1, 4, 0, 0, 2,
    ],
  },
  big: {
    n: 160,
    samples: 4000,
    spread: 1.43,
    lo: 45,
    counts: [11, 56, 243, 648, 1012, 1062, 631, 252, 77, 7, 1],
  },
};

for (const [key, run] of Object.entries(RUNS)) {
  const total = run.counts.reduce((s, c) => s + c, 0);
  if (total !== run.samples) {
    throw new Error(`more-samples-vs-bigger-samples: ${key} holds ${total} means, not ${run.samples}`);
  }
}

const NARROWER = (RUNS.small.spread / RUNS.big.spread).toFixed(1);
const THEORY = Math.sqrt(RUNS.big.n / RUNS.small.n);
const fmt = (v) => v.toLocaleString("en-US");

export const title = `Two experiments on one population, each a histogram of sample means. Left: samples of ${RUNS.few.n}, drawn ${fmt(RUNS.few.samples)} times and ${fmt(RUNS.many.samples)} times; the two are equally wide, one ragged and one smooth. Right: ${fmt(RUNS.small.samples)} samples of ${RUNS.small.n} and of ${RUNS.big.n}; the bigger samples give a histogram about ${THEORY} times narrower.`;

export const caption = `Means of samples from a population with mean 50 and spread 18. Drawing ${fmt(RUNS.many.samples)} samples of ${RUNS.few.n} instead of ${fmt(RUNS.few.samples)} smooths the histogram and leaves its spread where it was, ${RUNS.many.spread} against ${RUNS.few.spread}. Making each sample ${RUNS.big.n / RUNS.small.n} times bigger narrows it by √${RUNS.big.n / RUNS.small.n} = ${THEORY} in theory and ${NARROWER} in the simulation.`;

const DOMAIN = [28, 72];
const YMAX = 0.3;
const LEFT = panel(0, { x: DOMAIN, y: [0, YMAX] });
const RIGHT = panel(1, { x: DOMAIN, y: [0, YMAX] });

/** One-point bins as shares of the run, so 500 means and 32,000 sit on one
 *  scale. */
const shares = (run) =>
  run.counts.map((c, k) => ({ from: run.lo + k, to: run.lo + k + 1, share: c / run.samples }));

/** Filled bars, in frame units. */
const bars = (p, run) =>
  shares(run)
    .filter((b) => b.share > 0)
    .map((b) => ({ x1: p.px(b.from), x2: p.px(b.to), y: p.py(b.share) }));

/** The histogram's outline as one stepped path, closed down to the baseline
 *  at both ends. */
const outline = (p, run) => {
  const bins = shares(run);
  return [
    { x: p.px(bins[0].from), y: p.py(0) },
    ...bins.flatMap((b) => [
      { x: p.px(b.from), y: p.py(b.share) },
      { x: p.px(b.to), y: p.py(b.share) },
    ]),
    { x: p.px(bins.at(-1).to), y: p.py(0) },
  ];
};

/** A two-line label beside a series, in its color. */
const label = (p, { x, y, text, fill, anchor }) =>
  Plot.text([{}], {
    x: p.px(x),
    y: p.py(y),
    text: () => text,
    fill,
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.3,
    textAnchor: anchor,
    ...HALO,
  });

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(LEFT, { ticks: [0, 0.1, 0.2, 0.3], format: (v) => `${Math.round(v * 100)}%` }),
      ...panelAxis(RIGHT, { ticks: [0, 0.1, 0.2, 0.3], format: (v) => `${Math.round(v * 100)}%` }),
      panelTitle(LEFT, `More samples, each of n = ${RUNS.few.n}`, { fill: ACCENT }),
      panelTitle(RIGHT, `${fmt(RUNS.small.samples)} samples, bigger n`, { fill: PRIMARY }),
      panelBaseline(LEFT),
      panelBaseline(RIGHT),

      // Each lever's far end is filled; where it started is the outline.
      Plot.rect(bars(LEFT, RUNS.many), {
        x1: "x1",
        x2: "x2",
        y1: LEFT.py(0),
        y2: "y",
        fill: ACCENT,
        fillOpacity: 0.5,
      }),
      Plot.rect(bars(RIGHT, RUNS.big), {
        x1: "x1",
        x2: "x2",
        y1: RIGHT.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.55,
      }),
      Plot.line(outline(LEFT, RUNS.few), { x: "x", y: "y", stroke: MUTED, strokeWidth: 1.6 }),
      Plot.line(outline(RIGHT, RUNS.small), { x: "x", y: "y", stroke: MUTED, strokeWidth: 1.6 }),

      label(LEFT, {
        x: 45,
        y: 0.125,
        text: `${fmt(RUNS.many.samples)} samples\nspread ${RUNS.many.spread}`,
        fill: ACCENT,
        anchor: "end",
      }),
      label(LEFT, {
        x: 55,
        y: 0.155,
        text: `${fmt(RUNS.few.samples)} samples\nspread ${RUNS.few.spread}`,
        fill: MUTED,
        anchor: "start",
      }),
      label(RIGHT, {
        x: 54,
        y: 0.205,
        text: `n = ${RUNS.big.n}\nspread ${RUNS.big.spread}`,
        fill: PRIMARY,
        anchor: "start",
      }),
      label(RIGHT, {
        x: 41.5,
        y: 0.095,
        text: `n = ${RUNS.small.n}\nspread ${RUNS.small.spread}`,
        fill: MUTED,
        anchor: "end",
      }),

      ...[LEFT, RIGHT].map((p) =>
        Plot.text(
          [30, 40, 50, 60, 70].map((v) => ({ v, x: p.px(v) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => String(d.v),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 14,
          },
        ),
      ),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: LEFT.bottom,
        text: () => "smoother, and just as wide",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: RIGHT.bottom,
        text: () => `${NARROWER} times narrower`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 32,
        ...HALO,
      }),
    ],
  });
}
