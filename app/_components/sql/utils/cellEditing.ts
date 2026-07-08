/** Type-aware cell editing helpers for the result grid.
 *
 *  These are pure functions (no React, no engine access) so they can be
 *  unit-tested in isolation. `ResultView` uses them to pick the right inline
 *  editor for a column and to convert between a stored cell value and the
 *  value a native `<input type="date|datetime-local|time">` expects.
 *
 *  Design note on round-tripping temporal values: a date/time picker is a
 *  pure *enhancement* over the existing free-text inline editor. To guarantee
 *  an edit is at least as safe as typing the ISO text by hand, the picker
 *  reconstructs the committed string by substituting only the date and time
 *  substrings of the *original* value, preserving its separator (`T` vs a
 *  space), fractional seconds, and timezone suffix (`Z` / `+05:30`). The
 *  engine produced that format, so it always parses it back. No JS `Date`
 *  timezone arithmetic is performed, which is the usual source of off-by-an-
 *  hour bugs. */

import type { TableColumnInfo } from "../../runtime/sqlite";

/** Build the enum-column → allowed-labels map for `ColumnKeyHints` from a
 *  table's introspected columns. Columns without enum metadata (every SQLite
 *  column, and any non-enum Postgres/DuckDB column) are skipped. */
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
 *  names produced by all three engines (Postgres `timestamptz`, DuckDB
 *  `TIMESTAMP WITH TIME ZONE`, SQLite declared `DATETIME`, …). Array types
 *  (`integer[]`, `timestamptz[]`) and unknown types fall back to `"text"`. */
export function classifyCellEditor(sqlType: string | undefined): CellEditorKind {
  const t = (sqlType ?? "").trim().toLowerCase();
  if (!t) return "text";
  if (/^bool(ean)?$/.test(t)) return "boolean";
  // Arrays / lists get a dedicated JSON-array editor (checked before the
  // scalar temporal/json rules so an array of timestamps isn't mistaken for a
  // single timestamp). Postgres and DuckDB report `integer[]` / `text[]`;
  // raw Arrow notation (`list<int32>`) is kept as a fallback for callers
  // that bypass `arrowTypeToSqlName`.
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

/** Normalize an array cell's stored value to JSON text for editing. Array
 *  values reach the grid as JSON strings (both adapters JSON-stringify them),
 *  but a value may also be a live JS array, handle both. */
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

/** Parse an edited array cell. Returns the parsed JS array when the text is a
 *  valid JSON array (the value written back, which each engine binds as a real
 *  array / LIST); otherwise `{ ok: false }` so the caller keeps the raw text
 *  rather than committing garbage. */
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
 *
 *  A column may be declared `date` yet hold a value with a meaningful time,
 *  this is common with flexibly-typed engines (SQLite stores whatever string
 *  you give it) and also happens when a value like `2024-03-15 14:30:00` lands
 *  in a date-ish column. In those cases a date-only `<input type="date">`
 *  would silently hide and drop the time, so the caller upgrades to a
 *  `datetime-local` picker. Pure dates (no time, or an all-zero `T00:00:00`
 *  suffix as produced for a true SQL `date`) return `false` and keep the
 *  date-only picker. Timezone suffixes (`+05:30`) are never mistaken for the
 *  time-of-day because the first `HH:MM` in the string is the clock time. */
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

/** Resolve the *effective* editor kind for a cell from its column-derived kind
 *  and the actual stored value: a `date` column whose value carries a real
 *  time-of-day is upgraded to `datetime` so the user can edit hours/minutes
 *  too. Everything else passes through unchanged. */
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
 *  expects, or `null` if the value isn't a recognizable temporal string (in
 *  which case the caller should fall back to the plain text editor, so odd
 *  representations, e.g. a SQLite date stored as a Unix integer, are never
 *  silently mangled). */
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

/** Convert the value coming back from a native date/time input into the string
 *  to commit. Where the original value's format is known it is preserved by
 *  substituting only its date/time substrings (keeping separator, fractional
 *  seconds and any timezone suffix); otherwise a plain ISO-ish string is
 *  produced. */
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

/** Decide whether a previously-stored cell value can be safely written back
 *  verbatim for a one-step *undo* of a committed edit (UX-10).
 *
 *  Undo re-applies the value the engine itself returned, so for scalars it is
 *  exactly as safe as the original write. Only values that round-trip cleanly
 *  through the same update path are reversible:
 *    • `null`, string, number, boolean, bigint → passed through unchanged;
 *    • `Date` → normalized to an ISO string (every engine parses it back, and
 *      it avoids DuckDB's `String(date)` literal, which isn't valid SQL);
 *  A complex original (JS array/object from a LIST/STRUCT/JSON column, or raw
 *  `Uint8Array` bytes) returns `{ ok: false }` so the caller suppresses undo
 *  rather than risk a lossy reverse-write. */
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
