/** Shared, pure value-formatting helpers used by the engine adapters when
 *  flattening a query result for the grid. Kept free of engine/DOM imports so
 *  they can be unit-tested in isolation. */

/** Render a year the way Postgres does: four digits minimum, so `0001` and
 *  `0500` keep their zero padding. Without it `'0001-01-01'::date` exports as
 *  `1-01-01`, which Postgres reads back as 2001-01-01 — a silent two-millennia
 *  shift on every export/import cycle. Years <= 0 are astronomical (year 0 is
 *  1 BC), rendered with the `BC` suffix Postgres itself emits. */
export function formatYear(year: number): string {
  if (year > 0) return String(year).padStart(4, "0");
  return `${String(1 - year).padStart(4, "0")} BC`;
}

/** Coerce a value to a Date for the date/timestamp formatters. Returns null
 *  when the value is not a date-like the caller should reformat. */
function toDate(v: unknown): Date | null {
  let d: Date;
  if (v instanceof Date) {
    d = v;
  } else if (typeof v === "number") {
    // < 1e8 (≈ year 2243 as days) is treated as a day count, else millis.
    d = new Date(Math.abs(v) < 1e8 ? v * 86_400_000 : v);
  } else {
    return null;
  }
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a calendar-date value as `YYYY-MM-DD`. Engines differ: PGlite
 *  returns a JS Date at UTC midnight, DuckDB's Arrow Date32 an epoch number
 *  (millis, or a day count in some builds), strings pass through. UTC parts
 *  keep the calendar day from shifting with the local timezone. Returns
 *  null for non-dates so the caller falls back to default coercion. */
export function toDateOnlyString(v: unknown): string | null {
  if (typeof v === "string") {
    const m = v.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : v;
  }
  const d = toDate(v);
  if (!d) return null;
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${formatYear(d.getUTCFullYear())}-${mo}-${da}`;
}

/** Format a timestamp the way `psql` prints it — `YYYY-MM-DD HH:MM:SS[.mmm]`,
 *  with a `+00` offset for `timestamptz`. PGlite hands both back as a JS Date;
 *  a bare `toISOString()` leaks the `T…Z` form, which reads inconsistently
 *  beside `date` columns and is not what Postgres would output. Returns null
 *  for non-dates so the caller falls back to default coercion. */
export function toTimestampString(v: unknown, withZone: boolean): string | null {
  const d = toDate(v);
  if (!d) return null;
  const p2 = (n: number) => String(n).padStart(2, "0");
  const date = `${formatYear(d.getUTCFullYear())}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  const time = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
  const ms = d.getUTCMilliseconds();
  const frac = ms === 0 ? "" : `.${String(ms).padStart(3, "0")}`;
  // PGlite runs with the session timezone at UTC, so `timestamptz` values are
  // always rendered at +00 rather than the viewer's local offset.
  return `${date} ${time}${frac}${withZone ? "+00" : ""}`;
}

/** Render a JS array as a Postgres array literal (`{1,2,3}`), the form the
 *  grid displays and every exporter emits. `[1,2,3]` — what `JSON.stringify`
 *  produces — is not valid Postgres array input, so a displayed value could
 *  not be pasted back into SQL and an exported INSERT would not replay.
 *  Elements needing quoting (embedded `,{}"\`, whitespace, or the literal
 *  `NULL`) are double-quoted with `"` and `\` backslash-escaped. */
export function toPgArrayLiteral(value: readonly unknown[]): string {
  const parts = value.map((item) => {
    if (item === null || item === undefined) return "NULL";
    if (Array.isArray(item)) return toPgArrayLiteral(item);
    if (typeof item === "boolean") return item ? "t" : "f";
    const s =
      typeof item === "object"
        ? JSON.stringify(item)
        : String(item);
    return /^$|[,{}"\\\s]|^null$/i.test(s)
      ? `"${s.replace(/(["\\])/g, "\\$1")}"`
      : s;
  });
  return `{${parts.join(",")}}`;
}

/** Parse a Postgres array literal (`{1,2,3}`, `{"a,b",NULL}`) back into a JS
 *  array of element strings. Nested arrays come back as nested arrays; the
 *  unquoted token `NULL` becomes `null`. Returns null when `text` is not an
 *  array literal, so callers can fall back to the raw value. */
export function parsePgArrayLiteral(text: string): unknown[] | null {
  const src = text.trim();
  if (!src.startsWith("{") || !src.endsWith("}")) return null;
  let i = 0;
  const parseList = (): unknown[] => {
    const out: unknown[] = [];
    i += 1; // consume "{"
    if (src[i] === "}") {
      i += 1;
      return out;
    }
    for (;;) {
      if (src[i] === "{") {
        out.push(parseList());
      } else if (src[i] === '"') {
        i += 1;
        let s = "";
        while (i < src.length && src[i] !== '"') {
          if (src[i] === "\\") i += 1;
          s += src[i];
          i += 1;
        }
        i += 1; // consume closing quote
        out.push(s);
      } else {
        let s = "";
        while (i < src.length && src[i] !== "," && src[i] !== "}") {
          s += src[i];
          i += 1;
        }
        out.push(s.toLowerCase() === "null" ? null : s);
      }
      if (src[i] === ",") {
        i += 1;
        continue;
      }
      break;
    }
    if (src[i] !== "}") return out;
    i += 1; // consume "}"
    return out;
  };
  const parsed = parseList();
  return i === src.length ? parsed : null;
}

/** Render a fixed-point DECIMAL from its unscaled integer and scale
 *  (2999, 2 → "29.99"). Arrow hands DECIMAL(p,s) back as the unscaled
 *  integer; without re-applying the scale, cells display and round-trip
 *  at the wrong magnitude. */
export function unscaledDecimalToString(unscaled: bigint, scale: number): string {
  if (scale <= 0) return unscaled.toString();
  const neg = unscaled < 0n;
  const abs = neg ? -unscaled : unscaled;
  const divisor = 10n ** BigInt(scale);
  const intPart = abs / divisor;
  const fracPart = abs % divisor;
  const fracStr = fracPart.toString().padStart(scale, "0");
  return `${neg ? "-" : ""}${intPart}.${fracStr}`;
}

/** Coerce the unscaled integer out of a DECIMAL cell (BigInt, or a value
 *  whose String() is a plain integer). Returns null for already-formatted
 *  decimals so pre-scaling Arrow builds aren't double-scaled. */
export function unscaledIntegerFrom(raw: unknown): bigint | null {
  if (typeof raw === "bigint") return raw;
  if (raw === null || raw === undefined) return null;
  const s = String(raw);
  return /^-?\d+$/.test(s) ? BigInt(s) : null;
}
