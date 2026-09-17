import { describe, expect, it } from "vitest";
import {
  catalogStickyOffset,
  scrollTopRevealingList,
} from "../app/courses/_components/catalogScroll";

// Clicking a language or level in the `/courses` sidebar filters the list in
// place, which usually makes it shorter than the scroll position the reader is
// already at. These decide where the page should end up afterwards, so that a
// filtered catalog is on screen rather than above it. See
// app/courses/_components/catalogScroll.ts.

describe("the sticky offset above the course list", () => {
  // Desktop: no filter bar (it is `md:hidden`), so the number to clear is the
  // compacted header plus its fade, which is what the sidebar's own
  // `md:top-[68px]` already clears.
  it("clears the compacted header when there is no mobile filter bar", () => {
    expect(catalogStickyOffset(0)).toBe(68);
  });

  // Mobile: the bar is stuck directly below the header, so both are in the way.
  it("clears the header and the mobile filter bar together", () => {
    expect(catalogStickyOffset(120)).toBe(44 + 120 + 8);
  });

  // The bar grows a "Reset filters" row once a filter is on, which is why its
  // height is measured on each click rather than baked in here.
  it("tracks the bar's height as it changes", () => {
    expect(catalogStickyOffset(150)).toBeGreaterThan(catalogStickyOffset(120));
  });
});

describe("where a filter click should scroll to", () => {
  const OFFSET = 68;

  // The whole point: the reader is deep in the catalog, the list shrinks to a
  // course or two, and its top is now well above the viewport.
  it("brings a list that has gone above the viewport back under the header", () => {
    expect(scrollTopRevealingList(-1200, 1500, OFFSET)).toBe(1500 - 1200 - 68);
  });

  // Anything already clear of the sticky stack is visible, and moving the page
  // under a reader who can see what they clicked would be the rude kind of
  // scrolling.
  it("leaves the page alone when the list is already in view", () => {
    expect(scrollTopRevealingList(OFFSET, 400, OFFSET)).toBeNull();
    expect(scrollTopRevealingList(300, 0, OFFSET)).toBeNull();
  });

  // A list tucked just under the sticky stack still needs the small correction,
  // or its first card stays hidden behind the header.
  it("corrects a list hidden just under the sticky stack", () => {
    expect(scrollTopRevealingList(60, 120, OFFSET)).toBe(112);
  });

  // The result is never below where the page already is: a click can only ever
  // scroll up towards the results, never down away from them.
  it("only ever scrolls upwards", () => {
    for (const listTop of [-2000, -500, -1, 0, 67]) {
      const top = scrollTopRevealingList(listTop, 900, OFFSET);
      expect(top).not.toBeNull();
      expect(top!).toBeLessThan(900);
    }
  });

  // Near the top of a short page the correction can compute past the start of
  // the document, which browsers clamp anyway; saying 0 keeps the intent clear.
  it("never asks for a negative scroll position", () => {
    expect(scrollTopRevealingList(-10, 20, OFFSET)).toBe(0);
  });

  // On mobile the offset is larger, so the same list top lands the page higher.
  it("scrolls further when more is stuck to the top", () => {
    const desktop = scrollTopRevealingList(-500, 1000, 68)!;
    const mobile = scrollTopRevealingList(-500, 1000, 172)!;
    expect(mobile).toBe(desktop - (172 - 68));
  });
});
