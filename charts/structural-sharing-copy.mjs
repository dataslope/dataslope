/**
 * Why "immutability copies everything, so it must be slow" is wrong, and what
 * it costs instead.
 *
 * The naive reading of immutable update is `[...xs]` with one element changed,
 * which really does touch every element: update one item in a million and you
 * have written a million slots. A persistent data structure stores the
 * collection as a wide shallow tree instead, and an update rewrites only the
 * nodes on the path from the root to the changed leaf. Everything else is
 * *shared* with the previous version, which is still valid and still pointing
 * at the same nodes.
 *
 * With a branching factor of 32 the tree is five levels deep at a million
 * elements, so an update copies about a hundred and sixty slots rather than a
 * million. The two curves are on a log-log plot because that is the only way
 * to see both a straight line and a staircase at once, and the staircase is
 * the shape worth recognising: the cost steps only when the tree gains a
 * level.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Slots written to update one element, against collection size, on log axes. Copying the whole collection is a straight diagonal; a persistent tree with branching factor 32 is a low staircase that steps only when the tree gains a level.";

/** Branching factor of the trie behind a persistent vector. */
const BRANCH = 32;
const AT = 1_000_000;

const sizes = Array.from({ length: 61 }, (_, i) => Math.round(Math.pow(10, 1 + i / 10)));

const rows = sizes.flatMap((n) => {
  const depth = Math.max(1, Math.ceil(Math.log(n) / Math.log(BRANCH)));
  return [
    { key: "Copy the whole collection", n, written: n },
    { key: "Persistent tree (path copy)", n, written: depth * BRANCH },
  ];
});

const DEPTH = Math.ceil(Math.log(AT) / Math.log(BRANCH));
const PATH = DEPTH * BRANCH;

export const caption = `An immutable update does not have to copy the collection. A persistent structure stores it as a wide, shallow tree and rewrites only the nodes between the root and the changed leaf; every other node is shared with the previous version, which is still valid and still pointing at it. At ${AT.toLocaleString()} elements the tree is ${DEPTH} levels deep, so the update writes about ${PATH} slots instead of ${AT.toLocaleString()}. The staircase steps only when the tree gains a level, which is why the two curves diverge without limit.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 172,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Elements in the collection",
      labelAnchor: "center",
      type: "log",
      domain: [10, 10_000_000],
      ticks: [10, 1000, 100_000, 10_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Slots written by one update",
      type: "log",
      domain: [10, 10_000_000],
      ticks: [10, 1000, 100_000, 10_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Copy")), {
        x: "n",
        y: "written",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Copy")), {
        x: "n",
        y: "written",
        stroke: PRIMARY,
        strokeWidth: 2,
        curve: "step-after",
      }),
      Plot.ruleX([AT], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: 10_000_000,
        y: 10_000_000,
        text: () => "Copy the whole\ncollection",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 10_000_000,
        y: PATH,
        text: () => "Persistent tree\n(path copy)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: 30_000,
        text: () => `at a million elements:\n${PATH} slots, not ${AT / 1e6}M`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
    ],
  });
}
