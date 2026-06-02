import { describe, expect, it } from "vitest";
import {
  splitSqlStatements,
  statementAtCursor,
} from "../app/_components/sql/utils/sqlAnalysis";

describe("splitSqlStatements", () => {
  it("splits top-level statements and trims them", () => {
    const sql = "SELECT 1;\n  SELECT 2 ;\nSELECT 3";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT 1",
      "SELECT 2",
      "SELECT 3",
    ]);
  });

  it("reports accurate offsets into the source", () => {
    const sql = "  SELECT 1; SELECT 22";
    const ranges = splitSqlStatements(sql);
    expect(ranges).toHaveLength(2);
    expect(sql.slice(ranges[0].from, ranges[0].to)).toBe("SELECT 1");
    expect(sql.slice(ranges[1].from, ranges[1].to)).toBe("SELECT 22");
  });

  it("ignores semicolons inside strings and identifiers", () => {
    const sql = `SELECT ';'; SELECT "a;b" FROM t`;
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT ';'",
      `SELECT "a;b" FROM t`,
    ]);
  });

  it("ignores semicolons inside line and block comments", () => {
    const sql = "SELECT 1 -- a; b\n; /* c; d */ SELECT 2";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT 1 -- a; b",
      "/* c; d */ SELECT 2",
    ]);
  });

  it("ignores semicolons inside dollar-quoted bodies but not $1 params", () => {
    const sql = "SELECT $tag$ a; b $tag$; SELECT $1";
    expect(splitSqlStatements(sql).map((s) => s.text)).toEqual([
      "SELECT $tag$ a; b $tag$",
      "SELECT $1",
    ]);
  });

  it("skips empty segments and a trailing semicolon", () => {
    expect(splitSqlStatements(";;SELECT 1;;").map((s) => s.text)).toEqual([
      "SELECT 1",
    ]);
    expect(splitSqlStatements("   ")).toEqual([]);
  });
});

describe("statementAtCursor", () => {
  const sql = "SELECT 1;\nSELECT 2;\nSELECT 3;";
  // offsets: "SELECT 1" 0-8, ";" 8, "\n" 9, "SELECT 2" 10-18, ";" 18 ...

  it("returns the statement the cursor sits inside", () => {
    expect(statementAtCursor(sql, 0)?.text).toBe("SELECT 1");
    expect(statementAtCursor(sql, 13)?.text).toBe("SELECT 2"); // inside "SELECT 2"
    expect(statementAtCursor(sql, sql.indexOf("3"))?.text).toBe("SELECT 3");
  });

  it("picks the preceding statement when the cursor is in a gap", () => {
    // Cursor right after the first ";" (position 9, the newline).
    expect(statementAtCursor(sql, 9)?.text).toBe("SELECT 1");
  });

  it("returns null for whitespace-only or empty SQL", () => {
    expect(statementAtCursor("   \n  ", 2)).toBeNull();
    expect(statementAtCursor("", 0)).toBeNull();
  });
});
