/**
 * A leaderboard that is really a leaderboard of sample sizes.
 *
 * Sort any rate descending and the top of the list fills up with whichever
 * groups had the fewest observations. This is not a quirk of one dataset; it
 * is arithmetic. The standard error of a proportion is `sqrt(p(1-p)/n)`, so
 * halving n multiplies the spread by 1.4, and a group of four can land at 0%,
 * 25%, 50%, 75% or 100% and nothing else. Two of those five possible values
 * are above every large group's rate before anything real has happened.
 *
 * The chart shows twelve regions ranked by conversion rate, with n beside each
 * one. The top four are all under ten observations. The bottom three are also
 * under ten observations, which is the tell: small groups do not cluster at
 * the top, they cluster at *both ends*, because they are the only ones with
 * enough variance to reach either.
 *
 * This is the mechanism behind a famous and much-cited error. Studies of US
 * school performance found that the best-performing schools were
 * disproportionately small, and a great deal of money went into breaking up
 * large schools on the strength of it. The worst-performing schools were also
 * disproportionately small, and that half of the finding did not travel.
 *
 * Three fixes, in increasing order of effort. Print n and let the reader
 * discount. Set a minimum n for inclusion and say what it was. Or shrink each
 * rate towards the overall rate in proportion to how little data it rests on,
 * which is what an empirical-Bayes or hierarchical model does and is the
 * principled version of what your eye is already trying to do.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twelve regions ranked by conversion rate, with the number of visitors beside each. All four leaders and all three laggards rest on fewer than ten observations, while every region with a large sample sits in the middle of the table.";

/** [region, conversions, visitors]. The rate is computed, not typed. */
const REGIONS = [
  ["Aldergate", 3, 4],
  ["Barrowfield", 5, 7],
  ["Coldwell", 4, 6],
  ["Dunthorpe", 5, 8],
  ["Eastmere", 402, 1710],
  ["Farnley", 918, 4260],
  ["Garrowby", 1264, 6120],
  ["Hartsmoor", 553, 2840],
  ["Inglestone", 271, 1490],
  ["Kirkbourne", 1, 5],
  ["Lowsdale", 1, 7],
  ["Marchford", 0, 4],
].map(([key, hits, n]) => ({ key, hits, n, rate: (hits / n) * 100 }));

const SMALL = 10;
const rows = [...REGIONS].sort((a, b) => b.rate - a.rate);
const ORDER = rows.map((d) => d.key);

const big = REGIONS.filter((d) => d.n >= SMALL);
const OVERALL =
  (REGIONS.reduce((s, d) => s + d.hits, 0) / REGIONS.reduce((s, d) => s + d.n, 0)) * 100;

const LEADERS = rows.slice(0, 4).filter((d) => d.n < SMALL).length;
const LAGGARDS = rows.slice(-3).filter((d) => d.n < SMALL).length;
const BIG_RANGE = [
  Math.min(...big.map((d) => d.rate)),
  Math.max(...big.map((d) => d.rate)),
];

export const caption = `Regions sorted by rate. All ${LEADERS} of the top four rest on fewer than ${SMALL} observations, and so do ${LAGGARDS} of the bottom three; every region with a real sample sits between ${BIG_RANGE[0].toFixed(0)}% and ${BIG_RANGE[1].toFixed(0)}%.`;

export function render() {
  return plot({
    height: 420,
    marginTop: 26,
    marginLeft: 96,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Conversion rate (%)",
      labelAnchor: "center",
      domain: [0, 88],
      ticks: [0, 20, 40, 60, 80],
    },
    y: { label: null, domain: ORDER, padding: 0.3, grid: false },
    marks: [
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.07 }),
      Plot.ruleX([OVERALL], { stroke: GUIDE, strokeWidth: 1.4, strokeDasharray: "4,3" }),
      Plot.barX(rows, {
        y: "key",
        x: "rate",
        fill: (d) => (d.n < SMALL ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.n < SMALL ? 0.35 : 0.7),
      }),
      Plot.text(rows, {
        y: "key",
        x: "rate",
        text: (d) => `${d.rate.toFixed(0)}%   n = ${d.n.toLocaleString()}`,
        fill: (d) => (d.n < SMALL ? ACCENT : MUTED),
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[0] }], {
        y: "at",
        x: OVERALL,
        text: () => `overall rate, ${OVERALL.toFixed(0)}%`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: -18,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[2] }], {
        y: "at",
        x: 0,
        text: () => "every leader\nis a small sample",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ at: ORDER.at(-2) }], {
        y: "at",
        x: 0,
        text: () => "and so is every laggard",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
