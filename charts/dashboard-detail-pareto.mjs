/**
 * Why the category breakdown belongs at the bottom, as a top-N table, instead
 * of as twenty panels at the top.
 *
 * Business categories are almost never uniform. Campaigns, endpoints, SKUs,
 * referrers and error codes all pile up near the head and trail off into a
 * long tail, so a handful of rows carry most of the number and the rest carry
 * rounding. The curve is the cumulative share as rows are added, which is the
 * question the layout actually turns on: how far down the list does a reader
 * have to go before they have seen the thing that moved?
 *
 * Not usually far. The crossing point is computed from the data rather than
 * asserted, so the caption stays true if the distribution is ever retuned.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A cumulative share curve over twenty categories sorted from largest to smallest. It rises steeply across the first few rows, passes eighty per cent within the first handful, and then flattens into a long tail that adds almost nothing.";

const N = 20;

// A Zipf-ish head-heavy distribution, the usual shape of a category breakdown.
const weights = Array.from({ length: N }, (_, i) => 1 / Math.pow(i + 1, 1.35));
const TOTAL = weights.reduce((s, w) => s + w, 0);

let acc = 0;
const CURVE = weights.map((w, i) => {
  acc += w;
  return { rank: i + 1, share: w / TOTAL, cumulative: acc / TOTAL };
});

const AT_80 = CURVE.find((d) => d.cumulative >= 0.8).rank;
const TAIL = CURVE.at(-1).cumulative - CURVE[AT_80 - 1].cumulative;

export const caption = `Sorted by size, the first ${AT_80} of twenty categories carry 80% of the total and the remaining ${N - AT_80} carry ${(TAIL * 100).toFixed(0)}% between them. That is why detail goes at the bottom as one sorted table rather than at the top as twenty panels: the reader who needs the head sees it immediately, and the reader who needs the tail is the one prepared to scroll.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 58,
    marginRight: 100,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Categories included, largest first", labelAnchor: "center", domain: [0, N], ticks: 5 },
    y: { label: "Share of the total", domain: [0, 1.02], ticks: 5, tickFormat: "%" },
    marks: [
      // The individual shares as faint bars, so the long tail is visible as
      // well as implied by the flattening curve.
      Plot.rect(CURVE, {
        x1: (d) => d.rank - 0.85,
        x2: (d) => d.rank - 0.15,
        y1: 0,
        y2: "share",
        fill: (d) => (d.rank <= AT_80 ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.rank <= AT_80 ? 0.45 : 0.25),
      }),
      Plot.line(CURVE, { x: "rank", y: "cumulative", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.dot(CURVE, { x: "rank", y: "cumulative", fill: PRIMARY, r: 2.4 }),
      Plot.ruleY([0.8], { stroke: GUIDE, strokeDasharray: "4 4" }),
      Plot.ruleX([AT_80], { stroke: GUIDE, strokeDasharray: "4 4" }),
      Plot.text([{}], {
        x: AT_80,
        y: 0.8,
        text: () => `${AT_80} rows reach 80%`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        dy: 14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: N,
        y: 0.55,
        text: () => `the other ${N - AT_80},\ncombined, are a\nrounding error`,
        fill: MUTED,
        fontSize: 11,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -6,
        ...HALO,
      }),
    ],
  });
}
