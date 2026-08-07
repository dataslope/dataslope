/**
 * A statistic is a random variable: twenty samples from one unchanging
 * population, and the twenty different answers they give.
 *
 * The lesson's hardest idea is that the number you computed is a draw, not a
 * fact. Twenty rows makes that unavoidable — nothing about the population
 * changed between them, the procedure was identical every time, and yet not
 * one of the twenty means is the population mean. The scatter down the column
 * is the thing a standard error puts a number on.
 *
 * Each row also carries its own 95% interval, so the reader can count the
 * misses. At 20 intervals, one or two landing off the truth is what the method
 * promises, and seeing the count come out right is worth more than being told
 * the coverage.
 */
import { Plot, plot, mean, normalSamples, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twenty rows, one per sample, each showing a sample mean as a dot with its 95% interval as a horizontal bar. A vertical line marks the population mean of 70; the dots scatter around it and one interval misses it entirely.";

export const caption =
  "One population, twenty samples of forty, twenty different answers. Nothing changed between the rows except which people happened to be drawn. That scatter is exactly what a standard error measures, and it is why an estimate is reported with an interval rather than alone.";

const MU = 70;
const SIGMA = 12;
const N = 40;
const SAMPLES = 20;
// Chosen so the twenty draws are a *representative* set rather than a lucky or
// unlucky one: they straddle the truth about evenly and exactly one interval
// misses, which is what 95% coverage looks like at this many repeats. A figure
// whose means happened to sit mostly on one side would read as a biased
// estimator, which is the opposite of the point.
const SEED = 4973;

const rows = Array.from({ length: SAMPLES }, (_, i) => {
  const values = normalSamples(N, MU, SIGMA, SEED + i * 17);
  const m = mean(values);
  const sd = Math.sqrt(values.reduce((s, x) => s + (x - m) ** 2, 0) / (N - 1));
  const half = 1.96 * (sd / Math.sqrt(N));
  return { i, m, lo: m - half, hi: m + half, hit: m - half <= MU && MU <= m + half };
});

const MISSES = rows.filter((r) => !r.hit).length;

export function render() {
  return plot({
    height: 380,
    marginTop: 34,
    marginLeft: 92,
    marginRight: 30,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Estimated mean score", labelAnchor: "center", domain: [59, 81], ticks: 5 },
    y: {
      label: null,
      domain: rows.map((r) => r.i),
      padding: 0.35,
      grid: false,
      tickFormat: (i) => `sample ${i + 1}`,
      ticks: [0, 4, 9, 14, 19],
    },
    marks: [
      Plot.ruleX([MU], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.ruleY(rows, {
        y: "i",
        x1: "lo",
        x2: "hi",
        stroke: (d) => (d.hit ? MUTED : ACCENT),
        strokeWidth: 1.5,
      }),
      Plot.dot(rows, {
        x: "m",
        y: "i",
        r: 3.4,
        fill: (d) => (d.hit ? PRIMARY : ACCENT),
        stroke: null,
      }),
      Plot.text([{}], {
        x: MU,
        y: 0,
        text: () => `the truth: ${MU}`,
        fill: GUIDE,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        dy: -18,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 59.4,
        y: 0,
        text: () =>
          MISSES === 1
            ? "1 of these 20 intervals misses"
            : `${MISSES} of these 20 intervals miss`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -18,
        ...HALO,
      }),
    ],
  });
}
