/**
 * Why "collect more data" stops paying: the standard error falls as σ/√n, so
 * halving it costs four times the sample.
 *
 * The curve alone would say "it goes down". The three marked points are what
 * make the √ bite: they are the sample sizes at which the standard error is
 * one half, one quarter and one eighth of its value at n = 1, and the gaps
 * between them grow by a factor of four each time.
 */
import { Plot, plot, linspace, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The standard error plotted against sample size, falling steeply at first and then flattening. Marks at n = 4, 16 and 64 show that each halving of the standard error costs four times the sample.";

export const caption =
  "Precision is bought at a square-root rate. Going from 4 to 16 buys as much as going from 16 to 64, which is why doubling a sample rarely feels like it did much.";

const SIGMA = 1;
const MAX_N = 100;
const se = (n) => SIGMA / Math.sqrt(n);

const curve = linspace(1, MAX_N, 200).map((n) => ({ n, se: se(n) }));

// Each halving of the standard error, and what it cost.
const MILESTONES = [
  { n: 4, label: "n = 4\nhalf" },
  { n: 16, label: "n = 16\na quarter" },
  { n: 64, label: "n = 64\nan eighth" },
];

export function render() {
  return plot({
    height: 330,
    marginTop: 24,
    marginLeft: 58,
    ariaLabel: title,
    x: { label: "Sample size (n)", labelAnchor: "center", domain: [0, MAX_N], ticks: 6 },
    y: { label: "Standard error", domain: [0, 1.02], ticks: 5 },
    marks: [
      Plot.areaY(curve, { x: "n", y: "se", fill: PRIMARY, fillOpacity: 0.1 }),
      Plot.lineY(curve, { x: "n", y: "se", stroke: PRIMARY, strokeWidth: 2 }),
      // Drop and run-out for each milestone, so the cost on the x-axis and the
      // gain on the y-axis can both be read off the same point.
      Plot.ruleX(MILESTONES, {
        x: "n",
        y1: 0,
        y2: (d) => se(d.n),
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.ruleY(MILESTONES, {
        y: (d) => se(d.n),
        x1: 0,
        x2: "n",
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.dot(MILESTONES, { x: "n", y: (d) => se(d.n), r: 3.5, fill: PRIMARY, stroke: null }),
      Plot.text(MILESTONES, {
        x: "n",
        y: (d) => se(d.n),
        text: "label",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.25,
        textAnchor: "start",
        dx: 10,
        dy: -26,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
