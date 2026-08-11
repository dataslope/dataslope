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
 *
 * ── Why lollipops and not bars ──────────────────────────────────────────────
 *
 * This figure used to draw `Plot.barY` against a logarithmic y scale, and it
 * rendered as an empty frame with four grey numbers floating in it. A bar runs
 * from zero to its value; log(0) is −∞, so on a log scale there is no baseline
 * for it to start from and the mark collapses. Three of these four values are
 * under sixty against a fourth over a hundred thousand, so the scale has to be
 * logarithmic, which means the mark cannot be a bar.
 *
 * It should not be a bar for a second reason even where one would draw: bar
 * *length* is the channel a reader measures, and on a log axis length is no
 * longer proportional to the value — the 111,111 bar would be about five times
 * the 1 bar rather than a hundred thousand times it, which is a quieter lie
 * than an empty chart but still a lie. A rule from the axis floor to a dot
 * encodes position instead, which is what a log scale is legible in.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Pages read for a point lookup and a range scan under hash and B-tree indexes on a ten-million-row table, on a logarithmic scale. On equality both are cheap, one page against four. On a range the B-tree reads 59 pages and the hash index reads the whole table, 111,111.";

const ROWS = 10_000_000;
const FANOUT = 250;
const HEIGHT = Math.ceil(Math.log(ROWS) / Math.log(FANOUT));
const RANGE_ROWS = 5_000;
const ROWS_PER_PAGE = 90;

const CASES = [
  { query: "point", index: "Hash", pages: 1 },
  { query: "point", index: "B-tree", pages: HEIGHT + 1 },
  { query: "range", index: "Hash", pages: Math.round(ROWS / ROWS_PER_PAGE) },
  { query: "range", index: "B-tree", pages: HEIGHT + Math.ceil(RANGE_ROWS / ROWS_PER_PAGE) },
];

const at = (query, index) => CASES.find((c) => c.query === query && c.index === index).pages;
const hashRange = at("range", "Hash");
const treeRange = at("range", "B-tree");

/** The axis floor, and the baseline every rule is drawn from. One page is the
 *  least a query can read, so it is a real zero for this quantity rather than
 *  a convenient one. */
const FLOOR = 1;

const PANELS = [
  { query: "point", title: "Point lookup:  WHERE id = 42" },
  { query: "range", title: "Range scan:  WHERE id BETWEEN 900 AND 5900" },
];

export const caption = `On equality both are cheap: ${at("point", "Hash")} probe against ${at("point", "B-tree")} pages, a difference nothing in your application will notice. On a range they are different algorithms. The tree stores keys in order, so it seeks once and walks: ${treeRange.toLocaleString()} pages. The hash stores them in an order unrelated to their values, so there is nothing to walk and the answer is a full scan: ${hashRange.toLocaleString()}. Note the scale: each gridline is ten times the one before it, so the last gap is three of them. That is why the default index is a tree.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 24,
    marginLeft: 72,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    fy: { domain: ["point", "range"], axis: null },
    y: { label: null, domain: ["Hash", "B-tree"], padding: 0.55 },
    x: {
      type: "log",
      label: "Pages read (each gridline is ten times the one before)",
      labelAnchor: "center",
      domain: [FLOOR, 4e5],
      ticks: [1, 10, 100, 1e3, 1e4, 1e5],
      tickFormat: (d) => (d >= 1e3 ? `${d / 1e3}k` : String(d)),
      grid: true,
    },
    marks: [
      Plot.text(PANELS, {
        fy: "query",
        frameAnchor: "top-left",
        text: "title",
        fill: "currentColor",
        fontSize: 12,
        textAnchor: "start",
        dy: 2,
        ...HALO,
      }),
      Plot.ruleY(CASES, {
        fy: "query",
        y: "index",
        x1: FLOOR,
        x2: "pages",
        stroke: (d) => (d.pages > 1000 ? ACCENT : PRIMARY),
        strokeWidth: 2,
        strokeOpacity: 0.45,
      }),
      Plot.dot(CASES, {
        fy: "query",
        y: "index",
        x: "pages",
        fill: (d) => (d.pages > 1000 ? ACCENT : PRIMARY),
        r: 5,
      }),
      Plot.text(CASES, {
        fy: "query",
        y: "index",
        x: "pages",
        text: (d) => `${d.pages.toLocaleString()} ${d.pages === 1 ? "page" : "pages"}`,
        fill: (d) => (d.pages > 1000 ? ACCENT : MUTED),
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 11,
        ...HALO,
      }),
      Plot.text([{ query: "range", index: "Hash" }], {
        fy: "query",
        y: "index",
        x: hashRange,
        text: () => "no order to walk,\nso: the whole table",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -14,
        ...HALO,
      }),
    ],
  });
}
