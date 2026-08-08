/**
 * Average silhouette against k, which has a maximum where the elbow only has a
 * bend.
 *
 * `kmeans-elbow` (in *K-Means Clustering*) plots inertia, and inertia falls
 * monotonically to zero as k rises, so "lower is better" chooses nothing and
 * the reader has to find a bend by eye. Silhouette is a different kind of
 * number: it is bounded, it is not monotone in k, and it therefore has an
 * argmax that can be pointed at. That is the whole reason the page introduces
 * it, so the figure has to be the shape that inertia does not have, a peak.
 *
 * Both curves are computed rather than drawn: Lloyd's algorithm is run for
 * every k on the same generated data, and the silhouette is the textbook
 * definition over the actual assignments. The peak lands on the true k because
 * the data has four groups, not because the curve was posed.
 *
 * The second line is the *worst* cluster's silhouette rather than a second
 * summary of the average, because the average hides the failure mode that
 * matters: at k = 6 the mean is still respectable while one cluster has been
 * split in half and scores near zero. A reader choosing k off the average alone
 * would not see that, and the honest reading of a silhouette is per-cluster.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Average silhouette score against the number of clusters, rising to a clear maximum at four and falling away on both sides. A second line tracks the worst individual cluster's score, which collapses well before the average does.";

const TRUE_K = 4;
const u = rng(20260808);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** Four reasonably separated blobs: the case where a k exists to be found. */
const CENTRES = [
  [0, 0],
  [7.5, 1.2],
  [1.5, 7],
  [8.5, 8],
];
const POINTS = CENTRES.flatMap(([cx, cy]) =>
  Array.from({ length: 45 }, () => [cx + gauss() * 1.35, cy + gauss() * 1.35]),
);

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Lloyd's algorithm from a deterministic seeding (every nth point), so the
 *  result is the same on every build without needing a seeded shuffle. */
function kmeans(k) {
  let centres = Array.from({ length: k }, (_, i) =>
    POINTS[Math.floor((i * POINTS.length) / k)].slice(),
  );
  let labels = new Array(POINTS.length).fill(0);
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    POINTS.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < k; c++) if (dist(p, centres[c]) < dist(p, centres[best])) best = c;
      if (labels[i] !== best) moved = true;
      labels[i] = best;
    });
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    POINTS.forEach((p, i) => {
      const s = sums[labels[i]];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += 1;
    });
    centres = sums.map((s, c) => (s[2] ? [s[0] / s[2], s[1] / s[2]] : centres[c]));
    if (!moved && iter > 0) break;
  }
  return labels;
}

/** Textbook silhouette: (b − a) / max(a, b) per point, where a is the mean
 *  distance to its own cluster and b the mean distance to the nearest other. */
function silhouettes(labels, k) {
  const members = Array.from({ length: k }, () => []);
  labels.forEach((c, i) => members[c].push(i));
  return POINTS.map((p, i) => {
    const own = members[labels[i]];
    if (own.length <= 1) return 0;
    const a = own.reduce((s, j) => (j === i ? s : s + dist(p, POINTS[j])), 0) / (own.length - 1);
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === labels[i] || members[c].length === 0) continue;
      const mean = members[c].reduce((s, j) => s + dist(p, POINTS[j]), 0) / members[c].length;
      if (mean < b) b = mean;
    }
    return (b - a) / Math.max(a, b);
  });
}

const KS = [2, 3, 4, 5, 6, 7, 8, 9];
const SCORES = KS.map((k) => {
  const labels = kmeans(k);
  const sil = silhouettes(labels, k);
  const overall = sil.reduce((s, v) => s + v, 0) / sil.length;
  // Per-cluster means, so the weakest cluster can be tracked separately.
  const per = Array.from({ length: k }, (_, c) => {
    const vals = sil.filter((_, i) => labels[i] === c);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  });
  return { k, overall, worst: Math.min(...per) };
});

const BEST = SCORES.reduce((a, b) => (b.overall > a.overall ? b : a));
const AT = (k) => SCORES.find((s) => s.k === k);

export const caption = `Silhouette scores how well each point sits in the cluster it was given: near 1 is comfortably inside its own group, near 0 is on a boundary, negative is closer to a different group. Unlike inertia it does not improve automatically with more clusters, so the curve has a maximum rather than a bend, and here it lands on ${BEST.k}, which is the number of groups the data was built with. Read the lower line too. At k = ${AT(6).k} the average is still ${AT(6).overall.toFixed(2)}, respectable enough to talk yourself into, while the weakest cluster has fallen to ${AT(6).worst.toFixed(2)}: a real group has been split and the average is covering for it. A silhouette is per-cluster evidence, and the mean of it is a summary like any other.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 30,
    marginLeft: 58,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Number of clusters (k)",
      labelAnchor: "center",
      domain: [KS[0] - 0.4, KS[KS.length - 1] + 0.4],
      ticks: KS,
      tickFormat: (d) => String(d),
    },
    y: { label: "Silhouette score", domain: [0, 0.8], ticks: 5 },
    marks: [
      // The chosen k, marked because the curve having an argmax at all is the
      // property that separates it from the elbow.
      Plot.ruleX([BEST.k], {
        y1: 0,
        y2: BEST.overall,
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),

      Plot.line(SCORES, { x: "k", y: "worst", stroke: MUTED, strokeWidth: 2, curve: "monotone-x" }),
      Plot.line(SCORES, {
        x: "k",
        y: "overall",
        stroke: PRIMARY,
        strokeWidth: 2.4,
        curve: "monotone-x",
      }),
      Plot.dot(SCORES, { x: "k", y: "overall", r: 3, fill: PRIMARY }),
      Plot.dot([BEST], { x: "k", y: "overall", r: 6, fill: ACCENT, stroke: null }),

      Plot.text([BEST], {
        x: "k",
        y: "overall",
        text: () => `best at k = ${BEST.k}`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -16,
        ...HALO,
      }),
      Plot.text([{}], {
        x: KS[KS.length - 1],
        y: SCORES[SCORES.length - 1].overall,
        text: () => "average\nsilhouette",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([{}], {
        x: KS[KS.length - 1],
        y: SCORES[SCORES.length - 1].worst,
        text: () => "weakest single\ncluster",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),

      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
