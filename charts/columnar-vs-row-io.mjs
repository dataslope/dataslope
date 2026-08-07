/**
 * Why an analytical query is faster on columnar storage, in the only terms
 * that matter: how many bytes leave the disk.
 *
 * A row store keeps whole rows together, so reading two columns out of twenty
 * still reads all twenty. A column store keeps each column separately, so it
 * reads the two. The saving is not a constant factor of the engine, it is the
 * share of columns the query touches, and it gets better the wider the table
 * gets and the narrower the query is.
 *
 * The bars are computed from the column count and the projection, so the ratio
 * quoted in the caption is arithmetic. Compression is left out deliberately:
 * columnar storage also compresses far better, which makes the real gap wider
 * still, and folding a guessed compression ratio in would make the figure less
 * checkable rather than more impressive.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Bytes read for the same query against tables of ten, twenty and fifty columns, under row and columnar storage. The row store reads the whole table every time; the column store reads only the three columns the query names.";

const PROJECTED = 3;
const WIDTHS = [10, 20, 50];
const ROW_BYTES = 8; // per column value, before compression

const rows = WIDTHS.flatMap((cols) => [
  { cols, panel: `${cols}-column table`, mode: "Row store", bytes: cols * ROW_BYTES },
  { cols, panel: `${cols}-column table`, mode: "Column store", bytes: PROJECTED * ROW_BYTES },
]);

const WIDEST = WIDTHS.at(-1);
const RATIO = WIDEST / PROJECTED;

export const caption =
  `The query names ${PROJECTED} columns. A row store keeps rows contiguous, so it reads all of them; a column store reads ${PROJECTED}. On a ${WIDEST}-column table that is ${RATIO.toFixed(0)} times less I/O for the same answer, and the ratio is simply the share of columns you asked for. Compression makes the real gap wider; it is left out here so the arithmetic stays checkable.`;

export function render() {
  return plot({
    height: 290,
    marginTop: 34,
    marginLeft: 60,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: WIDTHS.map((c) => `${c}-column table`) },
    x: { label: null, domain: ["Row store", "Column store"], padding: 0.3 },
    y: { label: "Bytes read per row", domain: [0, WIDEST * ROW_BYTES * 1.15], ticks: 5 },
    marks: [
      Plot.barY(rows, {
        x: "mode",
        y: "bytes",
        fx: "panel",
        fill: (d) => (d.mode === "Row store" ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.text(rows, {
        x: "mode",
        y: "bytes",
        fx: "panel",
        text: (d) => `${d.bytes}B`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),
      Plot.text(
        // The band value has to live on the datum: `x: "Column store"` is read
        // as a *field name*, resolves to undefined, and the mark vanishes.
        WIDTHS.map((c) => ({ panel: `${c}-column table`, mode: "Column store", ratio: c / PROJECTED })),
        {
          x: "mode",
          y: WIDEST * ROW_BYTES * 1.08,
          fx: "panel",
          text: (d) => `${d.ratio.toFixed(1)}x less`,
          fill: PRIMARY,
          fontSize: 10.5,
          fontWeight: 600,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
