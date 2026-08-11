/**
 * What "95% confidence" actually promises: draw 40 fresh samples from a
 * population whose mean you happen to know, build a 95% interval from each,
 * and about one in twenty misses.
 *
 * The figure exists to move the randomness to the right place. μ is a single
 * fixed vertical line that never moves; the intervals are what jump around.
 * That is the whole misreading the lesson is trying to kill ("there is a 95%
 * chance μ is in *this* interval"), and it is much easier to see than to say.
 *
 * The misses are drawn in the accent color, thicker, *and* labelled, so they
 * are never identified by color alone.
 */
import { Plot, plot, mean, normalSamples, ACCENT, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One hundred 95% confidence intervals, each built from its own sample of the same population. Almost all of them cross the vertical line marking the true mean; a handful, marked with a cross, miss it entirely.";

const TRUE_MEAN = 50;
const TRUE_SD = 10;
const SAMPLE_SIZE = 25;
// 100 intervals, matching the simulation the lesson runs a few paragraphs
// later. It is also the number that makes the figure reliable: at 40 the most
// likely outcome is one or two misses and an unremarkable seed can easily
// produce none at all, which would have the picture quietly contradicting its
// own caption. At 100, five is expected and zero is a 1-in-170 event.
const INTERVALS = 100;
// t critical value for a 95% interval at 24 degrees of freedom. Hard-coded
// rather than computed: it is one number, and a t-quantile routine would be
// the only reason this file needed a dependency.
const T_CRIT = 2.0639;

function sd(xs) {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

// Seeded, so the figure is byte-identical on every build (see rng() in
// _theme.mjs). Each interval gets its own stream, so adding intervals later
// leaves the existing ones untouched.
const intervals = Array.from({ length: INTERVALS }, (_, i) => {
  const sample = normalSamples(SAMPLE_SIZE, TRUE_MEAN, TRUE_SD, 1000 + i);
  const m = mean(sample);
  const margin = (T_CRIT * sd(sample)) / Math.sqrt(SAMPLE_SIZE);
  const lo = m - margin;
  const hi = m + margin;
  return { i: i + 1, mean: m, lo, hi, covers: lo <= TRUE_MEAN && TRUE_MEAN <= hi };
});

const missed = intervals.filter((d) => !d.covers);

export const caption =
  `${INTERVALS} samples, ${INTERVALS} intervals, one fixed truth. The interval is the thing ` +
  `that moves: ${missed.length} of these ${INTERVALS} landed somewhere that misses μ ` +
  `entirely, marked with a cross.`;

export function render() {
  return plot({
    height: 560,
    marginLeft: 30,
    marginRight: 26,
    marginTop: 30,
    ariaLabel: title,
    x: { label: "Estimated mean", labelAnchor: "center", grid: true },
    // The sample index is a nominal ordering, not a quantity, so it carries no
    // ticks and no label; the rows only need to be separate from one another.
    y: { label: null, ticks: [], domain: [0, INTERVALS + 2], grid: false },
    marks: [
      Plot.ruleX([TRUE_MEAN], { stroke: MUTED, strokeWidth: 1.5 }),
      Plot.text([TRUE_MEAN], {
        x: (d) => d,
        y: INTERVALS + 1.6,
        text: (d) => `True μ = ${d}`,
        fill: MUTED,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
      }),
      Plot.ruleY(intervals, {
        y: "i",
        x1: "lo",
        x2: "hi",
        stroke: (d) => (d.covers ? PRIMARY : ACCENT),
        strokeWidth: (d) => (d.covers ? 1.25 : 2.25),
        strokeOpacity: (d) => (d.covers ? 0.7 : 1),
      }),
      Plot.dot(intervals.filter((d) => d.covers), {
        x: "mean",
        y: "i",
        r: 1.6,
        fill: PRIMARY,
        stroke: null,
      }),
      // A cross, not just a color: the misses have to be findable without
      // relying on hue (and at 100 rows there is no space for row labels).
      Plot.dot(missed, {
        x: "mean",
        y: "i",
        symbol: "times",
        r: 4,
        stroke: ACCENT,
        strokeWidth: 2,
      }),
    ],
  });
}
