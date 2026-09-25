import { describe, expect, it } from "vitest";
import {
  asFiniteNumber,
  computeColumnStats,
} from "../app/_components/sql/utils/columnStats";

describe("asFiniteNumber", () => {
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

  it("treats finite numeric strings as numbers", () => {
    const s = computeColumnStats(["29.99", "10.00", "100"]);
    expect(s.kind).toBe("numeric");
    expect(s.numeric?.min).toBe(10);
    expect(s.numeric?.max).toBe(100);
    expect(s.numeric?.sum).toBeCloseTo(139.99, 10);
    expect(s.numeric?.count).toBe(3);
  });
});

describe("computeColumnStats, text columns", () => {
  it("treats a column with an empty-string value as text (empty != numeric)", () => {
    const s = computeColumnStats(["1", "2", ""]);
    expect(s.kind).toBe("text");
    expect(s.text?.minLength).toBe(0);
    expect(s.text?.maxLength).toBe(1);
  });
});

describe("computeColumnStats, mixed columns", () => {
  it("classifies an unrelated mix (number + text + boolean) as mixed", () => {
    const s = computeColumnStats([1, "apple", true]);
    expect(s.kind).toBe("mixed");
  });
});
