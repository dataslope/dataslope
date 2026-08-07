/**
 * The empirical rule: how much of a normal distribution lies within one, two
 * and three standard deviations of the mean.
 *
 * Nested bands rather than three separate panels, so the reader sees the areas
 * as containing one another (which is the point — 95% *includes* the 68%) and
 * can compare their widths directly. The overlapping fills also do the work a
 * legend would: the core is visibly the densest region.
 *
 * Each percentage is named by a span bracket above the curve rather than by a
 * label dropped somewhere in the shading, so the label's extent *is* the claim:
 * "this much of the x-axis holds 95% of the area".
 */
import { Plot, plot, normalCurve, normalPdf, ACCENT, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A normal curve with the regions within one, two and three standard deviations shaded, holding 68%, 95% and 99.7% of the distribution.";

export const caption =
  "The empirical rule. Almost everything a normal distribution produces lands within three standard deviations of the mean.";

const curve = normalCurve(-4, 4);
const band = (lo, hi) => curve.filter((d) => d.x >= lo && d.x <= hi);

// Widest first, so the narrower bands stack on top and the shared opacity
// accumulates into a visibly denser core. `at` is the bracket's height: the
// wider the span, the higher it sits, so the three brackets nest too.
const BANDS = [
  { lo: -3, hi: 3, label: "99.7%", at: 0.54 },
  { lo: -2, hi: 2, label: "95%", at: 0.485 },
  { lo: -1, hi: 1, label: "68%", at: 0.43 },
];

const TICK = 0.012; // half-height of a bracket's end tick

export function render() {
  return plot({
    height: 360,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Standard deviations from the mean",
      labelAnchor: "center",
      domain: [-4, 4],
      ticks: [-3, -2, -1, 0, 1, 2, 3],
      tickFormat: (d) => (d === 0 ? "μ" : `${d > 0 ? "+" : "−"}${Math.abs(d)}σ`),
    },
    // The y-axis carries no information here (density units mean nothing to a
    // reader meeting this curve for the first time), and the extra headroom is
    // what the brackets sit in.
    y: { label: null, ticks: [], grid: false, domain: [0, 0.58] },
    marks: [
      ...BANDS.map(({ lo, hi }) =>
        Plot.areaY(band(lo, hi), { x: "x", y: "y", fill: PRIMARY, fillOpacity: 0.16 }),
      ),
      Plot.lineY(curve, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
      // Boundary drops, so ±1σ, ±2σ and ±3σ can be found on the axis without
      // tracing down from the curve by eye.
      Plot.ruleX([-3, -2, -1, 1, 2, 3], {
        y1: 0,
        y2: (d) => normalPdf(d),
        stroke: MUTED,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),

      // ── Span brackets ──
      Plot.ruleY(BANDS, { y: "at", x1: "lo", x2: "hi", stroke: MUTED, strokeWidth: 1 }),
      Plot.ruleX(
        BANDS.flatMap((b) => [
          { x: b.lo, at: b.at },
          { x: b.hi, at: b.at },
        ]),
        { x: "x", y1: (d) => d.at - TICK, y2: (d) => d.at + TICK, stroke: MUTED, strokeWidth: 1 },
      ),
      Plot.text(BANDS, {
        x: 0,
        y: (d) => d.at + 0.022,
        text: "label",
        fill: ACCENT,
        fontSize: 13,
        fontWeight: 600,
      }),
    ],
  });
}
