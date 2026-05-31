import { describe, expect, it } from "vitest";
import {
  classifyCellEditor,
  toDateEditorValue,
  fromDateEditorValue,
  bytesToHex,
  formatBytesHex,
  bytesToBase64,
} from "../app/_components/sql/utils/cellEditing";
import {
  formatCellValue,
  parseCellEditValue,
} from "../app/_components/sql/utils/cellUtils";

describe("classifyCellEditor", () => {
  it("detects booleans across engines", () => {
    expect(classifyCellEditor("boolean")).toBe("boolean");
    expect(classifyCellEditor("BOOL")).toBe("boolean");
    expect(classifyCellEditor("Boolean")).toBe("boolean");
  });

  it("detects JSON columns", () => {
    expect(classifyCellEditor("json")).toBe("json");
    expect(classifyCellEditor("jsonb")).toBe("json");
  });

  it("detects binary columns", () => {
    expect(classifyCellEditor("bytea")).toBe("blob");
    expect(classifyCellEditor("BLOB")).toBe("blob");
    expect(classifyCellEditor("VARBINARY")).toBe("blob");
  });

  it("distinguishes date / time / datetime", () => {
    expect(classifyCellEditor("date")).toBe("date");
    expect(classifyCellEditor("DATE")).toBe("date");
    expect(classifyCellEditor("time")).toBe("time");
    expect(classifyCellEditor("timetz")).toBe("time");
    expect(classifyCellEditor("time without time zone")).toBe("time");
    expect(classifyCellEditor("timestamp")).toBe("datetime");
    expect(classifyCellEditor("timestamptz")).toBe("datetime");
    expect(classifyCellEditor("timestamp with time zone")).toBe("datetime");
    expect(classifyCellEditor("TIMESTAMP")).toBe("datetime");
    expect(classifyCellEditor("datetime")).toBe("datetime");
  });

  it("does not treat array types as scalar temporal/json types", () => {
    expect(classifyCellEditor("timestamptz[]")).toBe("text");
    expect(classifyCellEditor("integer[]")).toBe("text");
    expect(classifyCellEditor("text[]")).toBe("text");
    expect(classifyCellEditor("jsonb[]")).toBe("text");
  });

  it("falls back to text for unknown / empty types", () => {
    expect(classifyCellEditor(undefined)).toBe("text");
    expect(classifyCellEditor("")).toBe("text");
    expect(classifyCellEditor("integer")).toBe("text");
    expect(classifyCellEditor("uuid")).toBe("text");
    expect(classifyCellEditor("interval")).toBe("text");
  });
});

describe("toDateEditorValue", () => {
  it("extracts the date part for date columns", () => {
    expect(toDateEditorValue("2026-05-31", "date")).toBe("2026-05-31");
    expect(toDateEditorValue("2026-05-31T03:35:51.558Z", "date")).toBe(
      "2026-05-31",
    );
    expect(toDateEditorValue("2026-05-31 03:35:51", "date")).toBe("2026-05-31");
  });

  it("extracts the time part for time columns", () => {
    expect(toDateEditorValue("03:35:51", "time")).toBe("03:35:51");
    expect(toDateEditorValue("03:35", "time")).toBe("03:35:00");
    expect(toDateEditorValue("2026-05-31T03:35:51Z", "time")).toBe("03:35:51");
  });

  it("builds a datetime-local value for timestamp columns", () => {
    expect(toDateEditorValue("2026-05-31T03:35:51.558Z", "datetime")).toBe(
      "2026-05-31T03:35:51",
    );
    expect(toDateEditorValue("2026-05-31 03:35:51", "datetime")).toBe(
      "2026-05-31T03:35:51",
    );
  });

  it("accepts Date objects defensively", () => {
    expect(toDateEditorValue(new Date("2026-05-31T03:35:51.000Z"), "date")).toBe(
      "2026-05-31",
    );
  });

  it("returns null for non-temporal values so callers fall back to text", () => {
    expect(toDateEditorValue(1717000000, "datetime")).toBeNull();
    expect(toDateEditorValue(null, "date")).toBeNull();
    expect(toDateEditorValue("not a date", "date")).toBeNull();
    expect(toDateEditorValue("2026-05-31", "datetime")).toBeNull(); // no time
  });
});

describe("fromDateEditorValue", () => {
  it("preserves the original Z (UTC) suffix and fractional seconds", () => {
    const original = "2026-05-31T03:35:51.558Z";
    expect(fromDateEditorValue("2026-06-01T04:00", "datetime", original)).toBe(
      "2026-06-01T04:00:00.558Z",
    );
  });

  it("preserves a space separator (DuckDB-style timestamps)", () => {
    const original = "2026-05-31 03:35:51";
    expect(fromDateEditorValue("2026-06-01T04:00:30", "datetime", original)).toBe(
      "2026-06-01 04:00:30",
    );
  });

  it("preserves a numeric timezone offset", () => {
    const original = "2026-05-31T03:35:51+05:30";
    expect(fromDateEditorValue("2026-05-31T09:05", "datetime", original)).toBe(
      "2026-05-31T09:05:00+05:30",
    );
  });

  it("replaces only the date for date columns", () => {
    expect(
      fromDateEditorValue("2026-06-01", "date", "2026-05-31T00:00:00.000Z"),
    ).toBe("2026-06-01T00:00:00.000Z");
    expect(fromDateEditorValue("2026-06-01", "date", "2026-05-31")).toBe(
      "2026-06-01",
    );
  });

  it("replaces only the time for time columns", () => {
    expect(fromDateEditorValue("09:05", "time", "03:35:51")).toBe("09:05:00");
    expect(fromDateEditorValue("09:05:30", "time", "03:35:51+00")).toBe(
      "09:05:30+00",
    );
  });

  it("emits a plain ISO-ish string when the original format is unknown", () => {
    expect(fromDateEditorValue("2026-06-01T04:00", "datetime", null)).toBe(
      "2026-06-01T04:00:00",
    );
    expect(fromDateEditorValue("2026-06-01", "date", 123)).toBe("2026-06-01");
  });

  it("round-trips an unedited timestamp value unchanged", () => {
    const original = "2026-05-31T03:35:51Z";
    const input = toDateEditorValue(original, "datetime")!;
    expect(fromDateEditorValue(input, "datetime", original)).toBe(original);
  });
});

describe("byte encoders", () => {
  const bytes = new Uint8Array([0, 1, 15, 16, 255, 222, 173]);

  it("hex-encodes", () => {
    expect(bytesToHex(bytes)).toBe("00010f10ffdead");
    expect(bytesToHex(new Uint8Array([]))).toBe("");
  });

  it("formats a wrapped hex dump 16 bytes per line", () => {
    const long = new Uint8Array(20).map((_, i) => i);
    const dump = formatBytesHex(long);
    const lines = dump.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0].split(" ")).toHaveLength(16);
    expect(lines[1].split(" ")).toHaveLength(4);
    expect(lines[0].startsWith("00 01 02")).toBe(true);
  });

  it("base64-encodes (matches btoa / known vectors)", () => {
    const enc = (s: string) =>
      bytesToBase64(new Uint8Array([...s].map((c) => c.charCodeAt(0))));
    expect(enc("")).toBe("");
    expect(enc("f")).toBe("Zg==");
    expect(enc("fo")).toBe("Zm8=");
    expect(enc("foo")).toBe("Zm9v");
    expect(enc("foobar")).toBe("Zm9vYmFy");
  });
});

describe("parseCellEditValue (literal-NULL escape hatch, UX-20)", () => {
  it("maps an empty field to SQL NULL", () => {
    expect(parseCellEditValue("", false)).toBeNull();
    expect(parseCellEditValue("", true)).toBeNull();
  });

  it("stores the literal string 'NULL' rather than coercing to NULL", () => {
    expect(parseCellEditValue("NULL", false)).toBe("NULL");
  });

  it("parses numeric fields when the column is numeric", () => {
    expect(parseCellEditValue("42", true)).toBe(42);
    expect(parseCellEditValue("3.14", true)).toBeCloseTo(3.14);
    expect(parseCellEditValue("not-a-number", true)).toBe("not-a-number");
  });

  it("keeps text verbatim for non-numeric columns", () => {
    expect(parseCellEditValue("hello", false)).toBe("hello");
    expect(parseCellEditValue("42", false)).toBe("42");
  });
});

describe("formatCellValue array & date display", () => {
  it("brackets arrays (UX-07)", () => {
    expect(formatCellValue([10, 20, 30])).toBe("[10, 20, 30]");
    expect(formatCellValue(["a", "b"])).toBe("[a, b]");
    expect(formatCellValue([])).toBe("[]");
    expect(formatCellValue([1, [2, 3]])).toBe("[1, [2, 3]]");
  });

  it("renders Date as ISO", () => {
    expect(formatCellValue(new Date("2026-05-31T03:35:51.000Z"))).toBe(
      "2026-05-31T03:35:51.000Z",
    );
  });

  it("still reports BLOB size and NULL", () => {
    expect(formatCellValue(new Uint8Array([1, 2, 3]))).toBe("BLOB (3 bytes)");
    expect(formatCellValue(null)).toBe("NULL");
  });
});
