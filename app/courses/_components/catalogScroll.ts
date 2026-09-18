/**
 * Keeping the `/courses` list in view when its filters change.
 *
 * The filter sidebar is sticky, so a language or level can be clicked from any
 * scroll depth, and a click almost always makes the list shorter. Pick "CSS"
 * from halfway down 33 courses and its one match ends up above the viewport:
 * the sidebar says "1" while the reader is left on blank page below the list.
 * The catalog answers a filter click by scrolling the top of the results back
 * out from under the sticky header.
 *
 * The geometry lives here as pure functions so it can be tested in Node; the
 * component does the measuring and the scrolling.
 */

/** The compacted header's `h-11`, which the mobile filter bar's `top-11`
 *  clears by sitting directly below it (see HomeNav and CoursesCatalog). */
const MOBILE_HEADER_HEIGHT = 44;

/** Breathing room between the mobile filter bar and the row below it. */
const MOBILE_GAP = 8;

/** What the desktop sidebar's own `md:top-[68px]` clears: the compacted
 *  header (`md:h-12`), its 12px fade, and a gap. Landing the list header at
 *  the same line puts it level with the top of the sidebar. */
const DESKTOP_OFFSET = 68;

/**
 * How much of the viewport's top edge is spoken for by whatever is stuck
 * there. `mobileFilterBarHeight` is that bar's measured height, which is 0 on
 * desktop because the bar is `md:hidden` (and the sidebar is what shows
 * instead); its height varies with the "Reset filters" row, so it is measured
 * rather than assumed.
 */
export function catalogStickyOffset(mobileFilterBarHeight: number): number {
  return mobileFilterBarHeight > 0
    ? MOBILE_HEADER_HEIGHT + mobileFilterBarHeight + MOBILE_GAP
    : DESKTOP_OFFSET;
}

/**
 * The scroll position that puts the top of the course list just below the
 * sticky stack, or `null` when the list is already clear of it and nothing
 * should move. `listTop` is the list's viewport-relative top.
 *
 * Only ever scrolls up: the result is below the current position exactly when
 * the list has gone under the sticky stack, so clicking a filter near the top
 * of the page never drags the reader away from the heading they arrived on.
 */
export function scrollTopRevealingList(
  listTop: number,
  scrollY: number,
  stickyOffset: number,
): number | null {
  if (listTop >= stickyOffset) return null;
  return Math.max(0, scrollY + listTop - stickyOffset);
}
