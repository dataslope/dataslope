/**
 * Maximum likelihood, drawn as the thing the name describes: a curve over
 * candidate parameter values, and the one that sits at the top.
 *
 * The data is a fixed coin-flip result. The curve is the likelihood of exactly
 * that result for every possible bias, and its peak is at the sample
 * proportion, which is the MLE. Three sample sizes with the same proportion
 * show the other half of the idea: more data does not move the peak, it
 * narrows the curve, and that narrowing is where confidence intervals and
 * standard errors come from.
 *
 * Each curve is normalised to its own maximum so the three are comparable in
 * shape; the caption says so, because the y axis is otherwise a quantity whose
 * absolute value means nothing.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Relative likelihood against a coin's bias for three sample sizes with the same seventy-percent heads rate. All three peak at 0.7; the curve for ten flips is broad and the one for five hundred is a narrow spike.";

const P_HAT = 0.7;
const SAMPLES = [10, 60, 500];
const GRID = linspace(0.01, 0.99, 300);

/** Log-likelihood of `k` heads in `n` flips at bias `p`. Kept in log space:
 *  0.7^350 underflows a double long before the curve is interesting. */
const logLik = (p, n) => n * P_HAT * Math.log(p) + n * (1 - P_HAT) * Math.log(1 - p);

const rows = SAMPLES.flatMap((n, i) => {
  const peak = logLik(P_HAT, n);
  return GRID.map((p) => ({
    key: `${n} flips`,
    color: SERIES[i % SERIES.length],
    n,
    p,
    // Relative to each curve's own maximum, so all three top out at 1.
    rel: Math.exp(logLik(p, n) - peak),
  }));
});

/** Width of the region within 15% of the peak: a rough, drawable stand-in for
 *  the precision the curve encodes. */
const widths = SAMPLES.map((n, i) => {
  const inside = GRID.filter((p) => Math.exp(logLik(p, n) - logLik(P_HAT, n)) > 0.15);
  return {
    key: `${n} flips`,
    color: SERIES[i % SERIES.length],
    width: inside.at(-1) - inside[0],
  };
});

export const caption =
  `The likelihood of the data you actually saw, for every bias the coin might have. All three samples are ${P_HAT * 100}% heads, so all three peak in the same place: the MLE does not move. What moves is the width. Ten flips leaves a band about ${widths[0].width.toFixed(2)} wide; five hundred narrows it to ${widths[2].width.toFixed(2)}. Each curve is scaled to its own maximum, since only the shape is comparable.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 82,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Candidate bias", labelAnchor: "center", domain: [0, 1], ticks: 5 },
    y: { label: "Relative likelihood", domain: [0, 1.1], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "p", y: "rel", stroke: "color", strokeWidth: 2 }),
      Plot.ruleX([P_HAT], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: P_HAT,
        y: 1.06,
        text: () => `MLE = ${P_HAT}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text(
        SAMPLES.map((n, i) => ({
          key: `${n} flips`,
          color: SERIES[i % SERIES.length],
          p: i === 2 ? P_HAT + 0.04 : P_HAT + 0.1 + i * 0.06,
          rel: 0.72 - i * 0.24,
        })),
        {
          x: "p",
          y: "rel",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 6,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0.02,
        y: 1.04,
        text: () => "more data does not move the peak,\nit narrows the curve",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
