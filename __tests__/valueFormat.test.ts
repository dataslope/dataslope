import { describe, expect, it } from "vitest";
import {
  toDateOnlyString,
  unscaledDecimalToString,
  unscaledIntegerFrom,
} from "../app/_components/runtime/valueFormat";

describe("toDateOnlyString", () => {
  it("formats a JS Date (PGlite date) as YYYY-MM-DD using UTC parts", () => {
    expect(toDateOnlyString(new Date("2024-12-30T00:00:00.000Z"))).toBe(
      "2024-12-30",
    );
    // 23:30 UTC must stay the 30th, not roll to the 31st in a +tz runner.
    expect(toDateOnlyString(new Date("2024-12-30T23:30:00.000Z"))).toBe(
      "2024-12-30",
    );
  });

  it("formats a DuckDB Date32 epoch-millis number", () => {
    // 1704412800000 ms = 2024-01-05 UTC
    expect(toDateOnlyString(1704412800000)).toBe("2024-01-05");
    expect(toDateOnlyString(1681257600000)).toBe("2023-04-12");
  });

  it("formats a day-count number (Arrow builds that return days)", () => {
    // 19727 days since epoch = 2024-01-05
    expect(toDateOnlyString(19727)).toBe("2024-01-05");
  });

  it("extracts the date part from a string and passes plain dates through", () => {
    expect(toDateOnlyString("2024-01-05")).toBe("2024-01-05");
    expect(toDateOnlyString("2024-01-05T14:30:00Z")).toBe("2024-01-05");
  });

  it("returns null for unrecognizable values", () => {
    expect(toDateOnlyString(null)).toBeNull();
    expect(toDateOnlyString(undefined)).toBeNull();
    expect(toDateOnlyString({})).toBeNull();
    expect(toDateOnlyString(new Date("nope"))).toBeNull();
  });
});

describe("unscaledDecimalToString", () => {
  it("re-applies the scale (the DuckDB decimal round-trip bug)", () => {
    expect(unscaledDecimalToString(2999n, 2)).toBe("29.99");
    expect(unscaledDecimalToString(187505n, 2)).toBe("1875.05");
    expect(unscaledDecimalToString(950n, 2)).toBe("9.50");
    expect(unscaledDecimalToString(5n, 2)).toBe("0.05");
  });

  it("handles negatives and scale 0", () => {
    expect(unscaledDecimalToString(-2999n, 2)).toBe("-29.99");
    expect(unscaledDecimalToString(42n, 0)).toBe("42");
  });

  it("pads the fractional part", () => {
    expect(unscaledDecimalToString(1000n, 4)).toBe("0.1000");
    expect(unscaledDecimalToString(1n, 3)).toBe("0.001");
  });
});

describe("unscaledIntegerFrom", () => {
  it("reads a BigInt directly", () => {
    expect(unscaledIntegerFrom(2999n)).toBe(2999n);
  });

  it("reads an object/number whose String() is a plain integer", () => {
    // duckdb-wasm hands DECIMAL back as an object stringifying to the unscaled int
    const decimalLike = { toString: () => "2999" };
    expect(unscaledIntegerFrom(decimalLike)).toBe(2999n);
    expect(unscaledIntegerFrom(2999)).toBe(2999n);
    expect(unscaledIntegerFrom("2999")).toBe(2999n);
  });

  it("returns null for already-formatted decimals (guards double-scaling)", () => {
    expect(unscaledIntegerFrom("29.99")).toBeNull();
    expect(unscaledIntegerFrom(null)).toBeNull();
    expect(unscaledIntegerFrom({ toString: () => "n/a" })).toBeNull();
  });
});
