/**
 * Why a database offers two index types, and how to pick.
 *
 * A hash index computes the bucket and goes straight there, so a point lookup
 * is one probe whatever the table size. A B-tree walks its height, which is a
 * handful of pages. On equality, hash wins slightly and almost never enough to
 * matter.
 *
 * On a range, they are not comparable at all. A B-tree stores keys in order, so
 * a range is a seek plus a walk along the leaves. A hash index stores them in
 * an order that is deliberately unrelated to their values, so there is no range
 * to walk: the only way to answer is to read everything. That is the whole
 * decision, and it is why the default index type is a tree.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Pages read for a point lookup and a range scan under hash and B-tree indexes on a ten-million-row table. Both are cheap on equality; on a range the hash index degrades to a full scan.";

const ROWS = 10_000_000;
const FANOUT = 250;
const HEIGHT = Math.ceil(Math.log(ROWS) / Math.log(FANOUT));
const RANGE_ROWS = 5_000;
const ROWS_PER_PAGE = 90;

const CASES = [
  { query: "Point lookup (id = 42)", index: "Hash", pages: 1 },
  { query: "Point lookup (id = 42)", index: "B-tree", pages: HEIGHT + 1 },
  { query: "Range scan (id between …)", index: "Hash", pages: Math.round(ROWS / ROWS_PER_PAGE) },
  {
    query: "Range scan (id between …)",
    index: "B-tree",
    pages: HEIGHT + Math.ceil(RANGE_ROWS / ROWS_PER_PAGE),
  },
];

const hashRange = CASES[2].pages;
const treeRange = CASES[3].pages;

export const caption =
  `On equality both are cheap: ${CASES[0].pages} probe against ${CASES[1].pages} pages, a difference nothing in your application will notice. On a range they are different algorithms. The tree stores keys in order, so it seeks once and walks: ${treeRange.toLocaleString()} pages. The hash stores them in an order unrelated to their values, so there is nothing to walk and the answer is a full scan: ${hashRange.toLocaleString()}. That is why the default index is a tree.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 62,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: ["Point lookup (id = 42)", "Range scan (id between …)"] },
    x: { label: null, domain: ["Hash", "B-tree"], padding: 0.3 },
    y: {
      type: "log",
      label: "Pages read",
      domain: [1, 2e5],
      ticks: [1, 100, 1e4],
      tickFormat: (d) => (d === 1 ? "1" : `1e${Math.round(Math.log10(d))}`),
    },
    marks: [
      Plot.barY(CASES, {
        x: "index",
        y: "pages",
        fx: "query",
        fill: (d) => (d.pages > 1000 ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.text(CASES, {
        x: "index",
        y: "pages",
        fx: "query",
        text: (d) => d.pages.toLocaleString(),
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),
      Plot.text([{ query: "Range scan (id between …)", index: "Hash" }], {
        x: "index",
        y: 6e4,
        fx: "query",
        text: () => "no order to walk:\nread everything",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
