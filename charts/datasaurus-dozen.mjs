/**
 * Four pictures that share a mean, a standard deviation and a correlation.
 *
 * Anscombe made this point with eleven observations per set and a regression
 * line. The Datasaurus construction, from Matejka and Fitzmaurice in 2017,
 * makes it harder to wave away: the shapes are arbitrary, obviously
 * structured, and their summary statistics agree to two decimal places,
 * because the shapes were *built* to agree.
 *
 * They are built here the same way. Each shape is drawn freely, then put
 * through one affine transform that fixes both means, both standard
 * deviations and the correlation at the same targets. The transform cannot
 * change the shape, only its position, scale and shear, which is exactly the
 * lesson: those three statistics constrain almost nothing about what the data
 * looks like.
 *
 * The practical form of the lesson is a habit rather than an argument. Plot
 * the data before you summarise it, and plot it again after, because a
 * summary is a lossy compression whose losses are not reported anywhere in the
 * summary.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Four scatter plots with entirely different shapes, a circle, a cross, a star and a set of horizontal bands, each carrying the same mean, the same standard deviation and the same correlation.";

const u = rng(7710);
const jitter = (s) => (u() - 0.5) * s;

const ring = (n, r, cx = 0, cy = 0, from = 0, to = Math.PI * 2) =>
  Array.from({ length: n }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: cx + Math.cos(a) * r + jitter(0.1), y: cy + Math.sin(a) * r + jitter(0.1) };
  });

const segment = (n, x1, y1, x2, y2) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { x: x1 + (x2 - x1) * t + jitter(0.08), y: y1 + (y2 - y1) * t + jitter(0.08) };
  });

/** A five-pointed star, traced as ten segments between alternating radii. */
const star = (n) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 1 : 0.42;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  return pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return segment(Math.round(n / 10), p[0], p[1], q[0], q[1]);
  });
};

const SHAPES = [
  { key: "Circle", points: [...ring(90, 1), ...ring(40, 0.45)] },
  {
    key: "Cross",
    points: [
      ...segment(65, -1, -1, 1, 1),
      ...segment(65, -1, 1, 1, -1),
    ],
  },
  { key: "Star", points: star(130) },
  {
    key: "Bands",
    points: [-0.9, -0.3, 0.3, 0.9].flatMap((y) => segment(33, -1, y, 1, y)),
  },
];

// The targets, taken from the published Datasaurus summary so the numbers in
// the picture are the ones the paper reports.
const TARGET = { mx: 54.26, my: 47.83, sx: 16.76, sy: 26.93, r: -0.06 };

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;
const sd = (xs, m) => Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));

/**
 * One affine map that lands any cloud on the target moments exactly:
 * standardise both axes, remove whatever correlation the shape happened to
 * have, put the target correlation back, then rescale. Shape is preserved up
 * to position, scale and shear, which is the entire point of the figure.
 */
function conform(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const mx = mean(xs);
  const my = mean(ys);
  const sx = sd(xs, mx);
  const sy = sd(ys, my);
  const us = xs.map((v) => (v - mx) / sx);
  const vs = ys.map((v) => (v - my) / sy);
  const r0 = us.reduce((s, v, i) => s + v * vs[i], 0) / (points.length - 1);
  const k = Math.sqrt(1 - r0 * r0);
  return points.map((_, i) => {
    const a = us[i];
    const b = (vs[i] - r0 * a) / k;
    const y = TARGET.r * a + Math.sqrt(1 - TARGET.r ** 2) * b;
    return { x: TARGET.mx + TARGET.sx * a, y: TARGET.my + TARGET.sy * y };
  });
}

const rows = SHAPES.flatMap((s) =>
  conform(s.points).map((p) => ({ ...p, key: s.key })),
);

/** Recomputed from the drawn points rather than copied from the targets, so
 *  the labels are a measurement of the figure and not a promise about it. */
const stats = SHAPES.map((s) => {
  const pts = rows.filter((p) => p.key === s.key);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const mx = mean(xs);
  const my = mean(ys);
  const sx = sd(xs, mx);
  const sy = sd(ys, my);
  const r =
    xs.reduce((acc, v, i) => acc + ((v - mx) / sx) * ((ys[i] - my) / sy), 0) /
    (pts.length - 1);
  return { key: s.key, mx, my, sx, sy, r };
});

const S = stats[0];

export const caption = `Anscombe made this point with eleven observations and a regression line. The Datasaurus construction, from Matejka and Fitzmaurice in 2017, is harder to wave away: the shapes are arbitrary, obviously structured, and their summary statistics agree to two decimal places, because the shapes were built to agree. These four are built the same way. Each was drawn freely and then put through one affine transform that fixes both means at ${S.mx.toFixed(1)} and ${S.my.toFixed(1)}, both standard deviations at ${S.sx.toFixed(1)} and ${S.sy.toFixed(1)}, and the correlation at ${S.r.toFixed(2)}. The transform can move, scale and shear a cloud, and it cannot change its shape, which is the lesson: those five numbers constrain almost nothing about what the data looks like. The habit that follows is to plot the data before summarising it and again afterwards, because a summary is a lossy compression that does not report its own losses.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 44,
    marginRight: 18,
    // Room under the axis for the statistics block, which is the argument and
    // so gets its own band rather than sharing a line with the ticks.
    marginBottom: 76,
    ariaLabel: title,
    fx: { label: null, domain: SHAPES.map((s) => s.key) },
    x: { label: null, domain: [10, 100], ticks: 3 },
    y: { label: null, domain: [-20, 115], ticks: 4 },
    marks: [
      Plot.dot(rows, {
        fx: "key",
        x: "x",
        y: "y",
        r: 1.9,
        fill: PRIMARY,
        fillOpacity: 0.75,
      }),
      // The identical statistics, printed under every panel, since the
      // repetition is the argument.
      Plot.text(stats, {
        fx: "key",
        frameAnchor: "bottom",
        text: (d) =>
          `x̄ ${d.mx.toFixed(1)}   ȳ ${d.my.toFixed(1)}   r ${d.r.toFixed(2)}\nsx ${d.sx.toFixed(1)}   sy ${d.sy.toFixed(1)}`,
        fill: MUTED,
        fontSize: 10,
        lineHeight: 1.4,
        dy: 52,
        ...HALO,
      }),
    ],
  });
}
