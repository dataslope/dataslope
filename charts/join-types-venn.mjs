/**
 * The four join types as the same two circles shaded four ways.
 *
 * Every join in this figure matches rows identically — the `ON` condition is
 * the same in all four — and they differ in exactly one thing: what happens to
 * a key that only one side has. `INNER` throws it away, `LEFT` and `RIGHT`
 * keep one side's and fill the other side's columns with `NULL`, `FULL` keeps
 * both. Written out as four rules that is four things to remember; drawn as
 * one picture shaded four ways it is one.
 *
 * The circles are sets of *keys*, not of rows, and that distinction is the
 * whole honest reading of a join Venn. The diagram says which keys survive; it
 * says nothing about how many rows each surviving key contributes, and a key
 * appearing three times on the left and twice on the right contributes six.
 * That is the fan-out `join-fanout-rows` is about, and it is why this figure
 * is a map of the join's *rule* rather than of its output.
 */
import { plot } from "./_theme.mjs";
import { BOTH, LEFT, RIGHT, WIDTH, vennPanels, vennSpace } from "./_venn.mjs";

export const title =
  "The same pair of overlapping key sets shaded four ways: an inner join keeps only the overlap, a left join the whole left circle, a right join the whole right circle, and a full join both circles entirely.";

const PANELS = [
  {
    title: "INNER JOIN",
    note: "keys on both sides,\nunmatched rows dropped",
    keeps: [BOTH],
  },
  {
    title: "LEFT JOIN",
    note: "every left key,\nNULLs where none matched",
    keeps: [LEFT, BOTH],
  },
  {
    title: "RIGHT JOIN",
    note: "every right key,\nNULLs where none matched",
    keeps: [BOTH, RIGHT],
  },
  {
    title: "FULL JOIN",
    note: "every key from either side,\nNULLs on whichever is missing",
    keeps: [LEFT, BOTH, RIGHT],
  },
];

export const caption =
  "All four joins match the same way; they differ only in which *unmatched* keys survive. Ask whose rows you refuse to lose and the picture names the join. Read the circles as sets of keys rather than of rows, though: the diagram says which keys come back, not how many rows each one brings, and a key that appears three times on the left and twice on the right contributes six rows to that overlap, not one. `CROSS JOIN` has no picture here at all, because it matches on nothing and pairs every row with every row.";

/** An inlined SVG scales its type with its box, and this figure is laid out
 *  at 400px so it never has to scroll on a phone (see `_venn.mjs`). Left
 *  uncapped it would stretch to an 836px interview column and render its
 *  labels at 21px, shouting over the heading above it. */
export const maxWidth = 560;

export function render() {
  const { marks, height, width } = vennPanels(PANELS, { columns: 2, width: WIDTH });
  return plot({
    ...vennSpace(width, height),
    ariaLabel: title,
    marks,
  });
}
