/**
 * What a query optimiser does that an eager API cannot, drawn as the rows each
 * stage actually reads.
 *
 * Written eagerly, `read_parquet(...)` materialises the file, then `.filter()`
 * discards most of it, then `[cols]` throws away most of what is left. Every
 * one of those steps has already been paid for by the time it runs, because
 * each call had to return a real frame before the next one could be written.
 *
 * A lazy frame is a *plan*, not a result, so the optimiser sees the filter and
 * the projection before anything is read and pushes both down into the scan:
 * row groups whose statistics cannot match are skipped, and only the named
 * columns are decoded. The saving is not a faster filter; it is a filter that
 * never has to look at most of the rows.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Cells read at each stage of the same query, run eagerly and lazily, on a logarithmic scale. The eager plan reads the whole file before filtering; the lazy plan pushes the filter and the column list into the scan and reads a fraction of it.";

const ROWS = 50_000_000;
const COLUMNS = 40;
const PROJECTED = 3;
const SELECTIVITY = 0.02;
/** Row groups that survive min/max statistics: coarser than the filter, so
 *  pruning keeps more than the predicate strictly needs. */
const GROUPS_KEPT = 0.08;

const STAGES = [
  {
    key: "Scan the file",
    eager: ROWS * COLUMNS,
    lazy: ROWS * GROUPS_KEPT * PROJECTED,
  },
  {
    key: "Apply the filter",
    eager: ROWS * COLUMNS,
    lazy: ROWS * GROUPS_KEPT * PROJECTED,
  },
  {
    key: "Select 3 columns",
    eager: ROWS * SELECTIVITY * COLUMNS,
    lazy: ROWS * SELECTIVITY * PROJECTED,
  },
];

const rows = STAGES.flatMap((s) => [
  { stage: s.key, mode: "Eager", n: Math.round(s.eager) },
  { stage: s.key, mode: "Lazy, optimised", n: Math.round(s.lazy) },
]);

const EAGER = STAGES.reduce((t, s) => t + s.eager, 0);
const LAZY = STAGES.reduce((t, s) => t + s.lazy, 0);

export const caption = `A ${(ROWS / 1e6).toFixed(0)}-million-row file of ${COLUMNS} columns, a filter that keeps ${SELECTIVITY * 100}% of rows, and ${PROJECTED} columns wanted. Eagerly, every call has to return a real frame before the next one can be written, so the file is fully read and then mostly discarded. A lazy frame is a plan rather than a result, so the optimiser sees the filter and the column list before anything is read: it skips row groups whose statistics cannot match and decodes only the named columns. ${(EAGER / 1e9).toFixed(1)} billion cells against ${(LAZY / 1e6).toFixed(0)} million, and the saving is not a faster filter but a filter that never sees most of the rows.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 30,
    marginLeft: 138,
    marginRight: 140,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: STAGES.map((s) => s.key) },
    x: {
      label: "Cells read",
      labelAnchor: "center",
      type: "log",
      domain: [1e6, 4e9],
      ticks: [1e6, 1e7, 1e8, 1e9],
      tickFormat: (d) => (d >= 1e9 ? `${d / 1e9}B` : `${d / 1e6}M`),
    },
    y: { label: null, domain: ["Eager", "Lazy, optimised"], padding: 0.24, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "stage",
        y: "mode",
        x1: 1e6,
        x2: "n",
        fill: (d) => (d.mode === "Eager" ? ACCENT : PRIMARY),
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        fy: "stage",
        y: "mode",
        x: "n",
        text: (d) => (d.n >= 1e9 ? `${(d.n / 1e9).toFixed(1)}B` : `${Math.round(d.n / 1e6)}M`),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
