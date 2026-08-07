/**
 * The curse of dimensionality, as the two facts that actually bite.
 *
 * The line is the share of a unit hypercube's volume lying within the outer
 * 10% shell: 1 - 0.8^d. In two dimensions it is a third; by ten it is nine
 * tenths; by fifty essentially everything. There is no "middle" of a
 * high-dimensional space, so "near the centre" stops meaning anything.
 *
 * The dots are the consequence for anything distance-based. At each dimension
 * they show the ratio of the nearest to the farthest neighbour among a sample
 * of uniform points: it climbs toward 1, which is to say every point becomes
 * about equally far from every other. When that ratio is 0.95, "nearest
 * neighbour" is a coin toss.
 *
 * The ratio is measured from a real sample at each dimension rather than taken
 * from a formula, so it carries the sampling variation an actual dataset would.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, PRIMARY } from "./_theme.mjs";

export const title =
  "Two curves against dimension: the share of a hypercube's volume in its outer shell, rising to nearly one by ten dimensions, and the ratio of nearest to farthest neighbour distance, climbing toward one as every point becomes equally far from every other.";

const DIMS = [1, 2, 3, 5, 8, 12, 20, 30, 50, 75, 100];
const SHELL = 0.1;

/** Share of a unit cube's volume within `SHELL` of a face. */
const shellShare = (d) => 1 - (1 - 2 * SHELL) ** d;

const next = rng(24601);

/** Mean over trials of (nearest neighbour distance / farthest), for uniform
 *  points in d dimensions. */
function distanceRatio(d, points = 60, trials = 6) {
  let total = 0;
  for (let t = 0; t < trials; t++) {
    const pts = Array.from({ length: points }, () =>
      Array.from({ length: d }, () => next()),
    );
    const origin = pts[0];
    let min = Infinity;
    let max = 0;
    for (let i = 1; i < pts.length; i++) {
      let sq = 0;
      for (let k = 0; k < d; k++) sq += (pts[i][k] - origin[k]) ** 2;
      const dist = Math.sqrt(sq);
      if (dist < min) min = dist;
      if (dist > max) max = dist;
    }
    total += min / max;
  }
  return total / trials;
}

const rows = DIMS.map((d) => ({ d, shell: shellShare(d), ratio: distanceRatio(d) }));
const TEN = rows.find((r) => r.d === 12);

export const caption =
  `By ${TEN.d} dimensions, ${(TEN.shell * 100).toFixed(0)}% of a unit cube's volume lies within a tenth of its surface: there is no middle left to be near. Distances follow. The nearest neighbour is already ${(TEN.ratio * 100).toFixed(0)}% as far away as the farthest, and every method that relies on "close" degrades with it.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 128,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Dimensions",
      labelAnchor: "center",
      domain: [1, 100],
      ticks: [1, 3, 10, 30, 100],
      tickFormat: String,
    },
    y: { label: null, domain: [0, 1.06], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.line(rows, { x: "d", y: "shell", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.line(rows, { x: "d", y: "ratio", stroke: ACCENT, strokeWidth: 2 }),
      Plot.dot(rows, { x: "d", y: "ratio", fill: ACCENT, r: 3 }),
      Plot.ruleY([1], { stroke: GUIDE, strokeOpacity: 0.5, strokeDasharray: "3,3" }),
      Plot.text([rows.at(-1)], {
        x: "d",
        y: "shell",
        text: () => "share of volume in\nthe outer 10% shell",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: -12,
        ...HALO,
      }),
      Plot.text([rows.at(-1)], {
        x: "d",
        y: "ratio",
        text: () => "nearest neighbour,\nas a share of farthest",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: 16,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
