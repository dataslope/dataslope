import { describe, expect, it } from "vitest";
import {
  formatYear,
  toDateOnlyString,
  toTimestampString,
  toPgArrayLiteral,
  parsePgArrayLiteral,
} from "../app/_components/runtime/valueFormat";
import {
  classifyExportType,
  bytesToHexLiteral,
  bytesToBase64,
  numericToJson,
  toCsvValue,
  toJsonValue,
  toSqlLiteral,
  toExcelCell,
} from "../app/_components/sql/utils/valueSerialize";
import {
  formatCellValue,
  formatCellDisplay,
  formatByteCount,
} from "../app/_components/sql/utils/cellUtils";
import { stripTransactionControl } from "../app/_components/runtime/postgres";

describe("date formatting (DS-07)", () => {
  it("keeps years below 1000 zero-padded", () => {
    expect(formatYear(1)).toBe("0001");
    expect(formatYear(500)).toBe("0500");
    expect(formatYear(2024)).toBe("2024");
    expect(formatYear(12345)).toBe("12345");
  });

  it("renders BC years the way Postgres does", () => {
    // Year 0 in the proleptic calendar is 1 BC.
    expect(formatYear(0)).toBe("0001 BC");
    expect(formatYear(-1)).toBe("0002 BC");
  });

  it("does not truncate an early date to a 2000s one", () => {
    // `1-01-01` would be read back by Postgres as 2001-01-01.
    // (`Date.UTC` maps years 0-99 onto 1900+n, so the year is set explicitly.)
    const utcDate = (y: number, m: number, d: number) => {
      const date = new Date(Date.UTC(2000, m, d));
      date.setUTCFullYear(y);
      return date;
    };
    expect(toDateOnlyString(utcDate(1, 0, 1))).toBe("0001-01-01");
    expect(toDateOnlyString(utcDate(500, 5, 7))).toBe("0500-06-07");
  });

  it("passes an already-formatted date string through", () => {
    expect(toDateOnlyString("2024-01-31")).toBe("2024-01-31");
    expect(toDateOnlyString(null)).toBeNull();
  });
});

describe("timestamp formatting (DS-29)", () => {
  it("uses the psql shape rather than a raw toISOString", () => {
    const d = new Date(Date.UTC(2024, 0, 31, 12, 34, 56));
    expect(toTimestampString(d, true)).toBe("2024-01-31 12:34:56+00");
    expect(toTimestampString(d, false)).toBe("2024-01-31 12:34:56");
  });

  it("keeps sub-second precision only when it is there", () => {
    const withMs = new Date(Date.UTC(2024, 0, 31, 12, 0, 0, 250));
    expect(toTimestampString(withMs, true)).toBe("2024-01-31 12:00:00.250+00");
  });
});

describe("Postgres array literals (DS-30)", () => {
  it("renders {1,2,3}, not [1,2,3]", () => {
    expect(toPgArrayLiteral([1, 2, 3])).toBe("{1,2,3}");
    expect(toPgArrayLiteral([])).toBe("{}");
    expect(toPgArrayLiteral([-1])).toBe("{-1}");
  });

  it("quotes elements that need it and renders NULL unquoted", () => {
    expect(toPgArrayLiteral(["a,b", null, "plain"])).toBe('{"a,b",NULL,plain}');
    expect(toPgArrayLiteral(['say "hi"'])).toBe('{"say \\"hi\\""}');
    // The literal string "null" must not be mistaken for a NULL element.
    expect(toPgArrayLiteral(["null"])).toBe('{"null"}');
    expect(toPgArrayLiteral([""])).toBe('{""}');
  });

  it("round-trips through the parser", () => {
    const cases: unknown[][] = [
      ["1", "2", "3"],
      ["a,b", null, "plain"],
      [],
    ];
    for (const value of cases) {
      expect(parsePgArrayLiteral(toPgArrayLiteral(value))).toEqual(value);
    }
    expect(parsePgArrayLiteral("{{1,2},{3,4}}")).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(parsePgArrayLiteral("not an array")).toBeNull();
  });
});

describe("grid rendering (DS-05, DS-15, DS-21)", () => {
  it("renders real booleans as true/false, not 1/0", () => {
    expect(formatCellValue(true)).toBe("true");
    expect(formatCellValue(false)).toBe("false");
  });

  it("pluralises the binary size badge", () => {
    expect(formatByteCount(1)).toBe("1 byte");
    expect(formatByteCount(2)).toBe("2 bytes");
    expect(formatCellValue(new Uint8Array([0]))).toBe("BLOB (1 byte)");
  });

  it("makes newlines and tabs visible without collapsing whitespace", () => {
    expect(formatCellDisplay("has\nnewline")).toBe("has↵newline");
    expect(formatCellDisplay("a\tb")).toBe("a→b");
    // Leading/trailing spaces survive; the cell CSS is `white-space: pre`.
    expect(formatCellDisplay("  spaced  ")).toBe("  spaced  ");
  });

  it("leaves a value with no control characters untouched", () => {
    expect(formatCellDisplay("plain")).toBe("plain");
  });
});

describe("classifyExportType", () => {
  it("classifies each engine's spelling", () => {
    expect(classifyExportType("boolean")).toBe("boolean");
    expect(classifyExportType("bytea")).toBe("binary");
    expect(classifyExportType("BLOB")).toBe("binary");
    expect(classifyExportType("jsonb")).toBe("json");
    expect(classifyExportType("integer[]")).toBe("array");
    expect(classifyExportType("LIST<INTEGER>")).toBe("array");
    expect(classifyExportType("numeric(12,4)")).toBe("numeric");
    expect(classifyExportType("timestamptz")).toBe("timestamp");
    expect(classifyExportType("date")).toBe("date");
    expect(classifyExportType(undefined)).toBe("text");
  });

  it("reads an array of timestamps as an array", () => {
    expect(classifyExportType("timestamp[]")).toBe("array");
  });
});

describe("bytea serialization (DS-06)", () => {
  const cafe = new Uint8Array([0xca, 0xfe]);

  it("uses Postgres hex input format for CSV and SQL", () => {
    expect(bytesToHexLiteral(cafe)).toBe("\\xcafe");
    expect(toCsvValue(cafe, "binary")).toBe("\\xcafe");
    expect(toSqlLiteral(cafe, "binary")).toBe("'\\xcafe'");
  });

  it("uses base64 for JSON and Excel", () => {
    expect(bytesToBase64(cafe)).toBe("yv4=");
    expect(toJsonValue(cafe, "binary")).toBe("yv4=");
    expect(toExcelCell(cafe, "binary")).toEqual({ t: "string", v: "yv4=" });
  });

  it("keeps a zero-length bytea distinct from NULL", () => {
    expect(toCsvValue(new Uint8Array([]), "binary")).toBe("\\x");
    expect(toCsvValue(null, "binary")).toBe("");
    expect(toSqlLiteral(null, "binary")).toBe("NULL");
  });

  it("does not lose a zero byte", () => {
    expect(toCsvValue(new Uint8Array([0]), "binary")).toBe("\\x00");
  });
});

describe("boolean serialization (DS-05)", () => {
  it("emits the right literal per format", () => {
    expect(toCsvValue(true, "boolean")).toBe("true");
    expect(toJsonValue(false, "boolean")).toBe(false);
    expect(toSqlLiteral(true, "boolean")).toBe("TRUE");
    expect(toSqlLiteral(false, "boolean")).toBe("FALSE");
    expect(toExcelCell(true, "boolean")).toEqual({ t: "boolean", v: true });
  });

  it("still reads an engine that hands back 1/0 or t/f", () => {
    expect(toSqlLiteral(1, "boolean")).toBe("TRUE");
    expect(toSqlLiteral(0, "boolean")).toBe("FALSE");
    expect(toSqlLiteral("t", "boolean")).toBe("TRUE");
    expect(toJsonValue("false", "boolean")).toBe(false);
  });
});

describe("json and array serialization (DS-10, DS-11, DS-16)", () => {
  it("does not double-encode jsonb into a JSON string", () => {
    expect(toJsonValue('{"a":1}', "json")).toEqual({ a: 1 });
    expect(toJsonValue("[1,2,3]", "json")).toEqual([1, 2, 3]);
  });

  it("keeps a stored JSON null distinct from SQL NULL", () => {
    // The worker's type parser hands jsonb back as raw text, so a stored
    // `null` arrives as the string "null" and SQL NULL as JS null.
    expect(toJsonValue("null", "json")).toBeNull();
    expect(toCsvValue("null", "json")).toBe("null");
    expect(toCsvValue(null, "json")).toBe("");
    expect(formatCellValue("null")).toBe("null");
    expect(formatCellValue(null)).toBe("NULL");
  });

  it("emits a valid Postgres array literal in SQL, a real array in JSON", () => {
    expect(toSqlLiteral("{1,2,3}", "array")).toBe("'{1,2,3}'");
    expect(toJsonValue("{1,2,3}", "array")).toEqual(["1", "2", "3"]);
  });

  it("leaves malformed json as its raw text rather than throwing", () => {
    expect(toJsonValue("{not json", "json")).toBe("{not json");
  });
});

describe("numeric serialization (DS-12)", () => {
  it("emits a JSON number when it round-trips exactly", () => {
    expect(numericToJson("1.5000")).toBe(1.5);
    expect(numericToJson("-0.0001")).toBe(-0.0001);
    expect(numericToJson("0")).toBe(0);
  });

  it("keeps the string when a double would lose digits", () => {
    expect(numericToJson("123456789012345678901234567890.12345")).toBe(
      "123456789012345678901234567890.12345",
    );
  });

  it("writes a real number cell to Excel, not text", () => {
    expect(toExcelCell("1.5000", "numeric")).toEqual({ t: "number", v: 1.5 });
  });

  it("does not quote a numeric in SQL output", () => {
    expect(toSqlLiteral("1.5000", "numeric")).toBe("1.5000");
  });
});

describe("temporal Excel cells (DS-12)", () => {
  it("writes dates and timestamps as date cells with a format", () => {
    const date = toExcelCell("2024-01-31", "date");
    expect(date.t).toBe("date");
    if (date.t === "date") expect(date.numFmt).toBe("yyyy-mm-dd");

    const ts = toExcelCell("2024-01-31 12:34:56+00", "timestamp");
    expect(ts.t).toBe("date");
    if (ts.t === "date") expect(ts.numFmt).toBe("yyyy-mm-dd hh:mm:ss");
  });

  it("keeps a pre-1900 date as text, since Excel cannot represent it", () => {
    expect(toExcelCell("0001-01-01", "date")).toEqual({
      t: "string",
      v: "0001-01-01",
    });
  });

  it("keeps a NULL blank rather than writing an empty string", () => {
    expect(toExcelCell(null, "text")).toEqual({ t: "blank" });
  });
});

describe("stripTransactionControl (DS-04)", () => {
  it("removes a dump's own BEGIN/COMMIT", () => {
    const out = stripTransactionControl("BEGIN;\nCREATE TABLE t (id int);\nCOMMIT;\n");
    expect(out).not.toMatch(/^BEGIN;$/m);
    expect(out).not.toMatch(/^COMMIT;$/m);
    expect(out).toMatch(/CREATE TABLE t \(id int\);/);
  });

  it("leaves BEGIN/END inside a dollar-quoted plpgsql body alone", () => {
    const sql = [
      "BEGIN;",
      "CREATE FUNCTION f() RETURNS trigger AS $$",
      "BEGIN",
      "  RETURN NEW;",
      "END;",
      "$$ LANGUAGE plpgsql;",
      "COMMIT;",
    ].join("\n");
    const out = stripTransactionControl(sql);
    expect(out).toContain("  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;");
    expect(out.split("\n")[0]).toBe("CREATE FUNCTION f() RETURNS trigger AS $$");
  });

  it("handles named dollar-quote tags", () => {
    const sql = [
      "CREATE FUNCTION g() RETURNS void AS $body$",
      "BEGIN",
      "END;",
      "$body$ LANGUAGE plpgsql;",
    ].join("\n");
    expect(stripTransactionControl(sql)).toBe(sql);
  });
});
