/**
 * A second peak is almost always a second population.
 *
 * The left panel is one histogram of one column, and it has two humps. That is
 * the point at which a summary statistic stops being useful: the mean of this
 * sample lands in the valley between the peaks, at a value that is *less*
 * common than either mode, and the standard deviation describes the distance
 * between two groups rather than the spread of anything.
 *
 * The right panel is the same numbers with the grouping variable put back. It
 * was there all along, in a column nobody plotted.
 *
 * That is the useful reflex. Bimodality is not a property a variable has; it is
 * a symptom, and the diagnosis is nearly always that two things have been
 * pooled. Commuting times mixing drivers with cyclists. Response times mixing
 * cache hits with cache misses. Heights mixing men and women. Prices mixing
 * two currencies. Test scores mixing two cohorts.
 *
 * Once found, the fix is not to fit a fancier distribution. It is to split, and
 * report both groups, because everything downstream, the mean, the interval,
 * the test, the model, was assuming one population.
 *
 * The awkward case worth naming: sometimes the grouping variable was never
 * recorded, and then a mixture model can recover the two components from the
 * shape alone. That is a real technique and a much weaker piece of evidence,
 * because a two-component fit will happily split a distribution that is merely
 * skewed.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One column of response times drawn as a single histogram with two humps, and the same numbers split by the cache-hit flag that was in the data all along. The pooled mean lands in the valley between the peaks.";

const HITS = normalSamples(240, 42, 9, 1_913);
const MISSES = normalSamples(110, 118, 17, 8_221);
const ALL = [...HITS, ...MISSES];
const POOLED_MEAN = mean(ALL);

const DOMAIN = [0, 180];
const BINS = 36;
const W = (DOMAIN[1] - DOMAIN[0]) / BINS;
const histogram = (values) => {
  const counts = new Array(BINS).fill(0);
  for (const v of values) {
    const k = Math.floor((v - DOMAIN[0]) / W);
    if (k >= 0 && k < BINS) counts[k] += 1;
  }
  return counts.map((c, k) => ({ from: DOMAIN[0] + k * W, to: DOMAIN[0] + (k + 1) * W, c }));
};

const POOLED = histogram(ALL);
const YMAX = Math.max(...POOLED.map((d) => d.c)) * 1.15;

const ONE = panel(0, { x: DOMAIN, y: [0, YMAX] });
const SPLIT = panel(1, { x: DOMAIN, y: [0, YMAX] });

const bars = (p, values) =>
  histogram(values)
    .filter((b) => b.c > 0)
    .map((b) => ({ ...b, x1: p.px(b.from), x2: p.px(b.to), y: p.py(b.c) }));

/** How many observations fall in the bin the pooled mean lands in, against the
 *  tallest bin: the mean is not a typical value here and the chart can say so
 *  with a number. */
const MEAN_BIN = POOLED.find((b) => POOLED_MEAN >= b.from && POOLED_MEAN < b.to);
const TALLEST = Math.max(...POOLED.map((d) => d.c));

export const caption = `The left panel is one column with two humps, and that is the point where a summary stops being useful. The pooled mean is ${POOLED_MEAN.toFixed(0)} ms, which lands in the valley between the peaks, in a bin holding ${MEAN_BIN.c} observations against the tallest bin's ${TALLEST}: the average is less common than either mode. The standard deviation is no better, since it is now measuring the distance between two groups rather than the spread of anything. The right panel is the same numbers with the grouping put back, and it was in the data all along, in a column nobody plotted. That is the reflex worth having. Bimodality is not a property a variable has, it is a symptom, and the diagnosis is almost always that two things were pooled: drivers with cyclists, cache hits with cache misses, two cohorts, two currencies. The fix is not a fancier distribution, it is to split and report both, because everything downstream, the mean, the interval, the test, the model, assumed one population. The awkward case is when the grouping was never recorded. A mixture model can then recover the components from the shape alone, which is a real technique and much weaker evidence, because a two-component fit will happily split a distribution that is merely skewed.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 50,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(ONE, { ticks: [0, 20, 40, 60] }),
      ...panelAxis(SPLIT, { ticks: [0, 20, 40, 60] }),
      panelTitle(ONE, "One column, two humps", { fill: ACCENT }),
      panelTitle(SPLIT, "The same rows, split by cache hit", { fill: PRIMARY }),
      panelBaseline(ONE),
      panelBaseline(SPLIT),

      Plot.rect(bars(ONE, ALL), {
        x1: "x1",
        x2: "x2",
        y1: ONE.py(0),
        y2: "y",
        fill: MUTED,
        fillOpacity: 0.55,
      }),
      Plot.rect(bars(SPLIT, HITS), {
        x1: "x1",
        x2: "x2",
        y1: SPLIT.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.62,
      }),
      Plot.rect(bars(SPLIT, MISSES), {
        x1: "x1",
        x2: "x2",
        y1: SPLIT.py(0),
        y2: "y",
        fill: ACCENT,
        fillOpacity: 0.62,
      }),

      Plot.link([{}], {
        x1: ONE.px(POOLED_MEAN),
        x2: ONE.px(POOLED_MEAN),
        y1: ONE.py(0),
        y2: ONE.py(YMAX * 0.86),
        stroke: ACCENT,
        strokeWidth: 1.6,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: ONE.px(POOLED_MEAN),
        y: ONE.py(YMAX * 0.86),
        text: () => `mean ${POOLED_MEAN.toFixed(0)} ms,\nin the valley`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -4,
        ...HALO,
      }),
      Plot.text([{}], {
        x: SPLIT.px(42),
        y: SPLIT.py(YMAX * 0.76),
        text: () => `cache hit\n${HITS.length} rows`,
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: SPLIT.px(126),
        y: SPLIT.py(YMAX * 0.42),
        text: () => `cache miss\n${MISSES.length} rows`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      ...[ONE, SPLIT].map((p) =>
        Plot.text(
          [0, 60, 120, 180].map((v) => ({ v, x: p.px(v) })),
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
      ...[ONE, SPLIT].map((p) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: p.bottom,
          text: () => "response time (ms)",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 32,
          ...HALO,
        }),
      ),
    ],
  });
}
