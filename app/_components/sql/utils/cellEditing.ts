/** Pure, type-aware cell-editing helpers for the result grid.
 *
 *  Temporal round-trip invariant: the picker commits by substituting only the
 *  date/time substrings of the *original* value, preserving its separator,
 *  fractional seconds, and timezone suffix — the engine produced that format,
 *  so it always parses back. No JS `Date` timezone arithmetic (the usual
 *  source of off-by-an-hour bugs). */

import type { TableColumnInfo } from "../../runtime/sqlite";

/** Enum-column → allowed-labels map for `ColumnKeyHints`; columns without
 *  enum metadata are skipped. */
export function enumHintsFromColumns(
  cols: readonly TableColumnInfo[],
): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const col of cols) {
    if (col.enumValues && col.enumValues.length > 0) {
      m.set(col.name, col.enumValues);
    }
  }
  return m;
}

/** The kind of inline editor a column should use, derived from its SQL type. */
export type CellEditorKind =
  | "boolean"
  | "date"
  | "datetime"
  | "time"
  | "json"
  | "array"
  | "blob"
  | "text";

/** Classify a column's SQL type string into an editor kind. Handles the type
 *  names of all three engines; unknown types fall back to `"text"`. */
export function classifyCellEditor(sqlType: string | undefined): CellEditorKind {
  const t = (sqlType ?? "").trim().toLowerCase();
  if (!t) return "text";
  if (/^bool(ean)?$/.test(t)) return "boolean";
  // Arrays / lists: checked before the scalar temporal/json rules so an
  // array of timestamps isn't mistaken for a single timestamp. Raw Arrow
  // notation (`list<int32>`) covers callers that bypass arrowTypeToSqlName.
  if (t.endsWith("[]") || t.startsWith("list<") || t.startsWith("list(")) {
    return "array";
  }
  if (t === "json" || t === "jsonb") return "json";
  if (
    t.includes("blob") ||
    t.includes("bytea") ||
    t.includes("binary") ||
    t === "bytes"
  )
    return "blob";
  // Order matters: "timestamp"/"datetime" carry both a date and a time, so
  // they must be matched before the bare "date"/"time" substring checks.
  if (t.includes("timestamp") || t.includes("datetime")) return "datetime";
  if (t.includes("date")) return "date";
  if (t.includes("time")) return "time";
  return "text";
}

/** Normalize an array cell's stored value (JSON string or live JS array) to
 *  JSON text for editing. */
export function arrayEditorText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Parse an edited array cell: the parsed JS array for valid JSON, otherwise
 *  `{ ok: false }` so the caller keeps the raw text. */
export function parseArrayEditValue(text: string): {
  ok: boolean;
  value: unknown[];
} {
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed)) return { ok: true, value: parsed };
  } catch {
    // not valid JSON, fall through
  }
  return { ok: false, value: [] };
}

/** Editor kinds that use a native date/time `<input>`. */
export type TemporalEditorKind = "date" | "datetime" | "time";

/** Does a stored temporal value carry a real (non-midnight) time-of-day?
 *  A `date` column can hold such a value; a date-only picker would silently
 *  drop the time, so the caller upgrades to datetime. Timezone suffixes are
 *  never mistaken for the time-of-day: the first `HH:MM` is the clock time. */
export function hasTimeOfDay(stored: unknown): boolean {
  const s =
    typeof stored === "string"
      ? stored
      : stored instanceof Date
        ? stored.toISOString()
        : "";
  // A bare date (`2024-03-15`) has no colon and never matches.
  const m = s.match(/(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/);
  if (!m) return false;
  const [, hh, mm, ss, frac] = m;
  return (
    Number(hh) > 0 ||
    Number(mm) > 0 ||
    Number(ss ?? 0) > 0 ||
    Number(frac ?? 0) > 0
  );
}

/** Effective editor kind: a `date` column whose value carries a real
 *  time-of-day is upgraded to `datetime`; everything else passes through. */
export function resolveTemporalEditorKind(
  columnKind: TemporalEditorKind,
  storedValue: unknown,
): TemporalEditorKind {
  if (columnKind === "date" && hasTimeOfDay(storedValue)) return "datetime";
  return columnKind;
}

/** Extract the `YYYY-MM-DD` date part from a stored temporal string. */
function datePart(s: string): string | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Extract the `HH:MM:SS` time part (seconds default to `00`). */
function timePart(s: string): string | null {
  const m = s.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${m[1]}:${m[2]}:${m[3] ?? "00"}`;
}

/** Convert a stored cell value into the string a native date/time input
 *  expects, or `null` when it isn't a recognizable temporal string (caller
 *  falls back to the text editor so odd representations are never mangled). */
export function toDateEditorValue(
  stored: unknown,
  kind: TemporalEditorKind,
): string | null {
  let s: string;
  if (typeof stored === "string") s = stored.trim();
  else if (stored instanceof Date) s = stored.toISOString();
  else return null;
  if (!s) return null;

  if (kind === "date") return datePart(s);
  if (kind === "time") return timePart(s);
  const d = datePart(s);
  const t = timePart(s);
  if (!d || !t) return null;
  return `${d}T${t}`;
}

/** Convert a native date/time input's value into the string to commit,
 *  substituting only the original's date/time substrings (preserving its
 *  format); otherwise a plain ISO-ish string. */
export function fromDateEditorValue(
  inputValue: string,
  kind: TemporalEditorKind,
  original: unknown,
): string {
  const orig =
    typeof original === "string"
      ? original
      : original instanceof Date
        ? original.toISOString()
        : "";

  if (kind === "date") {
    return datePart(orig)
      ? orig.replace(/(\d{4})-(\d{2})-(\d{2})/, inputValue)
      : inputValue;
  }

  if (kind === "time") {
    const newTime = inputValue.length === 5 ? `${inputValue}:00` : inputValue;
    return timePart(orig)
      ? orig.replace(/(\d{2}):(\d{2})(?::\d{2})?/, newTime)
      : newTime;
  }

  // datetime-local: "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"
  const [d, rawTime = "00:00"] = inputValue.split("T");
  const newTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
  if (datePart(orig) && timePart(orig)) {
    return orig
      .replace(/(\d{4})-(\d{2})-(\d{2})/, d)
      .replace(/(\d{2}):(\d{2})(?::\d{2})?/, newTime);
  }
  return `${d}T${newTime}`;
}

/** Hex-encode bytes as a continuous lowercase string (no separators). */
export function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Hex dump for the BLOB viewer: space-separated byte pairs, 16 per line. */
export function formatBytesHex(bytes: Uint8Array): string {
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.subarray(i, i + 16);
    rows.push(
      Array.from(slice)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    );
  }
  return rows.join("\n");
}

/** Whether a stored cell value can be written back verbatim for post-commit
 *  undo. Scalars pass through; `Date` normalizes to ISO (avoids DuckDB's
 *  `String(date)` literal, which isn't valid SQL); complex values (arrays,
 *  objects, bytes) return `{ ok: false }` so undo is suppressed rather than
 *  risking a lossy reverse-write. */
export function reversibleCellValue(value: unknown): {
  ok: boolean;
  value: unknown;
} {
  if (value === null || value === undefined) return { ok: true, value: null };
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") {
    return { ok: true, value };
  }
  if (value instanceof Date) return { ok: true, value: value.toISOString() };
  return { ok: false, value: undefined };
}

/** Base64-encode bytes. Works in both the browser and Node (≥16) via the
 *  global `btoa`; falls back to a manual table when `btoa` is unavailable. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === "function") return btoa(binary);
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : chars[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : chars[b2 & 63];
  }
  return out;
}
