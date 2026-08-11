/**
 * What an index actually buys, as a function of table size: the difference
 * between reading everything and reading a handful of pages.
 *
 * A sequential scan touches every row, so its cost is a straight line through
 * the origin. A B-tree lookup touches the height of the tree, which grows as
 * log of the row count, so on a log-log axis it is nearly flat. At a thousand
 * rows the gap is small enough that the planner will often skip the index; at
 * a hundred million it is the difference between a query and an outage.
 *
 * Tree height is computed from a realistic fanout rather than drawn freehand,
 * so the "four page reads" figure in the caption is the arithmetic of a B-tree
 * with that fanout rather than a number chosen to look good.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Rows examined against table size on log axes: a sequential scan rises as a straight diagonal, while an indexed lookup stays nearly flat at a few page reads however large the table grows.";

/** Entries per B-tree page at a typical 8KB page and small keys. */
const FANOUT = 250;
const SIZES = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];

const rows = SIZES.flatMap((n) => [
  { n, mode: "Sequential scan", touched: n },
  // Height of the tree, plus the heap fetch at the end.
  { n, mode: "Index lookup", touched: Math.ceil(Math.log(n) / Math.log(FANOUT)) + 1 },
]);

const BIG = SIZES.at(-1);
const bigScan = rows.find((r) => r.n === BIG && r.mode === "Sequential scan").touched;
const bigIndex = rows.find((r) => r.n === BIG && r.mode === "Index lookup").touched;

export const caption =
  `A scan reads every row, so its cost is the table. An index reads the height of the tree, which at a fanout of ${FANOUT} is ${bigIndex} pages even for ${(BIG / 1e6).toFixed(0)} million rows. That is the whole argument, and it is also why the planner ignores your index on a small table: at a hundred rows the two are the same work.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 64,
    marginRight: 116,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Rows in the table",
      labelAnchor: "center",
      domain: [1e2, 1e8],
      ticks: [1e2, 1e4, 1e6, 1e8],
      tickFormat: (d) =>
        d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d),
    },
    y: {
      type: "log",
      label: "Rows or pages touched",
      domain: [1, 1e8],
      ticks: [1, 1e2, 1e4, 1e6, 1e8],
      tickFormat: (d) =>
        d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d),
    },
    color: { domain: ["Sequential scan", "Index lookup"], range: [ACCENT, PRIMARY] },
    marks: [
      Plot.line(rows, { x: "n", y: "touched", stroke: "mode", strokeWidth: 2 }),
      Plot.dot(rows, { x: "n", y: "touched", fill: "mode", r: 3 }),
      Plot.text(
        [
          { n: BIG, touched: bigScan, mode: "Sequential scan" },
          { n: BIG, touched: bigIndex, mode: "Index lookup" },
        ],
        {
          x: "n",
          y: "touched",
          text: (d) => `${d.mode}\n${d.touched.toLocaleString()}`,
          fill: "mode",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.ruleX([1e3], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "3,3" }),
      Plot.text([{}], {
        x: 1e3,
        y: 3e7,
        text: () => "below here the planner\noften skips the index",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
    ],
  });
}
