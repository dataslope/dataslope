/**
 * The three ways a series fails to be stationary, one per row, against a
 * stationary series for comparison.
 *
 * The lesson states stationarity as three conditions: constant mean, constant
 * variance, autocovariance depending only on the lag. Stated that way it is a
 * definition to memorise. Drawn, it is three recognisable silhouettes, and
 * recognising them on sight is the actual skill: the whole point of the check
 * is that you run it by looking at a line plot before you run it as a test.
 *
 * `differencing-detrends` is the sibling figure and answers the next question,
 * which is what to *do* about the first row. This one is about seeing the
 * problem at all, and it deliberately covers all three failures rather than
 * only the trend, because the trend is the one everybody already spots and the
 * other two are the ones that quietly invalidate a model.
 *
 * Four rows in one faceted plot rather than four charts, because they are the
 * same quantity in the same units and the comparison *is* the content: a shared
 * y scale is what makes "constant spread" and "widening spread" different
 * shapes rather than different zoom levels. Every series is built around the
 * same mean and the same base noise so nothing but the named defect differs
 * between rows.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Four time series stacked in one column on a shared vertical scale. The first is stationary: it wanders around a flat level with constant spread. The second drifts steadily upward. The third keeps its level but its swings widen from left to right. The fourth repeats a regular seasonal cycle.";

const N = 160;
const BASE = 50;

const u = rng(31337);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** One shared noise sequence, so a difference between two rows is the defect
 *  being illustrated and never a different random draw. */
const NOISE = Array.from({ length: N }, () => gauss());

const PANELS = [
  {
    key: "Stationary",
    note: "flat level, constant spread",
    color: PRIMARY,
    f: (t, e) => BASE + 4 * e,
  },
  {
    key: "Mean drifts",
    note: "the level itself moves",
    color: ACCENT,
    f: (t, e) => BASE - 14 + (28 * t) / (N - 1) + 4 * e,
  },
  {
    key: "Variance grows",
    note: "same level, wider swings",
    color: ACCENT,
    f: (t, e) => BASE + (1.2 + (7 * t) / (N - 1)) * e,
  },
  {
    key: "Seasonal",
    note: "repeats on a calendar",
    color: ACCENT,
    f: (t, e) => BASE + 11 * Math.sin((2 * Math.PI * t) / 24) + 2.6 * e,
  },
];

const ROWS = PANELS.flatMap((p) =>
  NOISE.map((e, t) => ({ key: p.key, color: p.color, t, y: p.f(t, e) })),
);

/** Panel order is set explicitly: Plot orders a facet domain by first
 *  appearance otherwise, which is fragile if the array above is ever reordered
 *  and says nothing about the intended reading order. */
const ORDER = PANELS.map((p) => p.key);

export const caption = `Stationarity is three conditions, and each one fails with its own silhouette. The top row is what "stationary" looks like: a flat level and a spread that does not change, so any window of it resembles any other. Below it, the level walks away; then the level holds but the swings widen; then the series repeats on a fixed calendar, which breaks the third condition because how two points relate now depends on *when* they are, not just how far apart. Only the first row is safe to hand to an ARMA model. The first defect is the one differencing fixes; widening spread usually wants a log or a Box-Cox transform first, and a seasonal cycle wants a seasonal difference.`;

export function render() {
  return plot({
    height: 460,
    marginTop: 18,
    marginLeft: 44,
    marginRight: 168,
    marginBottom: 42,
    ariaLabel: title,
    x: { label: "Time", labelAnchor: "center", ticks: 6 },
    y: { label: null, ticks: 3, grid: true },
    fy: { domain: ORDER, label: null, axis: null },
    marks: [
      Plot.line(ROWS, {
        x: "t",
        y: "y",
        fy: "key",
        stroke: (d) => d.color,
        strokeWidth: 1.4,
      }),

      // The stationary level, as a reference the eye can measure drift against.
      // Drawn in every panel on purpose: it is the same number in all four, so
      // the second row visibly leaves it and the third visibly does not. `fy` is
      // a channel, so each facet needs its own row rather than a constant.
      Plot.ruleY(
        PANELS.map((p) => ({ key: p.key, y: BASE })),
        { y: "y", fy: "key", stroke: GUIDE, strokeWidth: 1, strokeDasharray: "3,3" },
      ),

      // Row names in the right margin rather than as facet axis labels, which
      // Plot sets in the axis colour and at the axis size; these need to carry
      // the row's own colour so "the one that is fine" is visible as such.
      Plot.text(PANELS, {
        x: () => N - 1,
        y: () => BASE,
        fy: "key",
        text: (d) => `${d.key}\n${d.note}`,
        fill: (d) => (d.key === "Stationary" ? PRIMARY : MUTED),
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
    ],
  });
}
