/**
 * When the summary is bigger than the thing it summarises.
 *
 * Four observations per group. On the left, each group is a bar at its mean
 * with an error bar through it, which is what `sns.barplot` gives you by
 * default and what most papers print. On the right, the same four numbers,
 * drawn.
 *
 * Three things the left panel cannot tell you, all of which the right panel
 * tells you without being asked:
 *
 *   • that there are four of them. A bar looks the same whether it summarises
 *     four points or four thousand, and the error bar shrinks with n, so a
 *     small sample with a lucky spread can produce a *tighter* looking bar
 *     than a large one;
 *   • the shape. Group B's four values are two low and two high with nothing
 *     in the middle, which is a completely different finding from a cluster
 *     around the mean, and both produce the same bar;
 *   • the outlier. Group C's mean is dragged by one value, and the bar reports
 *     the dragged mean as though it were the typical case.
 *
 * The deeper problem is that a bar with an error bar is drawn as though the
 * mean were a *thing that exists*, and at n = 4 it is a fragile summary of
 * four numbers you could simply print. The chart has spent a rectangle,
 * a whisker and two conventions to hide sixteen values that would have fitted
 * on the page with room to spare.
 *
 * This is why the "dynamite plot" has been argued against in the biology
 * literature for twenty years and is still everywhere. The rule people
 * eventually settle on: below about n = 10, show every point; between 10 and
 * 50, show the points and a summary together; above that, a summary with a
 * distribution shape (a box, a violin, a strip) rather than a bar.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean } from "./_theme.mjs";

export const title =
  "Four observations in each of four groups, drawn as bars with error bars and as the individual points. The bars hide that one group is bimodal, that another's mean is dragged by a single high value, and that there are only four measurements behind each rectangle.";

/** Four replicates per condition. Deliberately chosen so that the four groups
 *  look similar as bars and are obviously different as points. */
const GROUPS = [
  { key: "A", values: [41, 44, 43, 42], note: "tight" },
  { key: "B", values: [30, 32, 54, 56], note: "nothing\nin here", at: 43 },
  { key: "C", values: [34, 35, 36, 66], note: "drags the mean", at: 66 },
  { key: "D", values: [38, 43, 47, 49], note: "spread, unremarkable" },
];

const stats = GROUPS.map((g) => {
  const m = mean(g.values);
  const sd = Math.sqrt(g.values.reduce((s, v) => s + (v - m) ** 2, 0) / (g.values.length - 1));
  const se = sd / Math.sqrt(g.values.length);
  return { ...g, mean: m, se };
});

const AS_BARS = "Bar and error bar";
const AS_POINTS = "The four numbers";
const ORDER = GROUPS.map((g) => g.key);
const N = GROUPS[0].values.length;

const barRows = stats.map((d) => ({ ...d, panel: AS_BARS }));
const pointRows = GROUPS.flatMap((g) =>
  g.values.map((v, i) => ({ key: g.key, v, i, panel: AS_POINTS })),
);

const SPREAD = stats.reduce((a, b) => (b.se < a.se ? b : a));
const BIMODAL = GROUPS.find((g) => g.key === "B");
const RANGE = Math.max(...BIMODAL.values) - Math.min(...BIMODAL.values);

export const caption = `Four measurements per group as bars with error bars, and the same sixteen numbers printed. Group B is two low values and two high ones spanning ${RANGE} units with nothing in between, which draws the same bar as a cluster around a mean.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 18,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: null, domain: ORDER, padding: 0.36 },
    y: {
      label: "Measurement",
      domain: [0, 76],
      ticks: [0, 20, 40, 60],
    },
    fx: { label: null, domain: [AS_BARS, AS_POINTS] },
    marks: [
      Plot.barY(barRows, {
        fx: "panel",
        x: "key",
        y: "mean",
        fill: MUTED,
        fillOpacity: 0.45,
      }),
      Plot.ruleX(barRows, {
        fx: "panel",
        x: "key",
        y1: (d) => d.mean - d.se,
        y2: (d) => d.mean + d.se,
        stroke: MUTED,
        strokeWidth: 1.6,
      }),
      Plot.dot(pointRows, {
        fx: "panel",
        x: "key",
        y: "v",
        r: 4.5,
        fill: PRIMARY,
        fillOpacity: 0.8,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
      }),
      Plot.ruleX(
        stats.map((d) => ({ ...d, panel: AS_POINTS })),
        {
          fx: "panel",
          x: "key",
          y1: "mean",
          y2: "mean",
          stroke: MUTED,
          strokeWidth: 0,
        },
      ),
      // Annotations sit beside the points they describe rather than under the
      // axis, where two of them collided with each other and with a tick.
      Plot.text([{ ...GROUPS[1], panel: AS_POINTS }], {
        fx: "panel",
        x: "key",
        y: "at",
        text: "note",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{ ...GROUPS[2], panel: AS_POINTS }], {
        fx: "panel",
        x: "key",
        y: "at",
        text: "note",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([{ panel: AS_BARS, at: ORDER[0] }], {
        fx: "panel",
        x: "at",
        y: 66,
        text: () => "four numbers hide behind each bar",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
