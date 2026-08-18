/**
 * Pure page arithmetic for the paginated lists (the admin users table today).
 * Kept out of the components so it can be tested in Node: those pages sit
 * behind an admin gate and the test environment has no DOM, so the arithmetic
 * is the whole behaviour worth pinning down.
 *
 * Pages are 0-based everywhere in here; the +1 belongs to the UI.
 */

/** How many pages `total` rows fill at `size` each. Never below 1, so an empty
 *  list still reads "Page 1 of 1" rather than "of 0". */
export function pageCount(total: number, size: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(size) || size <= 0) return 1;
  return Math.max(1, Math.ceil(Math.max(0, total) / size));
}

/** Snap a page into range. `count` shrinks under you when rows are removed or
 *  a search narrows, and a page past the end would render empty. */
export function clampPage(page: number, count: number): number {
  if (!Number.isFinite(page)) return 0;
  return Math.min(Math.max(0, Math.floor(page)), Math.max(0, count - 1));
}

/** The 1-based inclusive row span shown on `page` ("26–50 of 312"). Both ends
 *  are 0 when there is nothing to show. */
export function pageRange(
  page: number,
  size: number,
  total: number,
): { first: number; last: number } {
  if (total <= 0 || size <= 0) return { first: 0, last: 0 };
  const current = clampPage(page, pageCount(total, size));
  return {
    first: current * size + 1,
    last: Math.min((current + 1) * size, total),
  };
}

/** A page button, or an elided stretch of them. */
export type PageItem = number | "gap";

/**
 * The page buttons to render, at most `maxSlots` of them. The first, last and
 * current pages always survive; whatever is dropped in between becomes a
 * "gap". With few enough pages every one is listed and no gap appears.
 */
export function pageItems(
  current: number,
  count: number,
  maxSlots = 7,
): PageItem[] {
  const pages = Math.max(1, Math.floor(count));
  // Below five there is no room for first + gap + current + gap + last, and
  // the windowing degenerates.
  const slots = Math.max(5, Math.floor(maxSlots));
  const page = clampPage(current, pages);

  if (pages <= slots) return Array.from({ length: pages }, (_, i) => i);

  // Two slots go to the first/last page and up to two more to the gaps.
  const windowSize = slots - 4;
  let start = page - Math.floor((windowSize - 1) / 2);
  let end = start + windowSize - 1;
  if (start <= 1) {
    // Butted against the front: the leading gap is gone, so spend its slot on
    // one more page number.
    start = 1;
    end = Math.min(pages - 2, windowSize + 1);
  } else if (end >= pages - 2) {
    end = pages - 2;
    start = Math.max(1, pages - 2 - windowSize);
  }

  const items: PageItem[] = [0];
  if (start > 1) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pages - 2) items.push("gap");
  items.push(pages - 1);
  return items;
}
