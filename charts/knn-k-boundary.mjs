/**
 * The k in k-nearest-neighbours, drawn as the decision boundary it produces.
 *
 * Three values of k over identical training data. At k = 1 every point owns
 * its own island and the boundary wraps around single mislabelled examples,
 * which is memorisation rather than learning. At k = 75 the boundary is nearly
 * a straight line and the model has stopped noticing the actual shape of the
 * classes. In between it follows the real structure and ignores the noise.
 *
 * This is the bias-variance tradeoff with a knob you can turn, which is why
 * the lesson calls k "the dial that controls everything": small k is high
 * variance, large k is high bias, and neither end is a bug.
 *
 * The boundary is computed by classifying a grid, exactly as sklearn's own
 * plotting examples do, so it is the real k-NN decision surface rather than a
 * drawing of one.
 */
import { Plot, plot, linspace, normalSamples, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three k-nearest-neighbour decision boundaries over the same two-class training data, at k of 1, 15 and 75. At k = 1 the boundary is jagged and encircles individual points; at 15 it is smooth and follows the classes; at 75 it is almost a straight line.";

export const caption =
  "The same points, three values of k. Small k memorises, including the mislabelled examples; large k smooths until the shape of the classes is gone. The dial is the bias-variance tradeoff, and neither end of it is a bug.";

const PER_CLASS = 60;
const KS = [1, 15, 75];

/** Two overlapping clusters, plus a handful of deliberately mislabelled points
 *  so the k = 1 panel has something to wrap itself around. */
const points = [
  ...normalSamples(PER_CLASS, 3.6, 1.15, 11).map((x, i) => ({
    x,
    y: normalSamples(PER_CLASS, 3.4, 1.15, 12)[i],
    label: 0,
  })),
  ...normalSamples(PER_CLASS, 6.4, 1.15, 13).map((x, i) => ({
    x,
    y: normalSamples(PER_CLASS, 6.2, 1.15, 14)[i],
    label: 1,
  })),
  // The noise: four points on the wrong side.
  { x: 6.1, y: 5.6, label: 0 },
  { x: 3.1, y: 3.9, label: 1 },
  { x: 5.6, y: 6.4, label: 0 },
  { x: 4.2, y: 2.9, label: 1 },
];

const GRID_N = 46;
const AXIS = linspace(0.5, 9.5, GRID_N);

/** Majority vote of the k nearest training points, which is k-NN. */
function classify(px, py, k) {
  const nearest = points
    .map((p) => ({ label: p.label, d: (p.x - px) ** 2 + (p.y - py) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
  const ones = nearest.filter((p) => p.label === 1).length;
  return ones * 2 > k ? 1 : 0;
}

const cells = KS.flatMap((k) =>
  AXIS.flatMap((px) => AXIS.map((py) => ({ panel: `k = ${k}`, px, py, pred: classify(px, py, k) }))),
);

const training = KS.flatMap((k) => points.map((p) => ({ ...p, panel: `k = ${k}` })));

const STEP = (9.5 - 0.5) / (GRID_N - 1);

export function render() {
  return plot({
    height: 280,
    marginTop: 32,
    marginLeft: 34,
    marginBottom: 40,
    ariaLabel: title,
    fx: { label: null, domain: KS.map((k) => `k = ${k}`) },
    x: { label: null, domain: [0.5, 9.5], ticks: [] },
    y: { label: null, domain: [0.5, 9.5], ticks: [] },
    marks: [
      Plot.rect(cells, {
        x1: (d) => d.px - STEP / 2,
        x2: (d) => d.px + STEP / 2,
        y1: (d) => d.py - STEP / 2,
        y2: (d) => d.py + STEP / 2,
        fx: "panel",
        fill: (d) => (d.pred === 1 ? SERIES[1] : SERIES[0]),
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.dot(training, {
        x: "x",
        y: "y",
        fx: "panel",
        r: 2.6,
        fill: (d) => (d.label === 1 ? SERIES[1] : SERIES[0]),
        fillOpacity: 0.9,
        stroke: null,
        clip: true,
      }),
      Plot.text([{ panel: "k = 1" }], {
        x: 0.9,
        y: 9.1,
        fx: "panel",
        text: () => "islands around single points",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
