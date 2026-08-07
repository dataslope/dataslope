/**
 * Calibration: whether a model's 0.8 actually means eighty percent.
 *
 * Predicted probability on the x axis, observed frequency on the y, in bins.
 * A perfectly calibrated model sits on the diagonal. The two curves here are
 * both *discriminating* well, in the sense that higher scores really do mean
 * higher risk, and neither of them is calibrated: one is systematically
 * overconfident and one under.
 *
 * This is the property AUC cannot see. AUC depends only on the ranking, so a
 * model whose probabilities are all half what they should be scores exactly as
 * well as one that is right, and only this chart tells them apart. If anything
 * downstream consumes the number rather than the order, calibration is the
 * property that matters.
 *
 * The gap quoted in the caption is measured from the drawn bins.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Observed frequency against predicted probability for two models, with the diagonal marking perfect calibration. One curve sits below the line at every bin and the other above.";

const BINS = linspace(0.05, 0.95, 10);

const MODELS = [
  {
    key: "Overconfident",
    color: ACCENT,
    // Says 0.9, is right 0.72 of the time.
    observed: (p) => p - 0.16 * Math.sin(Math.PI * p),
  },
  {
    key: "Underconfident",
    color: PRIMARY,
    observed: (p) => p + 0.16 * Math.sin(Math.PI * p),
  },
];

const rows = MODELS.flatMap((m) =>
  BINS.map((p) => ({ key: m.key, color: m.color, p, observed: m.observed(p) })),
);

const WORST = rows.reduce(
  (best, r) => (Math.abs(r.observed - r.p) > Math.abs(best.observed - best.p) ? r : best),
  rows[0],
);

export const caption =
  `Both models rank cases correctly, so both score the same AUC. Neither means what it says: at a predicted ${(WORST.p * 100).toFixed(0)}% the ${WORST.key.toLowerCase()} one is right ${(WORST.observed * 100).toFixed(0)}% of the time. AUC depends only on the order, so it cannot see this at all. If anything downstream multiplies by the probability, this is the chart that matters.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 60,
    marginRight: 96,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Predicted probability", labelAnchor: "center", domain: [0, 1], ticks: 5, tickFormat: "%" },
    y: { label: "Observed frequency", domain: [0, 1], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.line(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        { x: "x", y: "y", stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" },
      ),
      Plot.line(rows, { x: "p", y: "observed", z: "key", stroke: "color", strokeWidth: 2 }),
      Plot.dot(rows, { x: "p", y: "observed", fill: "color", r: 3.5 }),
      Plot.text(
        MODELS.map((m) => ({ key: m.key, color: m.color, p: 0.95, observed: m.observed(0.95) })),
        {
          x: "p",
          y: "observed",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0.62,
        y: 0.5,
        text: () => "perfect calibration",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: 16,
        ...HALO,
      }),
    ],
  });
}
