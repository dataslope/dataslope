/**
 * What the normal's two parameters actually do: μ slides the curve along the
 * axis, σ changes how wide and how tall it is.
 *
 * Three curves on one pair of axes rather than three panels, because the claim
 * is comparative. Labelled in place instead of with a legend: the reader
 * shouldn't have to match colours to a key to read a three-line chart.
 */
import { Plot, plot, normalCurve, normalPdf, SERIES } from "./_theme.mjs";

export const title =
  "Three normal curves: the standard normal, one shifted three units right by a larger mean, and one flattened and widened by a larger standard deviation.";

export const caption =
  "μ sets where the bell sits; σ sets how wide it spreads. The shape is always the same.";

// `labelAt` is where the label sits on the x-axis, defaulting to the curve's
// own peak. The wide σ = 2 curve moves its label out onto the left flank: over
// its peak it would land on top of the σ = 1 curve crossing behind it.
const CURVES = [
  { label: "μ = 0, σ = 1", mean: 0, sd: 1, color: SERIES[0] },
  { label: "μ = 3, σ = 1", mean: 3, sd: 1, color: SERIES[1] },
  { label: "μ = 0, σ = 2", mean: 0, sd: 2, color: SERIES[3], labelAt: -2.9 },
];

export function render() {
  return plot({
    height: 320,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: [-6, 8] },
    y: { label: "Density", domain: [0, 0.47] },
    marks: [
      ...CURVES.map((c) =>
        Plot.lineY(normalCurve(-6, 8, c.mean, c.sd), {
          x: "x",
          y: "y",
          stroke: c.color,
          strokeWidth: 2,
        }),
      ),
      // Each label sits just above its own peak, so colour is a reinforcement
      // rather than the only way to tell the curves apart.
      Plot.text(CURVES, {
        x: (d) => d.labelAt ?? d.mean,
        y: (d) => normalPdf(d.labelAt ?? d.mean, d.mean, d.sd) + 0.028,
        text: "label",
        fill: (d) => d.color,
        fontSize: 12.5,
        fontWeight: 600,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
