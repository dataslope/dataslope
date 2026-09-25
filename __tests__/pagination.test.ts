/**
 * The page-number strip behind the admin users table: which pages to show and
 * where to elide. Tested directly because the page itself sits behind an
 * admin gate.
 */
import { describe, expect, it } from "vitest";
import { pageItems, type PageItem } from "@/lib/pagination";

describe("pageItems", () => {
  it("keeps first, last and current, eliding the rest", () => {
    expect(pageItems(10, 20)).toEqual([0, "gap", 9, 10, 11, "gap", 19]);
  });

  it("spends the missing gap on another page number at either end", () => {
    expect(pageItems(0, 20)).toEqual([0, 1, 2, 3, 4, "gap", 19]);
    expect(pageItems(19, 20)).toEqual([0, "gap", 15, 16, 17, 18, 19]);
  });

  // One sweep over every position in a long list, asserting the invariants
  // the pager's markup relies on.
  it("stays within budget, keeps the current page, and elides only real gaps", () => {
    for (let current = 0; current < 40; current++) {
      const items: PageItem[] = pageItems(current, 40);
      expect(items.length).toBeLessThanOrEqual(7);
      expect(items).toContain(current);

      const nums = items.filter((i): i is number => i !== "gap");
      expect(nums).toEqual([...nums].sort((a, b) => a - b));
      expect(new Set(nums).size).toBe(nums.length);

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
});
