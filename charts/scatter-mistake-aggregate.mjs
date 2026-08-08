/**
 * Eight group averages that line up beautifully, and the four hundred
 * observations they were computed from, which do not.
 *
 * Plotting a `groupby().mean()` is the most common way a scatter plot ends up
 * making a claim its data will not support. Averaging destroys the
 * within-group variation and keeps only the between-group variation, so the
 * points that survive are the ones that were always going to lie on a line.
 * Eight of them, tidy and evenly spread, look like strong evidence, and the
 * correlation computed from them is large because it is a correlation between
 * eight numbers, not four hundred.
 *
 * The formal name for reading the aggregate result as if it applied to
 * individuals is the ecological fallacy, and the practical version is that the
 * left panel supports "regions with more X have more Y" and says nothing at
 * all about whether a person with more X has more Y. Here the individual-level
 * relationship is close to nothing.
 *
 * The rule: plot the observations. If there are too many to plot, use opacity
 * or a density heatmap, and if you must aggregate, say so on the chart and put
 * the group sizes somewhere the reader will see them.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Eight regional averages that fall almost on a straight line, and the four hundred individual observations behind them, which form eight overlapping clouds with almost no relationship inside any of them.";

const GROUPS = 8;
const PER = 50;
const u = rng(5238);

/** Group means genuinely differ along a line; individuals inside a group vary
 *  far more than the groups differ, and vary independently. */
const points = Array.from({ length: GROUPS }, (_, g) => {
  // The group means are scattered about a line rather than sitting exactly on
  // one, so the aggregate correlation is high without being a construction.
  const gx = 22 + g * 7.4 + (u() - 0.5) * 9;
  const gy = 30 + g * 5.1 + (u() - 0.5) * 11;
  return Array.from({ length: PER }, () => ({
    g,
    x: gx + (u() + u() + u() - 1.5) * 21,
    y: gy + (u() + u() + u() - 1.5) * 27,
  }));
}).flat();

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

const means = Array.from({ length: GROUPS }, (_, g) => {
  const inside = points.filter((p) => p.g === g);
  return { g, x: mean(inside.map((p) => p.x)), y: mean(inside.map((p) => p.y)), n: inside.length };
});

function corr(rows) {
  const mx = mean(rows.map((d) => d.x));
  const my = mean(rows.map((d) => d.y));
  const sxy = rows.reduce((s, d) => s + (d.x - mx) * (d.y - my), 0);
  const sx = Math.sqrt(rows.reduce((s, d) => s + (d.x - mx) ** 2, 0));
  const sy = Math.sqrt(rows.reduce((s, d) => s + (d.y - my) ** 2, 0));
  return sxy / (sx * sy);
}

const R_MEANS = corr(means);
/** The within-group correlation, pooled: the number that describes a person
 *  rather than a region. */
const R_WITHIN = mean(
  Array.from({ length: GROUPS }, (_, g) => corr(points.filter((p) => p.g === g))),
);

const AGG = `Group means (n = ${GROUPS})`;
const RAW = `Every observation (n = ${points.length})`;

const rows = [
  ...means.map((m) => ({ ...m, panel: AGG })),
  ...points.map((p) => ({ ...p, panel: RAW })),
];

export const caption = `Plotting a groupby().mean() is the commonest way a scatter plot ends up making a claim its data cannot support. Averaging throws away the variation within each group and keeps only the variation between groups, so what survives is exactly the part that was always going to lie on a line. Eight tidy points give a correlation of ${R_MEANS.toFixed(2)}; the ${points.length} observations they came from give about ${R_WITHIN.toFixed(2)} inside a group. Reading the first as if it described individuals is the ecological fallacy: the left panel supports "regions with more of x have more of y" and says nothing whatever about whether a person with more of x has more of y. Plot the observations. If there are too many, reach for opacity or a density heatmap, and if you must aggregate, say so on the chart and put the group sizes where the reader will see them.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 44,
    marginRight: 20,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: [AGG, RAW] },
    x: { label: "x", labelAnchor: "center", domain: [-20, 130], ticks: 4 },
    y: { label: "y", domain: [-40, 120], ticks: 4 },
    marks: [
      Plot.dot(
        rows.filter((d) => d.panel === RAW),
        { fx: "panel", x: "x", y: "y", r: 2, fill: PRIMARY, fillOpacity: 0.35 },
      ),
      // The means, drawn in both panels, so the second panel shows what was
      // kept and what was thrown away at the same time.
      Plot.link(
        [AGG, RAW].map((panel) => ({ panel })),
        {
          fx: "panel",
          x1: means[0].x,
          y1: means[0].y,
          x2: means.at(-1).x,
          y2: means.at(-1).y,
          stroke: GUIDE,
          strokeDasharray: "5 4",
        },
      ),
      Plot.dot(
        [AGG, RAW].flatMap((panel) => means.map((m) => ({ ...m, panel }))),
        { fx: "panel", x: "x", y: "y", r: 5, fill: ACCENT },
      ),
      Plot.text([{}], {
        fx: () => AGG,
        frameAnchor: "bottom-right",
        text: () => `r = ${R_MEANS.toFixed(2)}`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -5,
        dy: -5,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => RAW,
        frameAnchor: "bottom-right",
        text: () => `r = ${R_WITHIN.toFixed(2)} within a group`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -5,
        dy: -5,
        ...HALO,
      }),
    ],
  });
}
