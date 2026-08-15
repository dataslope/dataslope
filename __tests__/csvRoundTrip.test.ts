import { describe, expect, it } from "vitest";
import {
  parseCsv,
  inferColumnTypeFromValues,
  inferCsvColumnTypes,
} from "../app/_components/sql/utils/importUtils";

/** Mirrors the CSV writer in utils/exportUtils (which needs a DOM to
 *  download). Round-trip assertions below use it as the export side, so a
 *  change to either quoting rule breaks a test rather than a user's import. */
function writeCsv(columns: string[], rows: string[][]): string {
  // An empty string is force-quoted (`""`), the only way CSV distinguishes it
  // from NULL — see csvNeedsExplicitEmpty.
  const field = (s: string, forceQuote = false) =>
    forceQuote || /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [
    columns.map((c) => field(c)).join(","),
    ...rows.map((r) => r.map((v) => field(v, v === "")).join(",")),
  ].join("\r\n");
}

describe("parseCsv", () => {
  it("keeps a quoted newline inside one field (DS-03)", () => {
    const { headers, rows } = parseCsv(
      'a,b\r\n1,"has\nnewline"\r\n2,plain\r\n',
    );
    expect(headers).toEqual(["a", "b"]);
    expect(rows).toEqual([
      ["1", "has\nnewline"],
      ["2", "plain"],
    ]);
  });

  it("handles \\r\\n, bare \\n and bare \\r inside quotes", () => {
    for (const eol of ["\r\n", "\n", "\r"]) {
      const { rows } = parseCsv(`a,b${eol}1,"x${eol}y"${eol}`);
      expect(rows).toEqual([["1", `x${eol}y`]]);
    }
  });

  it("handles escaped double-quotes and quoted commas", () => {
    const { rows } = parseCsv('a,b\n1,"O\'Brien ""Bob"", esq"\n');
    expect(rows).toEqual([["1", `O'Brien "Bob", esq`]]);
  });

  it("pads short rows and truncates long ones to the header width", () => {
    const { rows } = parseCsv("a,b,c\n1\n1,2,3,4\n");
    expect(rows).toEqual([
      ["1", "", ""],
      ["1", "2", "3"],
    ]);
  });

  it("skips blank lines without emitting empty rows", () => {
    const { rows } = parseCsv("a,b\n\n1,2\n\n\n3,4\n\n");
    expect(rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("keeps a quoted empty field distinct from a missing one", () => {
    const { rows } = parseCsv('a,b,c\n"",x,\n');
    expect(rows).toEqual([["", "x", ""]]);
  });

  it("strips a UTF-8 BOM from the first header", () => {
    const { headers } = parseCsv("﻿id,name\n1,a\n");
    expect(headers).toEqual(["id", "name"]);
  });

  it("round-trips the audit's own export fixture (DS-03)", () => {
    // The exact row the report exported and could not re-import.
    const columns = ["b_true", "b_false", "old_date", "medieval", "bin", "multi"];
    const rows = [
      ["true", "false", "0001-01-01", "0500-06-07", "\\xcafe", "has\nnewline"],
    ];
    const { headers, rows: parsed } = parseCsv(writeCsv(columns, rows));
    expect(headers).toEqual(columns);
    expect(parsed).toEqual(rows);
    expect(parsed).toHaveLength(1);
  });

  it("round-trips the appendix fixture as 5 rows, not 6 (DS-03)", () => {
    const fixture = [
      "id,name,amount,when,flag,note",
      '1,Alice,10.50,2024-01-31,true,"hello, world"',
      '2,"O\'Brien ""Bob""",-3,2024-02-29,false,"line1',
      'line2"',
      "3,,0,,,",
      '4,Ünïcødé,1e3,2024-13-45,TRUE,"tab\there"',
      '5,Zoe,00012,2024-06-01,yes,"trailing space   "',
    ].join("\n");
    const { headers, rows } = parseCsv(fixture);
    expect(headers).toHaveLength(6);
    expect(rows).toHaveLength(5);
    expect(rows[1][1]).toBe('O\'Brien "Bob"');
    expect(rows[1][5]).toBe("line1\nline2");
    expect(rows[4][5]).toBe("trailing space   ");
  });
});

describe("inferColumnTypeFromValues (DS-13)", () => {
  it("infers the narrow types", () => {
    expect(inferColumnTypeFromValues(["1", "2", "-3"])).toBe("bigint");
    expect(inferColumnTypeFromValues(["1.5", "-0.0001", "1e3"])).toBe(
      "double precision",
    );
    expect(inferColumnTypeFromValues(["true", "false", "YES"])).toBe("boolean");
    expect(inferColumnTypeFromValues(["2024-01-31", "2024-02-29"])).toBe("date");
    expect(
      inferColumnTypeFromValues(["2024-01-31T12:34:56Z", "2024-02-01 00:00:00"]),
    ).toBe("timestamptz");
  });

  it("falls back to text on a conflict", () => {
    expect(inferColumnTypeFromValues(["1", "2", "not a number"])).toBe("text");
    expect(inferColumnTypeFromValues([])).toBe("text");
    expect(inferColumnTypeFromValues(["", "NULL"])).toBe("text");
  });

  it("rejects a date that only looks like one", () => {
    // `2024-13-45` matches the ISO shape but is not a calendar date; inferring
    // `date` would fail the whole import at the first INSERT.
    expect(inferColumnTypeFromValues(["2024-01-31", "2024-13-45"])).toBe("text");
    expect(inferColumnTypeFromValues(["2023-02-29"])).toBe("text");
    expect(inferColumnTypeFromValues(["2024-02-29"])).toBe("date");
  });

  it("keeps zero-padded digits as text", () => {
    // `00012` is a product code far more often than the number 12.
    expect(inferColumnTypeFromValues(["00012", "00013"])).toBe("text");
  });

  it("ignores blanks and NULL tokens when deciding", () => {
    expect(inferColumnTypeFromValues(["1", "", "NULL", "2"])).toBe("bigint");
  });

  it("reads a 0/1 column as numeric, not boolean", () => {
    expect(inferColumnTypeFromValues(["0", "1", "1"])).toBe("bigint");
  });

  it("infers per column across the parsed rows", () => {
    const { headers, rows } = parseCsv(
      "id,amount,flag,label\n1,1.5,true,a\n2,2.5,false,b\n",
    );
    expect(inferCsvColumnTypes(headers, rows)).toEqual([
      "bigint",
      "double precision",
      "boolean",
      "text",
    ]);
  });
});
