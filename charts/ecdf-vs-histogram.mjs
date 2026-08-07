/**
 * What an ECDF buys you and what it costs, on one bimodal sample.
 *
 * The staircase is the ECDF: at every observation it steps up by 1/n, so any
 * quantile is a horizontal read and the median needs no estimation at all.
 * Where the curve is steep the data is dense; where it is flat there is a gap.
 * That flat stretch in the middle *is* the valley between the two clusters —
 * present, but far less obvious than a histogram would make it.
 *
 * So the same sample's histogram is drawn along the bottom as a silhouette,
 * scaled to a fixed slice of the frame and labelled as such. It is there to be
 * compared in shape, not measured: the y axis belongs to the ECDF, and pretending
 * a share-per-bin could share it would be a lie about one of the two.
 *
 * That scaling is also why this is one panel rather than two facets. Plot facets
 * share every scale, and these two curves do not agree on what y means.
 */
import { Plot, plot, linspace, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The ECDF of a bimodal sample: a staircase rising from 0 to 100 percent, steep where observations are dense and flat across the gap between the two clusters, with the median read off at the halfway line and the sample's histogram drawn small along the bottom for comparison.";

export const caption =
  "An ECDF has no bin width to choose: the steps are the data. Any quantile is a horizontal read, and the median needs no estimating. What it gives up is shape: the gap between the two clusters is only a flat stretch here, where the histogram underneath makes it a valley.";

const N = 220;
const SAMPLE = [
  ...normalSamples(Math.round(N * 0.55), 168, 6, 71),
  ...normalSamples(N - Math.round(N * 0.55), 196, 7, 72),
].sort((a, b) => a - b);

/** The empirical CDF: a step of 1/n at each observation. */
const steps = SAMPLE.map((v, i) => ({ v, f: (i + 1) / SAMPLE.length }));

const MEDIAN = SAMPLE[Math.floor(SAMPLE.length / 2)];
const DOMAIN = [150, 216];

// The silhouette: binned by hand so it can be scaled into a fixed slice of the
// frame rather than fighting the ECDF for the y scale.
const EDGES = linspace(DOMAIN[0], DOMAIN[1], 28);
const counts = EDGES.slice(0, -1).map((lo, i) => {
  const hi = EDGES[i + 1];
  const n = SAMPLE.filter((v) => v >= lo && v < hi).length;
  return { lo, hi, share: n / SAMPLE.length };
});
/** Tallest bin fills this much of the frame; everything else is proportional. */
const STRIP = 0.2;
const scale = STRIP / Math.max(...counts.map((c) => c.share));
const silhouette = counts.map((c) => ({ ...c, h: c.share * scale }));

export function render() {
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 56,
    marginRight: 24,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Flipper length (mm)", labelAnchor: "center", domain: DOMAIN, ticks: 5 },
    y: { label: "Share of sample at or below", domain: [0, 1.02], ticks: 5, tickFormat: "%" },
    marks: [
      // Drawn first and kept pale: this is a shape reference, not a measurement.
      Plot.rectY(silhouette, {
        x1: "lo",
        x2: "hi",
        y1: 0,
        y2: "h",
        fill: MUTED,
        fillOpacity: 0.3,
      }),
      Plot.text([{}], {
        x: DOMAIN[1] - 2,
        y: STRIP,
        text: () => "the same sample as a histogram,\ndrawn small, for shape only",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dy: -14,
        ...HALO,
      }),

      Plot.line(steps, {
        x: "v",
        y: "f",
        stroke: PRIMARY,
        strokeWidth: 2.25,
        curve: "step-after",
      }),

      Plot.ruleY([0.5], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot([{ v: MEDIAN }], { x: "v", y: 0.5, fill: ACCENT, r: 4.5 }),
      Plot.text([{}], {
        x: DOMAIN[0] + 2,
        y: 0.5,
        text: () => `median: ${Math.round(MEDIAN)} mm,\nread straight off the 50% line`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dy: -22,
        ...HALO,
      }),

      Plot.text([{}], {
        x: 163,
        y: 0.3,
        text: () => "steep:\ndense here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 178,
        y: 0.72,
        text: () => "flat: the gap\nbetween clusters",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
