/**
 * A confusion matrix with the four cells sized by how often they happen, so
 * the metrics computed from it stop being formulas to memorise.
 *
 * The counts are a realistic screening case: a rare positive class and a
 * classifier that is good but not perfect. Precision, recall, accuracy and
 * specificity are all computed from the same four numbers and printed beside
 * the cells they come from, which is the point: they are four different
 * questions about one table, and a model can be excellent at one and useless
 * at another.
 *
 * Accuracy is deliberately included and deliberately unimpressive-looking next
 * to precision, because that gap is the entire reason accuracy is a bad
 * default on imbalanced data.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A two-by-two confusion matrix with cells labelled true positive, false negative, false positive and true negative, and the precision, recall, accuracy and specificity computed from those four counts.";

const TP = 180;
const FN = 45;
const FP = 320;
const TN = 9455;

const TOTAL = TP + FN + FP + TN;
const precision = TP / (TP + FP);
const recall = TP / (TP + FN);
const accuracy = (TP + TN) / TOTAL;
const specificity = TN / (TN + FP);

export const caption =
  `One table, four questions. This model finds ${(recall * 100).toFixed(0)}% of the real positives, and only ${(precision * 100).toFixed(0)}% of the cases it flags are real. Its accuracy is ${(accuracy * 100).toFixed(1)}%, which sounds excellent and is mostly a report on the ${((TN / TOTAL) * 100).toFixed(0)}% of the data that is negative and easy. Accuracy is the one number here that a rare positive class makes meaningless.`;

const CELLS = [
  { x: "Predicted +", y: "Actual +", n: TP, label: "True positive", good: true },
  { x: "Predicted −", y: "Actual +", n: FN, label: "False negative", good: false },
  { x: "Predicted +", y: "Actual −", n: FP, label: "False positive", good: false },
  { x: "Predicted −", y: "Actual −", n: TN, label: "True negative", good: true },
];

const METRICS = [
  { name: "Recall", value: recall, note: "of real positives, found" },
  { name: "Precision", value: precision, note: "of flags, real" },
  { name: "Specificity", value: specificity, note: "of negatives, cleared" },
  { name: "Accuracy", value: accuracy, note: "of everything, correct" },
];

export function render() {
  return plot({
    height: 330,
    marginTop: 40,
    marginLeft: 86,
    marginRight: 214,
    marginBottom: 42,
    ariaLabel: title,
    x: { label: null, domain: ["Predicted +", "Predicted −"], padding: 0.06 },
    y: { label: null, domain: ["Actual +", "Actual −"], padding: 0.06 },
    marks: [
      Plot.cell(CELLS, {
        x: "x",
        y: "y",
        fill: (d) => (d.good ? PRIMARY : ACCENT),
        fillOpacity: (d) => (d.good ? 0.22 : 0.3),
      }),
      Plot.text(CELLS, {
        x: "x",
        y: "y",
        text: (d) => `${d.label}\n${d.n.toLocaleString()}`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.5,
        ...HALO,
      }),
      // The metrics, in the right margin, each one a reading of the cells.
      // frameAnchor alone, with no x/y: giving both pins the mark to a band
      // cell and the anchor is ignored, which left these unrendered entirely.
      ...METRICS.map((m, i) =>
        Plot.text([{}], {
          frameAnchor: "right",
          text: () => `${m.name}  ${(m.value * 100).toFixed(1)}%\n${m.note}`,
          fill: m.name === "Accuracy" ? ACCENT : MUTED,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 22,
          dy: -84 + i * 58,
          ...HALO,
        }),
      ),
    ],
  });
}
