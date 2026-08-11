/**
 * Grouped against stacked, on one set of numbers, so the choice reads as what
 * it is: picking which comparison is easy and which is hard.
 *
 * Stacked gives every category's total as the bar's full height, and gives up
 * comparing the parts: only the bottom segment starts at zero, so judging
 * whether Mobile grew from Q1 to Q4 means comparing two lengths that share no
 * baseline. Grouped does the opposite. Every segment sits on the axis, so the
 * parts are directly comparable and the total is nowhere on the chart.
 *
 * There is no default. The question decides: "which quarter was biggest?" is a
 * stacked question, "did Mobile grow?" is a grouped one, and a chart trying to
 * answer both answers one of them badly. If both genuinely matter, that is two
 * charts, which is the honest cost rather than a compromise mark that does
 * neither well.
 */
import { Plot, plot, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Four quarters split across three channels, drawn as stacked bars and as grouped bars. The stacked version shows each quarter's total; the grouped version shows each channel on a common baseline.";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const CHANNELS = [
  { key: "Mobile", values: [18, 24, 31, 39] },
  { key: "Web", values: [30, 29, 30, 28] },
  { key: "Partner", values: [12, 14, 13, 16] },
];

const STACKED = "Stacked: totals are easy, parts are not";
const GROUPED = "Grouped: parts are easy, totals are gone";

const rows = [];
QUARTERS.forEach((q, qi) => {
  let base = 0;
  CHANNELS.forEach((c, ci) => {
    const v = c.values[qi];
    rows.push({
      panel: STACKED,
      key: c.key,
      color: SERIES[ci],
      x1: qi - 0.36,
      x2: qi + 0.36,
      y1: base,
      y2: base + v,
    });
    base += v;
    const w = 0.72 / CHANNELS.length;
    rows.push({
      panel: GROUPED,
      key: c.key,
      color: SERIES[ci],
      x1: qi - 0.36 + ci * w,
      x2: qi - 0.36 + (ci + 1) * w,
      y1: 0,
      y2: v,
    });
  });
});

const TOTALS = QUARTERS.map((q, i) => ({
  q,
  i,
  total: CHANNELS.reduce((s, c) => s + c.values[i], 0),
}));

const MAX_TOTAL = Math.max(...TOTALS.map((d) => d.total));

const MOBILE = CHANNELS[0];
const GROWTH = MOBILE.values.at(-1) - MOBILE.values[0];

export const caption = `The same twelve numbers. Stacked, each bar's height is the quarter's total and only the bottom segment starts at zero, so asking whether Mobile grew means comparing lengths that share no baseline. Grouped, every segment sits on the axis and Mobile's rise of ${GROWTH} is plain, but no bar is a quarter's total any more. There is no default: "which quarter was biggest?" is a stacked question and "did Mobile grow?" is a grouped one. When both genuinely matter, the honest answer is two charts rather than one mark that does neither well.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 52,
    marginRight: 88,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [STACKED, GROUPED] },
    x: {
      label: null,
      domain: [-0.6, QUARTERS.length - 0.4],
      ticks: QUARTERS.map((_, i) => i),
      tickFormat: (i) => QUARTERS[i],
    },
    // The domain has to clear the tallest *stack*, not the tallest number in
    // the data: Q4 totals 83, so a domain stopping at 78 drew that bar and its
    // printed total straight through the panel title above it. Plot does not
    // clip marks to the frame, so an under-sized domain is not a visible
    // truncation — it is a mark in the margin. `MAX_TOTAL` plus room for the
    // label keeps the arithmetic tied to the data.
    y: { label: "Orders (thousands)", domain: [0, MAX_TOTAL + 10], ticks: 4 },
    marks: [
      Plot.rect(rows, {
        fx: "panel",
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: 0.8,
      }),
      // The total, printed only where the chart actually shows one.
      Plot.text(TOTALS, {
        fx: () => STACKED,
        x: "i",
        y: "total",
        text: (d) => String(d.total),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        dy: -9,
        ...HALO,
      }),
      // Mobile's growth, which only the grouped panel makes legible.
      Plot.ruleY([MOBILE.values[0]], {
        fx: () => GROUPED,
        stroke: GUIDE,
        strokeDasharray: "4 3",
      }),
      // Centred over the bar that did the growing, rather than trailing right
      // from it: a `start` anchor here runs out of the frame and into the
      // legend sitting in the right margin.
      Plot.text([{}], {
        fx: () => GROUPED,
        x: QUARTERS.length - 1 - 0.36 + 0.72 / CHANNELS.length / 2,
        y: MOBILE.values.at(-1),
        text: () => `Mobile: +${GROWTH}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),
      // One legend, in the right margin, since both panels use one palette.
      ...CHANNELS.map((c, i) =>
        Plot.text([{}], {
          fx: () => GROUPED,
          frameAnchor: "right",
          text: () => c.key,
          fill: SERIES[i],
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
          dy: -20 + i * 16,
          ...HALO,
        }),
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
