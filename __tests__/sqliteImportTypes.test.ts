import { describe, expect, it } from "vitest";
import {
  inferColumnTypeFromValues,
  sqliteAffinityFor,
  sqliteColumnType,
} from "../app/_components/sql/utils/importUtils";
import { referencesIdentifier } from "../app/_components/runtime/sqlite-core";
import { inferColumnType } from "../app/_components/sql/utils/cellUtils";

describe("sqliteAffinityFor (SQ-02)", () => {
  it("gives numeric columns a numeric affinity", () => {
    // The bug this fixes: an all-TEXT table compares '10' > '5' as strings,
    // so `WHERE qty > 5` returns no rows and reports no error.
    expect(sqliteAffinityFor("bigint")).toBe("INTEGER");
    expect(sqliteAffinityFor("double precision")).toBe("REAL");
  });

  it("leaves booleans and dates as TEXT", () => {
    // SQLite has neither type; INTEGER affinity would store 'true' as text
    // beside real integers, leaving the column half-converted.
    expect(sqliteAffinityFor("boolean")).toBe("TEXT");
    expect(sqliteAffinityFor("date")).toBe("TEXT");
    expect(sqliteAffinityFor("timestamptz")).toBe("TEXT");
    expect(sqliteAffinityFor("text")).toBe("TEXT");
  });

  it("routes the audit's probe CSV to INTEGER/REAL", () => {
    expect(sqliteAffinityFor(inferColumnTypeFromValues(["10", "20"]))).toBe(
      "INTEGER",
    );
    expect(sqliteAffinityFor(inferColumnTypeFromValues(["2.50", "3.75"]))).toBe(
      "REAL",
    );
  });
});

describe("sqliteColumnType", () => {
  it("accepts the allowlisted affinities, case-insensitively", () => {
    expect(sqliteColumnType("integer")).toBe("INTEGER");
    expect(sqliteColumnType("REAL")).toBe("REAL");
    expect(sqliteColumnType("BLOB")).toBe("BLOB");
  });

  it("falls back to TEXT for anything else", () => {
    // The value is interpolated into CREATE TABLE unquoted.
    expect(sqliteColumnType("INTEGER); DROP TABLE t; --")).toBe("TEXT");
    expect(sqliteColumnType(undefined)).toBe("TEXT");
    expect(sqliteColumnType("")).toBe("TEXT");
  });
});

describe("referencesIdentifier (SQ-04)", () => {
  const triggerSql =
    "CREATE TRIGGER trg_audit_t AFTER INSERT ON audit_t " +
    "BEGIN UPDATE audit_t SET num = 1 WHERE id = NEW.id; END";

  it("finds a column a trigger depends on", () => {
    expect(referencesIdentifier(triggerSql, "num")).toBe(true);
    expect(referencesIdentifier(triggerSql, "audit_t")).toBe(true);
  });

  it("does not match a column that only appears as a substring", () => {
    expect(referencesIdentifier(triggerSql, "nu")).toBe(false);
    expect(referencesIdentifier(triggerSql, "number")).toBe(false);
    expect(referencesIdentifier(triggerSql, "id2")).toBe(false);
  });

  it("sees through quoted identifiers", () => {
    expect(referencesIdentifier('SELECT "num" FROM t', "num")).toBe(true);
    expect(referencesIdentifier("SELECT [num] FROM t", "num")).toBe(true);
    expect(referencesIdentifier("SELECT `num` FROM t", "num")).toBe(true);
  });

  it("escapes regex metacharacters in the identifier", () => {
    expect(referencesIdentifier("SELECT a.b FROM t", "a.b")).toBe(true);
    expect(referencesIdentifier("SELECT axb FROM t", "a.b")).toBe(false);
  });
});

describe("inferColumnType (SQ-12)", () => {
  it("badges a 64-bit integer as INTEGER, not text", () => {
    // Beyond 2^53 the value reaches the UI as an exact decimal string.
    expect(inferColumnType([["9223372036854775807"]], 0)).toBe("INTEGER");
    expect(inferColumnType([["-9223372036854775808"]], 0)).toBe("INTEGER");
    expect(inferColumnType([["9007199254740993"]], 0)).toBe("INTEGER");
  });

  it("still badges an ordinary digit string as text", () => {
    // Inside the safe range a number is already a JS number, so a digit
    // string there really is text.
    expect(inferColumnType([["42"]], 0)).toBe("TEXT");
    expect(inferColumnType([["007"]], 0)).toBe("TEXT");
    expect(inferColumnType([["hello"]], 0)).toBe("TEXT");
  });

  it("keeps the existing value-based inference", () => {
    expect(inferColumnType([[1]], 0)).toBe("INTEGER");
    expect(inferColumnType([[1.5]], 0)).toBe("REAL");
    expect(inferColumnType([[new Uint8Array([1])]], 0)).toBe("BLOB");
    expect(inferColumnType([[null]], 0)).toBe("NULL");
  });
});
