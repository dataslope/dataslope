/**
 * Why a balanced tree is a different data structure from an unbalanced one,
 * even though both are binary search trees.
 *
 * Height against node count for the two extremes. A balanced tree's height is
 * log2(n): a million nodes is twenty comparisons. A tree built by inserting
 * sorted keys degenerates into a linked list, and its height is n: a million
 * nodes is a million comparisons. Every operation on a BST costs its height, so
 * this is the difference between a lookup and a scan.
 *
 * Drawn on a log x axis, where balanced height is a straight line and
 * degenerate height is an exploding curve, which is the right visual asymmetry:
 * one of these is bounded by the axis and the other is not.
 *
 * The comparison counts in the caption come from the same two formulas.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Tree height against node count on a log axis. A balanced tree rises as a shallow straight line to about twenty at a million nodes; a degenerate one climbs to a million.";

const SIZES = [1, 10, 100, 1000, 1e4, 1e5, 1e6];

const rows = SIZES.flatMap((n) => [
  { n, kind: "Balanced (AVL, red-black)", height: Math.ceil(Math.log2(n + 1)) },
  { n, kind: "Degenerate (sorted inserts)", height: n },
]);

const BIG = SIZES.at(-1);
const bal = rows.find((r) => r.n === BIG && r.kind.startsWith("Balanced")).height;
const deg = rows.find((r) => r.n === BIG && r.kind.startsWith("Degenerate")).height;

export const caption =
  `Every BST operation costs the height of the tree. Balanced, a million keys is ${bal} comparisons. Insert those same keys in sorted order and the tree is a linked list wearing a tree's interface: ${deg.toLocaleString()} comparisons for the same lookup. This is what self-balancing buys, and why inserting sorted data into a plain BST is the classic way to build the slowest possible index.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 128,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Nodes",
      labelAnchor: "center",
      domain: [1, 1e6],
      ticks: [1, 100, 1e4, 1e6],
      tickFormat: (d) =>
        d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d),
    },
    y: {
      type: "log",
      label: "Comparisons for one lookup",
      domain: [1, 1e6],
      ticks: [1, 10, 1e3, 1e5],
      tickFormat: (d) =>
        d >= 1e9 ? `${d / 1e9}B` : d >= 1e6 ? `${d / 1e6}M` : d >= 1e3 ? `${d / 1e3}k` : String(d),
    },
    color: {
      domain: ["Balanced (AVL, red-black)", "Degenerate (sorted inserts)"],
      range: [PRIMARY, ACCENT],
    },
    marks: [
      Plot.line(rows, { x: "n", y: "height", stroke: "kind", strokeWidth: 2 }),
      Plot.dot(rows, { x: "n", y: "height", fill: "kind", r: 3 }),
      Plot.text(
        [
          { n: BIG, height: bal, kind: "Balanced (AVL, red-black)" },
          { n: BIG, height: deg, kind: "Degenerate (sorted inserts)" },
        ],
        {
          x: "n",
          y: "height",
          text: (d) => `${d.kind.split(" (")[0]}\n${d.height.toLocaleString()}`,
          fill: "kind",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 1.6,
        y: 4e5,
        text: () => "same structure, same interface,\ndifferent complexity class",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
