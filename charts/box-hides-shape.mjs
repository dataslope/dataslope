/**
 * A box plot and the data it is summarising, stacked on one axis.
 *
 * The box is a five-number summary, and five numbers cannot describe a shape.
 * These two groups have almost the same median, the same quartiles and the
 * same whiskers, so their boxes are near-twins; the histograms underneath show
 * that one is a single mound and the other is two separate populations with a
 * gap where the median sits. The box's median line lands in a region with
 * almost no data in it.
 *
 * Drawn as boxes above histograms on a shared x rather than as two charts,
 * because the alignment is the argument: every feature of the box has to be
 * readable directly above the data it came from.
 */
import { Plot, plot, linspace, normalSamples, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Two box plots that look nearly identical, drawn above histograms of the same two groups. The first histogram is a single mound; the second is two separate peaks with a gap in the middle, exactly where its box draws the median.";

export const caption =
  "Two groups with nearly the same five-number summary. The boxes agree; the data does not. A box plot cannot show a gap, a second peak, or a pile-up, so it is a summary to check against the distribution rather than a replacement for it.";

// Wide enough to hold the whiskers, which reach the extremes on both of
// these distributions; a tighter domain ran them off the frame with no
// visible end caps, which read as a drawing bug rather than as data.
const DOMAIN = [-2, 22];
const BIN_WIDTH = 0.5;

const GROUPS = [
  {
    key: "One mound",
    color: PRIMARY,
    values: normalSamples(1200, 10, 4.1, 4242),
  },
  {
    key: "Two peaks",
    color: SERIES[1],
    values: [...normalSamples(600, 5.2, 1.5, 515), ...normalSamples(600, 14.8, 1.5, 616)],
  },
];

const quantile = (sorted, q) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/** Tukey's five numbers: the quartiles, and whiskers out to the furthest
 *  point within 1.5 IQR of the box. */
const summarise = (g) => {
  const sorted = [...g.values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const inside = sorted.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  return { ...g, q1, q2, q3, lo: inside[0], hi: inside[inside.length - 1] };
};

const BOXES = GROUPS.map(summarise);

/** Counted here rather than by Plot's bin transform, so both groups share
 *  exactly the same edges and their heights are comparable. */
function histogram(values) {
  const bins = Math.round((DOMAIN[1] - DOMAIN[0]) / BIN_WIDTH);
  const tally = new Array(bins).fill(0);
  for (const v of values) {
    const i = Math.floor((v - DOMAIN[0]) / BIN_WIDTH);
    if (i >= 0 && i < bins) tally[i] += 1;
  }
  return tally.map((c, i) => ({
    x1: DOMAIN[0] + i * BIN_WIDTH,
    x2: DOMAIN[0] + (i + 1) * BIN_WIDTH,
    share: c / values.length,
  }));
}

// Layout, in "row" units on a reversed y so row 0 is at the top: the box sits
// at `rowBase`, and its histogram stands on a baseline below it, growing
// upward toward the box.
const PEAK = 0.11;
const BASELINE = 1.15;
const HIST_H = 0.8;
const bars = GROUPS.flatMap((g, i) =>
  histogram(g.values).map((b) => ({ ...b, key: g.key, color: g.color, row: i })),
);

const rowBase = (i) => i * 1.35;
const BOX_H = 0.16;

export function render() {
  return plot({
    height: 400,
    marginTop: 30,
    marginLeft: 96,
    marginRight: 26,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: DOMAIN, ticks: [0, 5, 10, 15, 20] },
    y: {
      label: null,
      domain: [rowBase(1) + BASELINE + 0.12, -0.42],
      ticks: [rowBase(0) + 0.6, rowBase(1) + 0.6],
      tickFormat: (v) => (v < 1 ? GROUPS[0].key : GROUPS[1].key),
      grid: false,
    },
    marks: [
      // The distributions, standing on their own baseline and growing upward
      // toward the box. (The y scale is reversed, so "up" is toward smaller
      // row values.)
      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: (d) => rowBase(d.row) + BASELINE,
        y2: (d) => rowBase(d.row) + BASELINE - (d.share / PEAK) * HIST_H,
        fill: (d) => d.color,
        fillOpacity: 0.4,
      }),
      Plot.ruleY(
        GROUPS.map((g, i) => ({ y: rowBase(i) + BASELINE })),
        { y: "y", stroke: "currentColor", strokeOpacity: 0.3 },
      ),

      // The whiskers, out to 1.5 IQR. Written as explicit numbers rather than
      // channel names because the box rows carry their own y offset.
      ...BOXES.map((b, i) =>
        Plot.ruleY([{ y: rowBase(i), lo: b.lo, hi: b.hi }], {
          y: "y",
          x1: "lo",
          x2: "hi",
          stroke: MUTED,
          strokeWidth: 1.25,
        }),
      ),
      // End caps, so a whisker that reaches the extremes reads as a whisker.
      ...BOXES.flatMap((b, i) =>
        [b.lo, b.hi].map((x) =>
          Plot.ruleX([{ x }], {
            x: "x",
            y1: rowBase(i) - BOX_H * 0.55,
            y2: rowBase(i) + BOX_H * 0.55,
            stroke: MUTED,
            strokeWidth: 1.25,
          }),
        ),
      ),
      Plot.rect(BOXES, {
        x1: "q1",
        x2: "q3",
        y1: (d, i) => rowBase(i) - BOX_H,
        y2: (d, i) => rowBase(i) + BOX_H,
        fill: (d) => d.color,
        fillOpacity: 0.22,
        stroke: (d) => d.color,
        strokeWidth: 1.25,
      }),
      Plot.ruleX(BOXES, {
        x: "q2",
        y1: (d, i) => rowBase(i) - BOX_H,
        y2: (d, i) => rowBase(i) + BOX_H,
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),

      Plot.text([{ x: BOXES[1].q2, y: rowBase(1) }], {
        x: "x",
        y: "y",
        text: () => "the median lands in the gap",
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 12,
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
