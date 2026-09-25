import { describe, expect, it } from "vitest";
import {
  classifyCellEditor,
  toDateEditorValue,
  fromDateEditorValue,
  hasTimeOfDay,
  resolveTemporalEditorKind,
  reversibleCellValue,
  arrayEditorText,
  parseArrayEditValue,
} from "../app/_components/sql/utils/cellEditing";
import {
  formatCellValue,
  parseCellEditValue,
} from "../app/_components/sql/utils/cellUtils";

describe("classifyCellEditor", () => {
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

  it("routes array / list types to the array editor (not a scalar editor)", () => {
    // Postgres reports `<type>[]`; DuckDB result metadata uses Arrow notation.
    expect(classifyCellEditor("integer[]")).toBe("array");
    expect(classifyCellEditor("text[]")).toBe("array");
    expect(classifyCellEditor("timestamptz[]")).toBe("array");
    expect(classifyCellEditor("jsonb[]")).toBe("array");
    expect(classifyCellEditor("list<int32>")).toBe("array");
    expect(classifyCellEditor("list<utf8>")).toBe("array");
    expect(classifyCellEditor("LIST<TIMESTAMP>")).toBe("array");
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

describe("hasTimeOfDay", () => {
  it("is false for pure dates and midnight", () => {
    expect(hasTimeOfDay("2024-03-15")).toBe(false);
    expect(hasTimeOfDay("2024-03-15T00:00:00.000Z")).toBe(false);
    expect(hasTimeOfDay("2024-03-15 00:00:00")).toBe(false);
    expect(hasTimeOfDay("2024-03-15T00:00")).toBe(false);
  });

  it("is true when there is a real clock time", () => {
    expect(hasTimeOfDay("2024-03-15 14:30:00")).toBe(true);
    expect(hasTimeOfDay("2024-03-15T09:15:00.000Z")).toBe(true);
    expect(hasTimeOfDay("2024-03-15T00:00:30")).toBe(true); // seconds only
    expect(hasTimeOfDay("2024-03-15T00:00:00.500")).toBe(true); // fraction only
  });

  it("ignores a timezone offset (the clock time, not +05:30, decides)", () => {
    expect(hasTimeOfDay("2024-03-15T00:00:00+05:30")).toBe(false);
    expect(hasTimeOfDay("2024-03-15T08:00:00+05:30")).toBe(true);
  });
});

describe("resolveTemporalEditorKind (let users edit the time too)", () => {
  it("upgrades a date column to datetime when the value carries a time", () => {
    expect(resolveTemporalEditorKind("date", "2024-03-15 14:30:00")).toBe(
      "datetime",
    );
    expect(resolveTemporalEditorKind("date", "2024-03-15T09:15:00.000Z")).toBe(
      "datetime",
    );
  });

  it("keeps a date column date-only for a pure / midnight date", () => {
    expect(resolveTemporalEditorKind("date", "2024-03-15")).toBe("date");
    expect(resolveTemporalEditorKind("date", "2024-03-15T00:00:00.000Z")).toBe(
      "date",
    );
  });
});

describe("reversibleCellValue (post-commit undo, UX-10)", () => {
  it("passes scalars through verbatim", () => {
    expect(reversibleCellValue("Ada")).toEqual({ ok: true, value: "Ada" });
    expect(reversibleCellValue(42)).toEqual({ ok: true, value: 42 });
    expect(reversibleCellValue(0)).toEqual({ ok: true, value: 0 });
    expect(reversibleCellValue(false)).toEqual({ ok: true, value: false });
    expect(reversibleCellValue(10n)).toEqual({ ok: true, value: 10n });
  });

  it("treats null/undefined as a reversible NULL", () => {
    expect(reversibleCellValue(null)).toEqual({ ok: true, value: null });
    expect(reversibleCellValue(undefined)).toEqual({ ok: true, value: null });
  });

  it("normalizes Date to an ISO string (parses back on every engine)", () => {
    const d = new Date("2024-03-15T14:30:00.000Z");
    expect(reversibleCellValue(d)).toEqual({
      ok: true,
      value: "2024-03-15T14:30:00.000Z",
    });
  });

  it("refuses complex originals so undo never does a lossy reverse-write", () => {
    expect(reversibleCellValue([1, 2, 3]).ok).toBe(false);
    expect(reversibleCellValue({ a: 1 }).ok).toBe(false);
    expect(reversibleCellValue(new Uint8Array([1, 2, 3])).ok).toBe(false);
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

describe("formatCellValue array display", () => {
  it("brackets arrays (UX-07)", () => {
    expect(formatCellValue([10, 20, 30])).toBe("[10, 20, 30]");
    expect(formatCellValue(["a", "b"])).toBe("[a, b]");
    expect(formatCellValue([])).toBe("[]");
    expect(formatCellValue([1, [2, 3]])).toBe("[1, [2, 3]]");
  });
});

describe("parseArrayEditValue", () => {
  it("rejects non-array JSON and invalid JSON", () => {
    expect(parseArrayEditValue("42").ok).toBe(false);
    expect(parseArrayEditValue('{"a":1}').ok).toBe(false);
    expect(parseArrayEditValue('"just a string"').ok).toBe(false);
    expect(parseArrayEditValue("[10, 20").ok).toBe(false); // truncated
    expect(parseArrayEditValue("").ok).toBe(false);
  });

  it("round-trips through arrayEditorText", () => {
    const parsed = parseArrayEditValue(arrayEditorText([1, 2, 3]));
    expect(parsed).toEqual({ ok: true, value: [1, 2, 3] });
  });
});
