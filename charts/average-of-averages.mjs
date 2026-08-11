/**
 * The most common spreadsheet error there is, drawn.
 *
 * Somebody computes an average per region, puts the five results in a column,
 * and averages that column to get "the company average". It reads as obviously
 * correct and it is obviously wrong, because the five regional means are
 * summaries of wildly different numbers of customers and averaging them again
 * gives each region one vote.
 *
 * The size of the error depends entirely on whether the small groups are
 * unusual, and small groups usually *are* unusual, because that is often why
 * they are small. Here the smallest region has by far the highest average
 * order, being a boutique operation with forty customers, and it drags the
 * unweighted figure up by a fifth.
 *
 * The correct calculation is the *weighted* mean, weights being the group
 * sizes, and it is exactly the same as ignoring the groups and averaging the
 * raw rows. That equivalence is the fastest way to remember which one you
 * want: **if grouping first and grouping not at all give different answers,
 * you have made this mistake.**
 *
 * The failure generalises past means. Averaging five conversion *rates*,
 * averaging five percentage changes, averaging five medians, averaging five
 * R-squareds: none of them commutes with grouping. A percentage in particular
 * is a ratio, and ratios are averaged by adding the numerators and adding the
 * denominators, never by averaging the ratios.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Average order value in five regions, with each region's customer count printed underneath. The unweighted mean of the five regional averages is 68 and the weighted mean, which is the same as averaging every customer, is 52. The whole gap comes from one 40-customer region with an unusually high average.";

/** Regional averages and the number of customers each is computed from. */
const REGIONS = [
  { key: "North", avg: 52, n: 4200 },
  { key: "South", avg: 49, n: 3100 },
  { key: "East", avg: 61, n: 1850 },
  { key: "West", avg: 47, n: 2600 },
  { key: "Islands", avg: 131, n: 40 },
];

const ORDER = REGIONS.map((d) => d.key);
const TOTAL_N = REGIONS.reduce((s, d) => s + d.n, 0);

const UNWEIGHTED = REGIONS.reduce((s, d) => s + d.avg, 0) / REGIONS.length;
const WEIGHTED = REGIONS.reduce((s, d) => s + d.avg * d.n, 0) / TOTAL_N;
const GAP = Math.round(((UNWEIGHTED - WEIGHTED) / WEIGHTED) * 100);

const ODD = REGIONS.reduce((a, b) => (b.n < a.n ? b : a));
const ODD_SHARE = ((ODD.n / TOTAL_N) * 100).toFixed(1);

const MAX = 145;
export const caption = `Somebody averages orders per region, puts the five results in a column, and averages that column. It looks obviously right and it is wrong, because the five means summarise different numbers of customers and averaging them again gives every region one vote regardless of size. Here ${ODD.key} is ${ODD_SHARE}% of the customer base and gets 20% of the answer, and since it is a boutique operation with an average order more than twice anyone else's, the unweighted figure comes out at ${UNWEIGHTED.toFixed(0)} against a true ${WEIGHTED.toFixed(0)}, which is ${GAP}% high. The right calculation is the weighted mean, weights being the group sizes, and it is identical to ignoring the groups and averaging the raw rows. That equivalence is the quickest way to remember which you want: if grouping first and not grouping at all give different answers, you have made this mistake. It generalises past means. Averaging five conversion rates, five percentage changes, five medians or five R-squareds does not commute with grouping either. A rate is a ratio, and ratios combine by adding numerators and adding denominators, never by averaging the ratios.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 132,
    marginBottom: 62,
    ariaLabel: title,
    x: { label: null, domain: ORDER, padding: 0.32 },
    y: {
      label: "Average order value",
      domain: [0, MAX],
      ticks: [0, 50, 100],
      tickFormat: (v) => `£${v}`,
    },
    marks: [
      Plot.barY(REGIONS, {
        x: "key",
        y: "avg",
        fill: (d) => (d.key === ODD.key ? ACCENT : PRIMARY),
        fillOpacity: 0.6,
      }),
      // The value on top of its own bar, clear of the category labels.
      Plot.text(REGIONS, {
        x: "key",
        y: "avg",
        text: (d) => `£${d.avg}`,
        fill: (d) => (d.key === ODD.key ? ACCENT : MUTED),
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -8,
        ...HALO,
      }),
      Plot.text(REGIONS, {
        x: "key",
        y: 0,
        text: (d) => `${d.n.toLocaleString()} customers`,
        fill: (d) => (d.key === ODD.key ? ACCENT : MUTED),
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
      Plot.ruleY([UNWEIGHTED], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "5,3" }),
      Plot.ruleY([WEIGHTED], { stroke: PRIMARY, strokeWidth: 1.5 }),
      Plot.text([{ at: ORDER.at(-1) }], {
        x: "at",
        y: UNWEIGHTED,
        text: () => `mean of the five means\n£${UNWEIGHTED.toFixed(0)}, and ${GAP}% too high`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 20,
        dy: -12,
        ...HALO,
      }),
      Plot.text([{ at: ORDER.at(-1) }], {
        x: "at",
        y: WEIGHTED,
        text: () => `weighted by customers\n£${WEIGHTED.toFixed(0)}, the real figure`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 20,
        dy: 14,
        ...HALO,
      }),
      // Beside the tall bar rather than above it, where its own value label
      // already is.
      Plot.text([{ at: ORDER[3] }], {
        x: "at",
        y: 118,
        text: () => `${ODD.key} is ${ODD_SHARE}% of the\ncustomers and a fifth\nof the answer`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
