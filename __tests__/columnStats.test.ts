import { describe, expect, it } from "vitest";
import {
  asFiniteNumber,
  computeColumnStats,
  formatPercent,
  formatStatNumber,
} from "../app/_components/sql/utils/columnStats";

describe("asFiniteNumber", () => {
  it("accepts real finite numbers", () => {
    expect(asFiniteNumber(5)).toBe(5);
    expect(asFiniteNumber(-2.5)).toBe(-2.5);
    expect(asFiniteNumber(0)).toBe(0);
  });

  it("parses finite numeric strings (PG numeric/decimal arrive as strings)", () => {
    expect(asFiniteNumber("29.99")).toBe(29.99);
    expect(asFiniteNumber(" 5 ")).toBe(5);
    expect(asFiniteNumber("1e3")).toBe(1000);
    expect(asFiniteNumber("-0.5")).toBe(-0.5);
  });

  it("rejects the empty string, non-numeric text, and non-finite values", () => {
    expect(asFiniteNumber("")).toBeNull();
    expect(asFiniteNumber("   ")).toBeNull();
    expect(asFiniteNumber("abc")).toBeNull();
    expect(asFiniteNumber("12abc")).toBeNull();
    expect(asFiniteNumber(Infinity)).toBeNull();
    expect(asFiniteNumber(NaN)).toBeNull();
    expect(asFiniteNumber(null)).toBeNull();
    expect(asFiniteNumber(true)).toBeNull();
  });
});

describe("computeColumnStats, counts & nulls", () => {
  it("handles an empty column", () => {
    const s = computeColumnStats([]);
    expect(s.total).toBe(0);
    expect(s.nonNull).toBe(0);
    expect(s.nulls).toBe(0);
    expect(s.nullFraction).toBe(0);
    expect(s.distinct).toBe(0);
    expect(s.kind).toBe("empty");
    expect(s.top).toEqual([]);
    expect(s.numeric).toBeUndefined();
    expect(s.text).toBeUndefined();
  });

  it("treats null and undefined as nulls", () => {
    const s = computeColumnStats([null, undefined, null]);
    expect(s.total).toBe(3);
    expect(s.nonNull).toBe(0);
    expect(s.nulls).toBe(3);
    expect(s.nullFraction).toBe(1);
    expect(s.kind).toBe("empty");
  });

  it("computes the null fraction over all rows", () => {
    const s = computeColumnStats([1, 2, 3, 3, null]);
    expect(s.total).toBe(5);
    expect(s.nonNull).toBe(4);
    expect(s.nulls).toBe(1);
    expect(s.nullFraction).toBeCloseTo(0.2, 10);
  });
});

describe("computeColumnStats, numeric columns", () => {
  it("aggregates integer values (min/max/sum/mean/median)", () => {
    const s = computeColumnStats([1, 2, 3, 3, null]);
    expect(s.kind).toBe("numeric");
    expect(s.distinct).toBe(3);
    expect(s.numeric).toEqual({
      count: 4,
      min: 1,
      max: 3,
      sum: 9,
      mean: 2.25,
      median: 2.5, // even count: (2 + 3) / 2
    });
  });

  it("uses the middle element for an odd count median", () => {
    const s = computeColumnStats([10, 1, 100]);
    expect(s.numeric?.median).toBe(10);
  });

  it("treats finite numeric strings as numbers", () => {
    const s = computeColumnStats(["29.99", "10.00", "100"]);
    expect(s.kind).toBe("numeric");
    expect(s.numeric?.min).toBe(10);
    expect(s.numeric?.max).toBe(100);
    expect(s.numeric?.sum).toBeCloseTo(139.99, 10);
    expect(s.numeric?.count).toBe(3);
  });

  it("counts a 0/1 SQLite-boolean column as numeric (mean = fraction true)", () => {
    const s = computeColumnStats([1, 0, 1, 1]);
    expect(s.kind).toBe("numeric");
    expect(s.numeric?.mean).toBe(0.75);
  });
});

describe("computeColumnStats, text columns", () => {
  it("classifies non-numeric strings as text with length stats", () => {
    const s = computeColumnStats(["apple", "banana", "apple", null]);
    expect(s.kind).toBe("text");
    expect(s.distinct).toBe(2);
    expect(s.text).toEqual({
      count: 3,
      minLength: 5, // "apple"
      maxLength: 6, // "banana"
      avgLength: (5 + 6 + 5) / 3,
    });
    expect(s.numeric).toBeUndefined();
  });

  it("treats a column with an empty-string value as text (empty != numeric)", () => {
    const s = computeColumnStats(["1", "2", ""]);
    expect(s.kind).toBe("text");
    expect(s.text?.minLength).toBe(0);
    expect(s.text?.maxLength).toBe(1);
  });

  it("treats a mix of numbers and non-numeric text as text", () => {
    const s = computeColumnStats([1, "apple"]);
    expect(s.kind).toBe("text");
  });
});

describe("computeColumnStats, boolean / blob / mixed", () => {
  it("classifies real JS booleans (PG boolean) as boolean", () => {
    const s = computeColumnStats([true, false, true]);
    expect(s.kind).toBe("boolean");
    expect(s.distinct).toBe(2);
    expect(s.top[0]).toEqual({ label: "true", count: 2 });
    expect(s.numeric).toBeUndefined();
    expect(s.text).toBeUndefined();
  });

  it("classifies Uint8Array values as blob (distinct keyed by length)", () => {
    const s = computeColumnStats([
      new Uint8Array([1, 2]),
      new Uint8Array([3, 4, 5]),
      new Uint8Array([9, 9]),
    ]);
    expect(s.kind).toBe("blob");
    expect(s.distinct).toBe(2); // lengths 2 and 3
  });

  it("classifies an unrelated mix (number + text + boolean) as mixed", () => {
    const s = computeColumnStats([1, "apple", true]);
    expect(s.kind).toBe("mixed");
  });
});

describe("computeColumnStats, distinct & top", () => {
  it("does not collapse a number and the equivalent string", () => {
    const s = computeColumnStats([1, "1"]);
    expect(s.distinct).toBe(2);
  });

  it("orders top values by count desc then label, and respects topN", () => {
    const s = computeColumnStats(
      ["b", "b", "b", "a", "a", "c"],
      2,
    );
    expect(s.top).toEqual([
      { label: "b", count: 3 },
      { label: "a", count: 2 },
    ]);
  });
});

describe("formatStatNumber / formatPercent", () => {
  it("groups integers and trims fractional precision", () => {
    expect(formatStatNumber(1234)).toBe((1234).toLocaleString());
    expect(formatStatNumber(2.25)).toBe("2.25");
    expect(formatStatNumber(46.66331)).toBe(
      Number("46.6633").toLocaleString(undefined, { maximumFractionDigits: 4 }),
    );
  });

  it("formats fractions as percentages", () => {
    expect(formatPercent(0.2)).toBe("20%");
    expect(formatPercent(0.125)).toBe("12.5%");
    expect(formatPercent(0)).toBe("0%");
  });
});
