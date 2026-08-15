/** Per-format serialization of a result cell, driven by the column's declared
 *  SQL type.
 *
 *  Every exporter used to call `String(value)`, which silently destroyed the
 *  types that don't survive it: a `bytea` leaked its `Uint8Array` as the
 *  decimal byte list `202,254`, a boolean printed as `1`, and a `numeric`
 *  landed in Excel as text. The rules live here once so the CSV, JSON, SQL and
 *  Excel writers agree, and so they can be unit-tested without a browser. */

import { parsePgArrayLiteral } from "../../runtime/valueFormat";

/** The serialization rule a column follows, derived from its SQL type name. */
export type ExportCellKind =
  | "boolean"
  | "binary"
  | "json"
  | "array"
  | "numeric"
  | "date"
  | "timestamp"
  | "text";

/** Classify a column's SQL type. Covers the type names of all three engines
 *  (Postgres `bytea`/`jsonb`/`int4[]`, SQLite `BLOB`, DuckDB `LIST<…>`);
 *  unknown or absent types fall back to `"text"`, which is `String(value)`
 *  with the value's own runtime type still respected. */
export function classifyExportType(sqlType: string | undefined): ExportCellKind {
  const t = (sqlType ?? "").trim().toLowerCase();
  if (!t) return "text";
  if (/^bool(ean)?$/.test(t)) return "boolean";
  // Arrays first: `timestamp[]` is an array, not a timestamp.
  if (t.endsWith("[]") || t.startsWith("list<") || t.startsWith("list(")) {
    return "array";
  }
  if (t === "json" || t === "jsonb") return "json";
  if (
    t.includes("blob") ||
    t.includes("bytea") ||
    t.includes("binary") ||
    t === "bytes"
  ) {
    return "binary";
  }
  if (t.includes("timestamp") || t.includes("datetime")) return "timestamp";
  if (t.includes("date")) return "date";
  if (/^(numeric|decimal)\b/.test(t) || t.startsWith("numeric(")) return "numeric";
  return "text";
}

/** `\xdeadbeef` — Postgres's own hex input format for `bytea`, so a CSV or
 *  SQL export of a binary column reads straight back in. */
export function bytesToHexLiteral(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `\\x${hex}`;
}

/** Base64, for the formats with no hex convention (JSON, Excel). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
}

/** Strip a decimal string to its canonical JS-number form so an exact
 *  round-trip can be detected (`1.5000` → `1.5`, `-0.0` → `0`). */
function canonicalDecimal(s: string): string {
  const trimmed = s.trim().replace(/^\+/, "");
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  let out = trimmed;
  if (out.includes(".")) out = out.replace(/0+$/, "").replace(/\.$/, "");
  out = out.replace(/^(-?)0+(\d)/, "$1$2");
  return out === "-0" ? "0" : out;
}

/** JSON rule for `numeric`/`decimal`, which PGlite hands back as a string to
 *  keep full precision: emit a JSON number when the value survives a JS double
 *  exactly, otherwise keep the string so no digits are lost. */
export function numericToJson(value: string): number | string {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return canonicalDecimal(String(n)) === canonicalDecimal(value) ? n : value;
}

/** The text a cell contributes to a CSV field (quoting is the writer's job).
 *  NULL is the empty field. */
export function toCsvValue(value: unknown, kind: ExportCellKind): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Uint8Array) return bytesToHexLiteral(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (kind === "boolean") return coerceBoolean(value) ? "true" : "false";
  return String(value);
}

/** True when a cell must be written as `""` rather than bare, so an empty
 *  string stays distinguishable from NULL. RFC 4180 gives no other way to
 *  tell them apart, and it is the convention `COPY … CSV` follows. */
export function csvNeedsExplicitEmpty(value: unknown): boolean {
  return value === "";
}

/** The JS value a cell contributes to the JSON export. `json`/`array` columns
 *  are re-parsed so they nest as real JSON rather than being double-encoded
 *  into a string. */
export function toJsonValue(value: unknown, kind: ExportCellKind): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Uint8Array) return bytesToBase64(value);
  if (typeof value === "boolean") return value;
  if (kind === "boolean") return coerceBoolean(value);
  if (kind === "json" && typeof value === "string") {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  if (kind === "array" && typeof value === "string") {
    const parsed = parsePgArrayLiteral(value);
    if (parsed) return parsed;
    try {
      const asJson: unknown = JSON.parse(value);
      if (Array.isArray(asJson)) return asJson;
    } catch {
      // not JSON either; fall through to the raw string
    }
    return value;
  }
  if (kind === "numeric" && typeof value === "string") return numericToJson(value);
  return value;
}

/** A SQL literal for the cell, valid Postgres input for its column type. */
export function toSqlLiteral(value: unknown, kind: ExportCellKind): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Uint8Array) return `'${bytesToHexLiteral(value)}'`;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (kind === "boolean") return coerceBoolean(value) ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  // `numeric` arrives as a string to keep its precision, but it is a number in
  // SQL: quoting it would still cast, yet reads as a mistake in the output.
  if (kind === "numeric" && typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

/** How a cell should be written into an .xlsx sheet. Numerics, dates and
 *  booleans become native Excel cells so SUM/AVG and date filters work on the
 *  exported sheet instead of tripping "number stored as text". */
export type ExcelCell =
  | { t: "blank" }
  | { t: "number"; v: number }
  | { t: "boolean"; v: boolean }
  | { t: "string"; v: string }
  | { t: "date"; v: Date; numFmt: string };

/** Excel's serial-date epoch starts at 1900; earlier dates have no native
 *  representation, so they stay text rather than silently shifting. */
const EXCEL_MIN_YEAR = 1900;

/** Parse the `YYYY-MM-DD[ HH:MM:SS[.mmm]][+00]` text the adapters produce back
 *  into a Date, or null when it is not that shape (or predates Excel's epoch). */
function parseTemporal(text: string): { date: Date; hasTime: boolean } | null {
  const m = text
    .trim()
    .match(
      /^(\d{4,})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/,
    );
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, frac] = m;
  const year = Number(y);
  if (year < EXCEL_MIN_YEAR) return null;
  const date = new Date(
    Date.UTC(
      year,
      Number(mo) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mi ?? 0),
      Number(ss ?? 0),
      frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0,
    ),
  );
  if (Number.isNaN(date.getTime())) return null;
  return { date, hasTime: hh !== undefined };
}

export function toExcelCell(value: unknown, kind: ExportCellKind): ExcelCell {
  if (value === null || value === undefined) return { t: "blank" };
  if (value instanceof Uint8Array) return { t: "string", v: bytesToBase64(value) };
  if (typeof value === "boolean") return { t: "boolean", v: value };
  if (kind === "boolean") return { t: "boolean", v: coerceBoolean(value) };
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { t: "number", v: value }
      : { t: "string", v: String(value) };
  }
  if (kind === "numeric" && typeof value === "string") {
    const n = Number(value);
    if (value.trim() !== "" && Number.isFinite(n)) return { t: "number", v: n };
  }
  if ((kind === "date" || kind === "timestamp") && typeof value === "string") {
    const parsed = parseTemporal(value);
    if (parsed) {
      return {
        t: "date",
        v: parsed.date,
        numFmt: parsed.hasTime ? "yyyy-mm-dd hh:mm:ss" : "yyyy-mm-dd",
      };
    }
  }
  return { t: "string", v: String(value) };
}

/** Interpret a cell as a boolean when its column is boolean but the value
 *  arrived in one of the engines' textual/numeric spellings. */
function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = String(value).trim().toLowerCase();
  return s === "1" || s === "t" || s === "true" || s === "y" || s === "yes";
}
