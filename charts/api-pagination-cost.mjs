/**
 * Why offset pagination gets slower the deeper you go, and cursor pagination
 * does not.
 *
 * `OFFSET n` does not skip n rows cheaply. The database produces them and
 * throws them away, so page 500 costs five hundred pages of work to return
 * twenty rows. A cursor, `WHERE id > last ORDER BY id LIMIT 20`, seeks straight
 * into the index and costs the same at any depth.
 *
 * The rows-examined figures come from the page size and depth rather than a
 * benchmark, which is the honest version of this claim: the constant depends
 * on the engine, the shape does not.
 *
 * The second consequence is worth knowing and is not on the chart: offset
 * pagination also skips or repeats rows when the underlying data changes
 * between requests, which a cursor does not.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Rows examined against page number for offset and cursor pagination, on a log y axis: offset rises linearly to ten thousand rows by page five hundred, while cursor stays flat at the page size.";

const PAGE = 20;
const PAGES = [1, 5, 20, 50, 100, 250, 500];

const rows = PAGES.flatMap((p) => [
  { page: p, mode: "OFFSET", examined: p * PAGE },
  { page: p, mode: "Cursor (WHERE id > …)", examined: PAGE },
]);

const DEEP = PAGES.at(-1);
const offsetDeep = DEEP * PAGE;

export const caption =
  `\`OFFSET\` does not skip rows, it produces them and discards them. By page ${DEEP} the database has built ${offsetDeep.toLocaleString()} rows to return ${PAGE}. A cursor seeks into the index and examines ${PAGE} at any depth. The constant depends on your engine; the shape does not. Offset pagination also skips and repeats rows when the data changes underneath it, which a cursor does not.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 64,
    marginRight: 132,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Page number",
      labelAnchor: "center",
      domain: [1, DEEP],
      ticks: [1, 10, 100, 500],
      tickFormat: String,
    },
    y: {
      type: "log",
      label: "Rows the database examines",
      domain: [10, 20000],
      ticks: [10, 100, 1000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    color: { domain: ["OFFSET", "Cursor (WHERE id > …)"], range: [ACCENT, PRIMARY] },
    marks: [
      Plot.line(rows, { x: "page", y: "examined", stroke: "mode", strokeWidth: 2 }),
      Plot.dot(rows, { x: "page", y: "examined", fill: "mode", r: 3 }),
      Plot.text(
        [
          { page: DEEP, examined: offsetDeep, mode: "OFFSET" },
          { page: DEEP, examined: PAGE, mode: "Cursor (WHERE id > …)" },
        ],
        {
          x: "page",
          y: "examined",
          text: (d) => `${d.mode.split(" (")[0]}\n${d.examined.toLocaleString()} rows`,
          fill: "mode",
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.ruleY([PAGE], { stroke: GUIDE, strokeWidth: 1.25, strokeDasharray: "3,3" }),
      Plot.text([{}], {
        x: 1.15,
        y: 14000,
        text: () => `both return ${PAGE} rows every time`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
