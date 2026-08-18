/**
 * The page arithmetic behind the admin users table. Tested directly: the page
 * itself sits behind an admin gate and the test environment is Node with no
 * DOM, so the maths is the whole behaviour.
 */
import { describe, expect, it } from "vitest";
import {
  clampPage,
  pageCount,
  pageItems,
  pageRange,
  type PageItem,
} from "@/lib/pagination";

describe("pageCount", () => {
  it("counts whole and partial pages", () => {
    expect(pageCount(50, 25)).toBe(2);
    expect(pageCount(51, 25)).toBe(3);
    expect(pageCount(1, 25)).toBe(1);
  });

  it("never drops below one page, so an empty list reads 'of 1'", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(-3, 25)).toBe(1);
  });

  it("survives a nonsense page size", () => {
    expect(pageCount(50, 0)).toBe(1);
    expect(pageCount(50, Number.NaN)).toBe(1);
  });
});

describe("clampPage", () => {
  it("keeps a page that is in range", () => {
    expect(clampPage(2, 5)).toBe(2);
  });

  it("snaps back when the list shrinks under it", () => {
    expect(clampPage(9, 3)).toBe(2);
    expect(clampPage(1, 1)).toBe(0);
  });

  it("floors negatives and non-integers to a real page", () => {
    expect(clampPage(-4, 5)).toBe(0);
    expect(clampPage(2.7, 5)).toBe(2);
    expect(clampPage(Number.NaN, 5)).toBe(0);
  });
});

describe("pageRange", () => {
  it("reports the 1-based span on the page", () => {
    expect(pageRange(0, 25, 312)).toEqual({ first: 1, last: 25 });
    expect(pageRange(1, 25, 312)).toEqual({ first: 26, last: 50 });
  });

  it("stops the last page at the real total", () => {
    expect(pageRange(12, 25, 312)).toEqual({ first: 301, last: 312 });
  });

  it("is 0–0 when there is nothing to show", () => {
    expect(pageRange(0, 25, 0)).toEqual({ first: 0, last: 0 });
  });

  it("clamps a page that is past the end", () => {
    expect(pageRange(99, 25, 30)).toEqual({ first: 26, last: 30 });
  });
});

describe("pageItems", () => {
  it("lists every page when they all fit", () => {
    expect(pageItems(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(pageItems(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("keeps first, last and current, eliding the rest", () => {
    expect(pageItems(10, 20)).toEqual([0, "gap", 9, 10, 11, "gap", 19]);
  });

  it("spends the missing gap on another page number at either end", () => {
    expect(pageItems(0, 20)).toEqual([0, 1, 2, 3, 4, "gap", 19]);
    expect(pageItems(19, 20)).toEqual([0, "gap", 15, 16, 17, 18, 19]);
  });

  it("never exceeds the slot budget", () => {
    for (let current = 0; current < 40; current++) {
      expect(pageItems(current, 40).length).toBeLessThanOrEqual(7);
    }
  });

  it("always includes the current page", () => {
    for (let current = 0; current < 40; current++) {
      expect(pageItems(current, 40)).toContain(current);
    }
  });

  it("stays strictly ascending, with no page listed twice", () => {
    for (let current = 0; current < 40; current++) {
      const nums = pageItems(current, 40).filter(
        (i): i is number => i !== "gap",
      );
      expect(nums).toEqual([...nums].sort((a, b) => a - b));
      expect(new Set(nums).size).toBe(nums.length);
    }
  });

  it("only elides where pages were actually skipped", () => {
    for (let current = 0; current < 40; current++) {
      const items: PageItem[] = pageItems(current, 40);
      items.forEach((item, i) => {
        if (item !== "gap") return;
        const before = items[i - 1];
        const after = items[i + 1];
        expect(typeof before).toBe("number");
        expect(typeof after).toBe("number");
        expect((after as number) - (before as number)).toBeGreaterThan(1);
      });
    }
  });

  it("honours a wider slot budget", () => {
    expect(pageItems(10, 20, 9)).toEqual([
      0,
      "gap",
      8,
      9,
      10,
      11,
      12,
      "gap",
      19,
    ]);
  });

  it("handles a single page", () => {
    expect(pageItems(0, 1)).toEqual([0]);
    expect(pageItems(0, 0)).toEqual([0]);
  });
});
