/**
 * Precision and recall against the decision threshold, which is the dial the
 * lesson keeps pointing at.
 *
 * Almost every classifier produces a score, not a label; the label appears
 * only when a threshold is applied. Sliding it does not make the model better
 * or worse, it trades one error for the other: raise it and precision climbs
 * while recall falls, lower it and the reverse. There is no setting that
 * maximises both, which is why "the model is 90% accurate" is an incomplete
 * sentence and why the right threshold is a question about consequences rather
 * than about the model.
 *
 * F1 is drawn too, and its peak is marked, because that peak is exactly what
 * "optimise F1" means and it is worth seeing that it sits nowhere near the
 * default of 0.5 when the classes are unbalanced.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Precision, recall and F1 plotted against the decision threshold from zero to one. Recall falls steadily as the threshold rises while precision climbs, and the F1 curve peaks between them well below the usual default of 0.5.";

export const caption =
  "Sliding the threshold does not improve the model, it trades false alarms against misses. There is no setting that maximises both, so the choice is about which error costs more, not about the classifier.";

// A scored population: 12% positive, and scores that overlap the way a real
// classifier's do. Modelled as two beta-ish densities so the curves are smooth
// and the trade-off is the honest shape rather than a sketch.
const PREVALENCE = 0.12;
const density = (x, a, b) => Math.pow(x, a - 1) * Math.pow(1 - x, b - 1);
const POS = (x) => density(x, 5, 2.2);
const NEG = (x) => density(x, 2, 6);

const GRID = linspace(0.001, 0.999, 400);
const area = (f) => GRID.reduce((s, x) => s + f(x), 0);
const POS_TOTAL = area(POS);
const NEG_TOTAL = area(NEG);

/** Fraction of a class scoring at or above `t`. */
const above = (f, total, t) =>
  GRID.filter((x) => x >= t).reduce((s, x) => s + f(x), 0) / total;

const THRESHOLDS = linspace(0.02, 0.98, 120);

const rows = THRESHOLDS.map((t) => {
  const tp = above(POS, POS_TOTAL, t) * PREVALENCE;
  const fp = above(NEG, NEG_TOTAL, t) * (1 - PREVALENCE);
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp / PREVALENCE;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { t, precision, recall, f1 };
});

const BEST = rows.reduce((a, b) => (b.f1 > a.f1 ? b : a));

const CURVES = [
  { key: "Precision", accessor: "precision", color: SERIES[0] },
  { key: "Recall", accessor: "recall", color: SERIES[1] },
  { key: "F1", accessor: "f1", color: MUTED },
];

const lines = CURVES.flatMap((c) =>
  rows.map((r) => ({ key: c.key, color: c.color, t: r.t, value: r[c.accessor] })),
);

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 96,
    ariaLabel: title,
    x: {
      label: "Decision threshold",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: 5,
    },
    y: { label: null, domain: [0, 1.02], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.ruleX([0.5], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 0.5,
        y: 0.03,
        text: () => "the default, 0.5",
        fill: GUIDE,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.lineY(lines, {
        x: "t",
        y: "value",
        z: "key",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),
      Plot.dot([BEST], { x: "t", y: "f1", r: 4, fill: ACCENT, stroke: null }),
      Plot.text([BEST], {
        x: "t",
        y: "f1",
        text: (d) => `F1 peaks at ${d.t.toFixed(2)}`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        dy: -14,
        ...HALO,
      }),
      // Only Precision and Recall are named at the right edge; F1 ends at zero
      // alongside Recall and is already named at its marked peak.
      Plot.text(
        CURVES.filter((c) => c.key !== "F1").map((c) => ({
          ...c,
          value: rows[rows.length - 1][c.accessor],
        })),
        {
          x: 1,
          y: "value",
          text: "key",
          fill: (d) => d.color,
          fontSize: 12,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
        },
      ),
    ],
  });
}
