/**
 * The single most important hyperparameter of a decision tree, and the shape
 * that explains why every tree needs one.
 *
 * Training accuracy climbs to a perfect score as depth rises, because a deep
 * enough tree can isolate every training row in its own leaf. Validation
 * accuracy peaks and then falls, because those leaves are memorised noise. The
 * gap between the curves is the overfitting, and it is unbounded: a tree with
 * no depth limit will always reach 100% on its training set.
 *
 * That is why trees are the textbook overfitting example. Most models degrade
 * gracefully when over-parameterised; an unpruned tree goes all the way to
 * memorisation and reports a perfect score on the way.
 *
 * The best depth is found by scanning the validation curve, not chosen by eye.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Training and validation accuracy against tree depth. Training rises to one hundred percent and stays there; validation peaks around depth five and then declines.";

const DEPTHS = Array.from({ length: 18 }, (_, i) => i + 1);

const rows = DEPTHS.flatMap((d) => [
  { depth: d, split: "Training", acc: Math.min(1, 0.62 + 0.055 * d) },
  // Rises while splits are real, falls once they are fitting noise, and is
  // bounded below: an unbounded quadratic sent this negative by depth 18,
  // which is not a thing an accuracy can be.
  { depth: d, split: "Validation", acc: 0.5 + 0.26 * Math.exp(-((d - 5) ** 2) / 28) },
]);

const BEST = rows
  .filter((r) => r.split === "Validation")
  .reduce((best, r) => (r.acc > best.acc ? r : best));
const DEEP = DEPTHS.at(-1);
const gap =
  rows.find((r) => r.depth === DEEP && r.split === "Training").acc -
  rows.find((r) => r.depth === DEEP && r.split === "Validation").acc;

export const caption =
  `A tree with no depth limit reaches a perfect training score every time, because it can give every row its own leaf. Validation peaks at depth ${BEST.depth} and falls away; by depth ${DEEP} the gap is ${(gap * 100).toFixed(0)} points of pure memorisation. This is why max_depth, min_samples_leaf or pruning is not optional on a tree the way it nearly is on other models.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 92,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Maximum tree depth", labelAnchor: "center", domain: [1, DEEP], ticks: 6 },
    y: { label: "Accuracy", domain: [0.4, 1.04], ticks: 5, tickFormat: "%" },
    color: { domain: ["Training", "Validation"], range: [PRIMARY, ACCENT] },
    marks: [
      Plot.line(rows, { x: "depth", y: "acc", stroke: "split", strokeWidth: 2 }),
      Plot.ruleX([BEST.depth], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.dot([BEST], { x: "depth", y: "acc", fill: ACCENT, r: 5 }),
      Plot.text([BEST], {
        x: "depth",
        y: "acc",
        text: (d) => `best at depth ${d.depth}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        dy: -10,
        ...HALO,
      }),
      Plot.text(
        ["Training", "Validation"].map((split) => ({
          split,
          depth: DEEP,
          acc: rows.find((r) => r.depth === DEEP && r.split === split).acc,
        })),
        {
          x: "depth",
          y: "acc",
          text: "split",
          fill: "split",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 1.4,
        y: 1.0,
        text: () => "an unpruned tree always gets here",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
