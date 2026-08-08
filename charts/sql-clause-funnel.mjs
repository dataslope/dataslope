/**
 * A query's clauses in the order the database runs them, with the row count
 * after each one.
 *
 * SQL is written in an order nobody executes it in. `SELECT` is typed first
 * and evaluated almost last, which is why an alias defined there cannot be
 * used in `WHERE` and can be used in `ORDER BY`, and why `WHERE` and `HAVING`
 * are not interchangeable: `WHERE` filters rows before grouping and `HAVING`
 * filters groups after it. Both of those are usually memorised as rules; both
 * fall out of this picture for free.
 *
 * The steep drop at `WHERE` is also the whole of query tuning in one mark.
 * Every clause below it works on what that one left behind, so a filter moved
 * earlier is cheaper than any amount of cleverness applied later.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The clauses of a query in the order the engine evaluates them, with rows surviving each step: a join fans the rows out, WHERE cuts them by two orders of magnitude, GROUP BY collapses them to groups, and LIMIT takes ten.";

const STEPS = [
  { key: "FROM / JOIN", rows: 1_400_000, note: "the fan-out, not the table size" },
  { key: "WHERE", rows: 38_000, note: "rows, before any grouping" },
  { key: "GROUP BY", rows: 640, note: "one row per group" },
  { key: "HAVING", rows: 88, note: "groups, after grouping" },
  { key: "SELECT", rows: 88, note: "where aliases come into being" },
  { key: "ORDER BY", rows: 88, note: "can use those aliases" },
  { key: "LIMIT", rows: 10, note: "and only now, ten" },
];

const rows = STEPS.map((s, i) => ({ ...s, step: i }));

export const caption =
  "SQL is written in an order nobody runs it in. Two rules people memorise fall out of this picture instead: an alias defined in `SELECT` cannot be used in `WHERE` (which ran four steps earlier) but can be used in `ORDER BY` (which runs after it); and `WHERE` filters rows before grouping while `HAVING` filters groups after it, so they are not interchangeable. The cliff at `WHERE` is also the whole of query tuning: every clause below it works on what that one left behind.";

export function render() {
  return plot({
    height: 340,
    marginTop: 24,
    marginLeft: 118,
    marginRight: 206,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Rows still in play",
      labelAnchor: "center",
      type: "log",
      domain: [8, 3_000_000],
      ticks: [10, 1000, 100_000, 1_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: null, domain: STEPS.map((s) => s.key), grid: false },
    marks: [
      Plot.ruleY(rows, {
        y: "key",
        x1: 8,
        x2: "rows",
        stroke: (d) => (d.key === "WHERE" ? ACCENT : PRIMARY),
        strokeWidth: 6,
        strokeOpacity: 0.45,
      }),
      Plot.dot(rows, {
        y: "key",
        x: "rows",
        fill: (d) => (d.key === "WHERE" ? ACCENT : PRIMARY),
        r: 4,
      }),
      Plot.text(rows, {
        y: "key",
        x: "rows",
        text: (d) => `${d.rows.toLocaleString()}  ${d.note}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
    ],
  });
}
