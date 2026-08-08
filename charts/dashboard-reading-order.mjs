/**
 * Where the looks go on a twelve-panel grid, and why the headline number is
 * pinned to the top-left.
 *
 * Reading order in a left-to-right script starts at the top-left and decays
 * down the page faster than it decays across it: a reader scans the first row,
 * drops a line, scans a shorter distance, and gives up. The weights here are
 * that decay written out (a steeper fall per row than per column) and
 * normalised to shares, so the numbers in the cells add to 100%.
 *
 * The shares are a model of the shape, not a measurement. The shape is the
 * teachable part: the first cell is worth several of the last ones, so the
 * question of what goes in it is the most consequential layout decision on
 * the whole dashboard, and it is usually made by whoever built the first panel.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A four-column, three-row dashboard grid shaded by how much attention each slot receives. The top-left slot is darkest and the shading fades down and to the right, with the bottom-right slot the palest.";

const COLS = ["Column 1", "Column 2", "Column 3", "Column 4"];
const ROWS = ["Row 1", "Row 2", "Row 3"];

/** Attention decays about twice as fast down the page as across it. */
const weight = (r, c) => Math.exp(-0.62 * r) * Math.exp(-0.3 * c);

const raw = ROWS.flatMap((row, r) => COLS.map((col, c) => ({ row, col, w: weight(r, c) })));
const TOTAL = raw.reduce((s, d) => s + d.w, 0);
const CELLS = raw.map((d) => ({ ...d, share: d.w / TOTAL }));

const FIRST = CELLS[0];
const LAST = CELLS.at(-1);
const RATIO = Math.round(FIRST.share / LAST.share);

export const caption = `Attention falls off down the page faster than it falls off across it, so the top-left slot is worth about ${RATIO} times the bottom-right one. That slot is where the single number the dashboard exists to report belongs, big and labelled. Filling it with whatever chart got built first is the most expensive default on the page.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 66,
    marginRight: 20,
    marginBottom: 30,
    ariaLabel: title,
    x: { label: null, domain: COLS, axis: "top", padding: 0.05 },
    y: { label: null, domain: ROWS, padding: 0.05, grid: false },
    marks: [
      Plot.cell(CELLS, {
        x: "col",
        y: "row",
        fill: (d) => (d === FIRST ? ACCENT : PRIMARY),
        fillOpacity: (d) => 0.1 + 0.62 * (d.share / FIRST.share),
      }),
      Plot.text(CELLS, {
        x: "col",
        y: "row",
        text: (d) => `${(d.share * 100).toFixed(0)}%`,
        fill: MUTED,
        fontSize: 14,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([FIRST], {
        x: "col",
        y: "row",
        text: () => "headline number",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        dy: 20,
        ...HALO,
      }),
    ],
  });
}
