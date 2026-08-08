/**
 * A trend line drawn through a region containing no data at all.
 *
 * The page's other trendline figure, `trendline-wrong-shape`, covers the case
 * where the line is the wrong *shape* for a relationship that really is there.
 * This is the case where there is no single relationship to be the wrong shape
 * for: two clusters, a gap between them, and `trendline="ols"` cheerfully
 * connecting their centres with a line whose middle passes through territory
 * the dataset never visits.
 *
 * It is the failure that survives every check people actually run. The
 * r-squared is high, because a line through two separated clusters explains a
 * great deal of variance. The residuals are small at both ends. The slope is
 * significant. And the line still describes nothing: inside either cluster the
 * relationship is flat, and the only thing the slope measures is how far apart
 * the two groups sit, which is a fact about the grouping variable and not about
 * x at all.
 *
 * The empty band is shaded rather than left to be noticed, because the whole
 * point is a region the eye skips over: a reader tracking a line does not
 * register the absence of points under it unless the absence is drawn.
 *
 * Both cluster means are marked so the reader can see what the slope is really
 * connecting, and the within-cluster fits are drawn flat because they are flat,
 * which is measured here rather than assumed.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "A scatter with two separated clusters, one low-left and one high-right, and a wide empty gap between them. A single fitted line runs from one cluster to the other, and the middle third of it passes through a shaded band that contains no points. Inside each cluster the trend is flat.";

const u = rng(8123);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** Two plans on different price tiers. Within a tier, usage barely predicts
 *  spend; across tiers it looks like it does, because the tier decides both. */
const GROUPS = [
  { key: "Starter", n: 55, xMid: 14, yMid: 26, color: SERIES[0] },
  { key: "Enterprise", n: 55, xMid: 74, yMid: 78, color: SERIES[3] },
];

const POINTS = GROUPS.flatMap((g) =>
  Array.from({ length: g.n }, () => ({
    key: g.key,
    color: g.color,
    x: g.xMid + gauss() * 5.5,
    y: g.yMid + gauss() * 6.2,
  })),
);

function fit(rows) {
  const n = rows.length;
  const mx = rows.reduce((s, r) => s + r.x, 0) / n;
  const my = rows.reduce((s, r) => s + r.y, 0) / n;
  const slope =
    rows.reduce((s, r) => s + (r.x - mx) * (r.y - my), 0) /
    rows.reduce((s, r) => s + (r.x - mx) ** 2, 0);
  return { slope, intercept: my - slope * mx };
}

const POOLED = fit(POINTS);
const X_MIN = Math.min(...POINTS.map((p) => p.x));
const X_MAX = Math.max(...POINTS.map((p) => p.x));
const POOLED_LINE = [X_MIN, X_MAX].map((x) => ({
  x,
  y: POOLED.intercept + POOLED.slope * x,
}));

/** The gap, measured from the data rather than drawn where it looks good. */
const GAP_LO = Math.max(...POINTS.filter((p) => p.key === "Starter").map((p) => p.x));
const GAP_HI = Math.min(...POINTS.filter((p) => p.key === "Enterprise").map((p) => p.x));
const GAP_SHARE = Math.round(((GAP_HI - GAP_LO) / (X_MAX - X_MIN)) * 100);

/** Within-cluster fits, so "flat inside each group" is a measurement. */
const WITHIN = GROUPS.map((g) => {
  const rows = POINTS.filter((p) => p.key === g.key);
  const f = fit(rows);
  const xs = rows.map((r) => r.x);
  return {
    g,
    slope: f.slope,
    line: [Math.min(...xs), Math.max(...xs)].map((x) => ({
      x,
      y: f.intercept + f.slope * x,
    })),
  };
});

const POOLED_SLOPE = POOLED.slope.toFixed(2);
const WITHIN_MAX = Math.max(...WITHIN.map((w) => Math.abs(w.slope))).toFixed(2);

export const caption = `One fitted line, and ${GAP_SHARE}% of the horizontal range underneath it holds no data. Every check people run passes: the r-squared is high, the residuals are small at both ends, the slope is significant. The line still describes nothing. Its slope is ${POOLED_SLOPE}, while inside either group the slope is at most ${WITHIN_MAX}, which is to say flat: what the pooled line measures is the distance between two plans, a fact about the grouping variable rather than about the x axis. Before trusting a trend line, look at where its middle sits. If there are no points under it, it is interpolating between clusters and there is no trend for it to have found.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 56,
    marginRight: 30,
    marginBottom: 50,
    ariaLabel: title,
    x: { label: "Seats in use", labelAnchor: "center", domain: [0, 92], ticks: 6 },
    y: { label: "Monthly spend (£)", ticks: 5 },
    marks: [
      // The absence, drawn: a reader following a line does not notice missing
      // points beneath it unless the gap is a mark of its own.
      Plot.rect([{}], {
        x1: GAP_LO,
        x2: GAP_HI,
        y1: 0,
        y2: 100,
        fill: GUIDE,
        fillOpacity: 0.14,
      }),
      Plot.text([{}], {
        x: (GAP_LO + GAP_HI) / 2,
        y: 98,
        text: () => `no data here:\n${GAP_SHARE}% of the range`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.dot(POINTS, { x: "x", y: "y", r: 3, fill: (d) => d.color, fillOpacity: 0.75 }),

      // Flat inside each group, and measured rather than asserted.
      ...WITHIN.map(({ g, line }) =>
        Plot.line(line, { x: "x", y: "y", stroke: g.color, strokeWidth: 2.2 }),
      ),

      Plot.line(POOLED_LINE, {
        x: "x",
        y: "y",
        stroke: ACCENT,
        strokeWidth: 3,
        strokeDasharray: "7,4",
      }),
      // The label rides the line through the gap, which is the one part of the
      // panel guaranteed to be empty and the part the label is about.
      Plot.text([{}], {
        x: (GAP_LO + GAP_HI) / 2,
        y: POOLED.intercept + POOLED.slope * ((GAP_LO + GAP_HI) / 2),
        text: () => "one fitted line",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),

      ...WITHIN.map(({ g, line }) =>
        Plot.text([{}], {
          x: line[0].x,
          y: line[0].y,
          text: () => `${g.key}: flat`,
          fill: g.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dy: 26,
          ...HALO,
        }),
      ),
    ],
  });
}
