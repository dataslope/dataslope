/**
 * What a primary key's *width* costs, which is the part of the
 * natural-versus-surrogate argument that survives contact with a big table.
 *
 * A primary key is not stored once. It is stored in the table, in its own
 * index, and again inside every foreign key and every secondary index that
 * references it, so the width is multiplied by the number of places it
 * appears. A four-byte integer key and a natural key made of three text
 * columns differ by an order of magnitude before any row of actual data is
 * counted.
 *
 * The number that matters is not the disk, which is cheap. It is that a wider
 * key means fewer entries per B-tree page, so the tree is taller and the
 * working set no longer fits in the buffer pool. That is where a schema
 * decision turns into a latency graph, and it is why the usual answer to
 * "which key?" is a narrow surrogate with a unique constraint on the natural
 * one, keeping both properties.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Bytes of key storage per row for four primary key choices, split into the table, the primary index and three referencing indexes. A four-byte integer costs twenty bytes per row where a three-column natural key costs over two hundred.";

const REFERENCES = 3; // foreign keys and secondary indexes carrying the key
const ROWS = 50_000_000;

const KEYS = [
  { key: "int (4 bytes)", width: 4 },
  { key: "bigint (8 bytes)", width: 8 },
  { key: "uuid (16 bytes)", width: 16 },
  { key: "Natural: 3 text columns", width: 44 },
];

const PARTS = [
  { part: "The table", n: 1 },
  { part: "Its primary index", n: 1 },
  { part: `${REFERENCES} referencing indexes`, n: REFERENCES },
];

// Explicit stacked bounds: the stack order is part of the reading, not
// something to leave to input order.
const rows = KEYS.flatMap((k) => {
  let base = 0;
  return PARTS.map((p, i) => {
    const bytes = k.width * p.n;
    const row = { key: k.key, part: p.part, color: SERIES[i], x1: base, x2: base + bytes };
    base += bytes;
    return row;
  });
});

/** One label per stacked part, positioned over the widest bar's segments,
 *  and parked on the top row so it lands in the margin above the chart. */
const LEGEND = rows
  .filter((r) => r.key === KEYS.at(-1).key)
  .map((r) => ({ x: (r.x1 + r.x2) / 2, row: KEYS[0].key, label: r.part }));

const total = (k) => k.width * (2 + REFERENCES);
const NARROW = total(KEYS[0]);
const WIDE = total(KEYS.at(-1));

export const caption = `A key is not stored once. It sits in the table, in its own index, and again in every foreign key and secondary index that references it, so its width is multiplied by every place it appears: ${NARROW} bytes a row for an \`int\` against ${WIDE} for a three-column natural key, or ${(((WIDE - NARROW) * ROWS) / 1e9).toFixed(1)} GB of difference across ${(ROWS / 1e6).toFixed(0)} million rows. Disk is cheap; the reason to care is that a wider key fits fewer entries per B-tree page, so the tree is taller and the working set stops fitting in memory. Hence the usual answer: a narrow surrogate key, with a unique constraint on the natural one.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 168,
    marginRight: 74,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Bytes of key storage per row", labelAnchor: "center", domain: [0, 240], ticks: 5 },
    y: { label: null, domain: KEYS.map((k) => k.key), padding: 0.3, grid: false },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x1: "x1",
        x2: "x2",
        fill: "color",
        fillOpacity: 0.72,
        insetTop: 0.5,
        insetBottom: 0.5,
      }),
      Plot.text(KEYS, {
        y: "key",
        x: (d) => total(d),
        text: (d) => `${total(d)} bytes`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      // The three parts named once, in the top margin, at the x positions the
      // widest bar's segments occupy. Written inside the bars they collided
      // with each other and with the narrow rows underneath.
      //
      // The row is carried as a *field* rather than passed as `y: KEYS[0].key`:
      // a string handed to a channel is read as a column name, so a literal
      // category there resolves to undefined and the whole mark disappears.
      Plot.text(LEGEND, {
        x: "x",
        y: "row",
        text: "label",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -22,
        ...HALO,
      }),
      Plot.ruleX([total(KEYS[0])], { stroke: ACCENT, strokeDasharray: "4 3", strokeOpacity: 0.7 }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
