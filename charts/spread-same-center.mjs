/**
 * Why a measure of center is never enough: three distributions with the *same*
 * mean and wildly different spreads.
 *
 * The mean is drawn once, as a single rule through all three, because the
 * whole point is that it does not move. Everything the reader cares about
 * here — how far a typical value sits from the middle, how often an extreme
 * one turns up — lives in the width, which a mean cannot see.
 */
import { Plot, plot, normalCurve, normalPdf, HALO, SERIES } from "./_theme.mjs";

export const title =
  "Three normal curves centred on the same mean of 100 with standard deviations of 4, 10 and 20, drawn on one pair of axes so the identical centre and the very different spreads are visible together.";

export const caption =
  "Three distributions, one mean. Report only the center and all three of these look like the same result.";

const MEAN = 100;
const CURVES = [
  { label: "σ = 4", sd: 4, color: SERIES[0] },
  { label: "σ = 10", sd: 10, color: SERIES[1] },
  { label: "σ = 20", sd: 20, color: SERIES[3] },
];

const PEAK = normalPdf(MEAN, MEAN, 4);

export function render() {
  return plot({
    height: 330,
    marginTop: 28,
    ariaLabel: title,
    x: { label: "Score", labelAnchor: "center", domain: [30, 170] },
    y: { label: "Density", domain: [0, PEAK * 1.16] },
    marks: [
      ...CURVES.map((c) =>
        Plot.lineY(normalCurve(30, 170, MEAN, c.sd), {
          x: "x",
          y: "y",
          stroke: c.color,
          strokeWidth: 2,
        }),
      ),
      // One rule for all three: the fact it needs no repeating is the point.
      Plot.ruleX([MEAN], { stroke: "currentColor", strokeOpacity: 0.4, strokeDasharray: "3,3" }),
      Plot.text([MEAN], {
        x: (d) => d,
        y: PEAK * 1.12,
        text: () => "mean = 100 for all three",
        fill: "currentColor",
        fillOpacity: 0.75,
        fontSize: 12.5,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      // Each curve labelled at its own half-height on the right flank, which
      // is the one place all three are far enough apart to label separately.
      Plot.text(CURVES, {
        x: (d) => MEAN + 1.18 * d.sd,
        y: (d) => normalPdf(MEAN + 1.18 * d.sd, MEAN, d.sd),
        text: "label",
        fill: (d) => d.color,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
