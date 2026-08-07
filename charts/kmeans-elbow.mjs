/**
 * The elbow method, and the reason it is a judgement rather than a formula.
 *
 * Within-cluster sum of squares falls monotonically as k rises, all the way to
 * zero when every point is its own cluster, so "lower is better" chooses
 * nothing. What the curve has instead is a bend, where the marginal drop stops
 * being worth another cluster. The data really has four groups and the bend is
 * at four, but the curve does not announce it: the drop from 4 to 5 is still
 * positive, just smaller.
 *
 * The second line is the marginal improvement, which is what a reader is
 * actually eyeballing when they look for an elbow, and which makes the
 * judgement explicit rather than intuitive.
 *
 * The inertia is computed by running Lloyd's algorithm on generated clusters,
 * so the bend is a property of the data rather than a drawn shape.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Within-cluster sum of squares against the number of clusters, falling steeply to four clusters and then flattening, with the marginal improvement per extra cluster collapsing after the same point.";

const TRUE_K = 4;
const next = rng(8642);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

const CENTERS = [
  [2, 2],
  [8, 3],
  [3, 9],
  [9, 9],
];
const POINTS = CENTERS.flatMap((c) =>
  Array.from({ length: 60 }, () => [c[0] + gauss() * 0.9, c[1] + gauss() * 0.9]),
);

/** Lloyd's algorithm from a deterministic spread of initial centroids. */
function inertia(k) {
  let centroids = Array.from({ length: k }, (_, i) => POINTS[Math.floor((i * POINTS.length) / k)]);
  for (let iter = 0; iter < 40; iter++) {
    const groups = Array.from({ length: k }, () => []);
    for (const p of POINTS) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (p[0] - centroids[c][0]) ** 2 + (p[1] - centroids[c][1]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      groups[best].push(p);
    }
    centroids = groups.map((g, c) =>
      g.length === 0
        ? centroids[c]
        : [g.reduce((s, p) => s + p[0], 0) / g.length, g.reduce((s, p) => s + p[1], 0) / g.length],
    );
  }
  let total = 0;
  for (const p of POINTS) {
    let bestD = Infinity;
    for (const c of centroids) bestD = Math.min(bestD, (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2);
    total += bestD;
  }
  return total;
}

const KS = [1, 2, 3, 4, 5, 6, 7, 8];
const rows = KS.map((k) => ({ k, wcss: inertia(k) }));
const marginal = rows.slice(1).map((r, i) => ({ k: r.k, drop: rows[i].wcss - r.wcss }));

const AT_ELBOW = marginal.find((m) => m.k === TRUE_K);
const AFTER = marginal.find((m) => m.k === TRUE_K + 1);

export const caption =
  `Inertia only ever falls, so it cannot pick k for you: at k equal to the number of points it is zero. What it has is a bend. Going to ${TRUE_K} clusters buys ${AT_ELBOW.drop.toFixed(0)}; the next one buys ${AFTER.drop.toFixed(0)}. The data really does have ${TRUE_K} groups, and the curve still does not say so outright, which is why this is a judgement.`;

const YMAX = rows[0].wcss;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 106,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Clusters (k)", labelAnchor: "center", domain: [1, KS.at(-1)], ticks: KS.length },
    y: { label: "Within-cluster sum of squares", domain: [0, YMAX * 1.08], ticks: 5 },
    marks: [
      Plot.line(rows, { x: "k", y: "wcss", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(rows, { x: "k", y: "wcss", fill: PRIMARY, r: 3.5 }),
      Plot.line(marginal, { x: "k", y: "drop", stroke: MUTED, strokeWidth: 1.75, strokeDasharray: "4,3" }),
      Plot.ruleX([TRUE_K], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "3,3" }),
      Plot.dot([rows.find((r) => r.k === TRUE_K)], { x: "k", y: "wcss", fill: ACCENT, r: 5 }),
      Plot.text([rows.find((r) => r.k === TRUE_K)], {
        x: "k",
        y: "wcss",
        text: () => `the bend, at k = ${TRUE_K}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        dy: -12,
        ...HALO,
      }),
      Plot.text([rows.at(-1)], {
        x: "k",
        y: "wcss",
        text: () => "inertia",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([marginal.at(-1)], {
        x: "k",
        y: "drop",
        text: () => "gain from one\nmore cluster",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: 22,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
