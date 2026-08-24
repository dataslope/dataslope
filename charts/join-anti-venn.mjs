/**
 * The two anti-joins: an outer join followed by `IS NULL`, which keeps only
 * the part of the picture the match never reached.
 *
 * "Customers who have never ordered" and "orders whose customer is gone" are
 * the same question asked of different circles, and both are written as an
 * outer join plus a test for the `NULL` the outer join just invented. That
 * idiom is the part people misremember: the `IS NULL` has to sit in `WHERE`,
 * where it filters the joined result, and moving it into `ON` turns it into
 * part of the match condition, which quietly returns every left row instead.
 *
 * Drawn this way the pattern is one shape rather than one incantation: shade
 * the circle, unshade the overlap, and what is left is what had no partner.
 */
import { plot } from "./_theme.mjs";
import { LEFT, RIGHT, WIDTH, vennPanels, vennSpace } from "./_venn.mjs";

export const title =
  "Two anti-joins on the same overlapping key sets: a left join filtered to NULL keeps the left circle without its overlap, and a full join filtered to NULL keeps both circles without it.";

const PANELS = [
  {
    title: "Left anti-join",
    note: "LEFT JOIN … WHERE right IS NULL\nleft keys that matched nothing",
    keeps: [LEFT],
  },
  {
    title: "Full anti-join",
    note: "FULL JOIN … WHERE either IS NULL\nkeys held by one side only",
    keeps: [LEFT, RIGHT],
  },
];

export const caption =
  "An anti-join is an outer join plus a test for the `NULL` that outer join just produced, and the `IS NULL` belongs in `WHERE`: written into `ON` it becomes part of the match condition and every left row comes back. Swapping the circles gives the right-hand version, which is why most people reorder the tables and keep writing `LEFT`. `NOT EXISTS` draws the first picture too, and on most engines plans about the same.";

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
