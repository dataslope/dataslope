import { describe, expect, it } from "vitest";
import {
  topoSortByForeignKeys,
  formatSqlDumpValue,
} from "../app/_components/sql/utils/exportOrder";

describe("topoSortByForeignKeys", () => {
  const order = (
    tables: string[],
    deps: Record<string, string[]>,
  ) => topoSortByForeignKeys(tables, (t) => deps[t] ?? []);

  it("emits referenced tables before the tables that reference them", () => {
    // The reported case: cards/transactions FK -> users/vendors, but sort first.
    const tables = ["cards", "transactions", "users", "vendors"];
    const deps = {
      cards: ["users"],
      transactions: ["users", "cards", "vendors"],
    };
    const out = order(tables, deps);
    const idx = (t: string) => out.indexOf(t);
    expect(idx("users")).toBeLessThan(idx("cards"));
    expect(idx("users")).toBeLessThan(idx("transactions"));
    expect(idx("cards")).toBeLessThan(idx("transactions"));
    expect(idx("vendors")).toBeLessThan(idx("transactions"));
    expect([...out].sort()).toEqual([...tables].sort()); // same set, no loss
  });

  it("leaves an independent set in input order", () => {
    expect(order(["a", "b", "c"], {})).toEqual(["a", "b", "c"]);
  });

  it("ignores self-references and FKs to tables outside the dump", () => {
    const out = order(["a", "b"], { a: ["a"], b: ["external", "a"] });
    expect(out).toEqual(["a", "b"]);
  });

  it("does not loop on a dependency cycle", () => {
    const out = order(["a", "b"], { a: ["b"], b: ["a"] });
    expect([...out].sort()).toEqual(["a", "b"]);
    expect(out).toHaveLength(2);
  });

  it("handles a longer dependency chain", () => {
    const out = order(["d", "c", "b", "a"], {
      d: ["c"],
      c: ["b"],
      b: ["a"],
    });
    expect(out).toEqual(["a", "b", "c", "d"]);
  });
});

describe("formatSqlDumpValue", () => {
  it("emits booleans as TRUE/FALSE for boolean columns (adapter coerces to 0/1)", () => {
    expect(formatSqlDumpValue(1, "boolean")).toBe("TRUE");
    expect(formatSqlDumpValue(0, "boolean")).toBe("FALSE");
    expect(formatSqlDumpValue(true, "bool")).toBe("TRUE");
    expect(formatSqlDumpValue(false, "boolean")).toBe("FALSE");
  });

  it("does not treat integers in non-boolean columns as booleans", () => {
    expect(formatSqlDumpValue(1, "integer")).toBe("1");
    expect(formatSqlDumpValue(0, "numeric")).toBe("0");
  });

  it("passes numbers/bigints through and NULLs", () => {
    expect(formatSqlDumpValue(42, "integer")).toBe("42");
    expect(formatSqlDumpValue(12n, "bigint")).toBe("12");
    expect(formatSqlDumpValue(null, "text")).toBe("NULL");
    expect(formatSqlDumpValue(undefined, "text")).toBe("NULL");
  });

  it("single-quotes strings and doubles embedded quotes", () => {
    expect(formatSqlDumpValue("O'Brien", "text")).toBe("'O''Brien'");
    expect(formatSqlDumpValue("2024-12-30", "date")).toBe("'2024-12-30'");
  });

  it("emits binary as a hex literal", () => {
    expect(formatSqlDumpValue(new Uint8Array([0, 255, 16]), "bytea")).toBe(
      "'\\x00ff10'",
    );
  });
});
