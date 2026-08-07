/**
 * Where the n log n in merge sort comes from, drawn as the recursion tree's
 * shape rather than derived.
 *
 * Every row is the same total width, because merging the pieces at one level
 * touches every element exactly once no matter how many pieces there are. The
 * number of rows is how many times you can halve n before reaching single
 * elements, which is log₂ n. Multiply the two and you have the running time,
 * and it is legible without a recurrence relation.
 *
 * Drawn at n = 16 so the bottom row is still individually visible; the
 * argument does not change with n, only the number of rows.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five stacked rows of blocks. The top row is one block spanning the full width, the next two half-width blocks, then four, then eight, then sixteen single-element blocks. Every row spans the same total width.";

export const caption =
  "Merge sort halves the array until nothing is left to halve, then merges back up. Each row costs n, because merging a level touches every element once, and there are log₂ n rows. That product is the running time.";

const N = 16;
const LEVELS = Math.log2(N) + 1; // 5 rows for n = 16

const blocks = Array.from({ length: LEVELS }, (_, level) => {
  const pieces = Math.pow(2, level);
  const width = N / pieces;
  return Array.from({ length: pieces }, (_, i) => ({
    level,
    x1: i * width,
    x2: (i + 1) * width,
    pieces,
    width,
  }));
}).flat();

const ROW_LABELS = Array.from({ length: LEVELS }, (_, level) => {
  const pieces = Math.pow(2, level);
  return {
    level,
    text: `${pieces} piece${pieces === 1 ? "" : "s"} of ${N / pieces}`,
  };
});

export function render() {
  return plot({
    height: 320,
    marginTop: 44,
    marginLeft: 24,
    marginRight: 128,
    marginBottom: 40,
    ariaLabel: title,
    x: { label: null, domain: [0, N], ticks: [], grid: false },
    y: { label: null, domain: [-0.7, LEVELS + 0.15], ticks: [], grid: false, reverse: true },
    marks: [
      Plot.rect(blocks, {
        // A hair of inset on each side so adjoining pieces read as separate
        // without a stroke, which would double the ink at the bottom row.
        x1: (d) => d.x1 + 0.06,
        x2: (d) => d.x2 - 0.06,
        y1: (d) => d.level - 0.3,
        y2: (d) => d.level + 0.3,
        fill: PRIMARY,
        fillOpacity: 0.42,
      }),
      Plot.text(ROW_LABELS, {
        x: N,
        y: "level",
        text: "text",
        fill: MUTED,
        fontSize: 12,
        textAnchor: "start",
        dx: 12,
      }),
      // The two factors, each named against the direction it runs in.
      Plot.text([{}], {
        x: N / 2,
        y: -0.62,
        text: () => `every row is n = ${N} elements wide`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0,
        y: LEVELS - 0.05,
        text: () => `log₂ ${N} + 1 = ${LEVELS} rows`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
