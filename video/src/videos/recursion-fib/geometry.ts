// Where the call trees of Figs. 2 and 5 sit on the page, in layout units
// (pass y values through `useLayout().y()`). Both figures draw fib(5) at the
// same place, so the memoized tree collapses out of the naive one.

/** Width of one leaf slot, and the x of slot 0 for the naive tree. */
export const SLOT = 150;
export const NAIVE_X0 = 205;
/** The top of depth 1, and the step down per level. */
export const LEVEL_TOP = 216;
export const LEVEL_STEP = 138;
/** The right-hand column: the call counter, and the stack under it. */
export const SIDE_X = 1452;
export const SIDE_W = 330;
export const COUNTER_TOP = 196;

export const nodeX = (slot: number, x0 = NAIVE_X0) => x0 + slot * SLOT;
/** Layout-unit top of a node at `depth` (1 is the root). */
export const levelTop = (depth: number) => LEVEL_TOP + (depth - 1) * LEVEL_STEP;
