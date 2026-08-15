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

/** Coerce an Arrow scalar (which may be a BigInt) to a JS number. */
function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
    return Number(v);
  }
  return null;
}

/** Divisor turning a value in `unit` into microseconds. */
const ARROW_UNIT_TO_MICROS: Record<string, number> = {
  SECOND: 1_000_000,
  MILLISECOND: 1_000,
  MICROSECOND: 1,
  NANOSECOND: 1 / 1000,
};

/** Format an Arrow `Time<unit>` value as `HH:MM:SS[.ffffff]`.
 *
 *  Unlike timestamps — which apache-arrow normalizes to epoch milliseconds on
 *  the way out — a time keeps the column's own unit, so `TIME '09:30:00'`
 *  arrives as the bare number `34200000000` (microseconds since midnight) and
 *  was rendered as exactly that. `unit` comes from the Arrow type string
 *  (`Time<MICROSECOND>`). */
export function arrowTimeToString(raw: unknown, unit: string): string | null {
  const n = toNumber(raw);
  if (n === null) return null;
  const perMicro = ARROW_UNIT_TO_MICROS[unit.toUpperCase()];
  if (perMicro === undefined) return null;
  const totalMicros = Math.round(n * perMicro);
  const neg = totalMicros < 0;
  const abs = Math.abs(totalMicros);
  const micros = abs % 1_000_000;
  const totalSeconds = Math.floor(abs / 1_000_000);
  const p2 = (v: number) => String(v).padStart(2, "0");
  const clock = `${p2(Math.floor(totalSeconds / 3600))}:${p2(
    Math.floor(totalSeconds / 60) % 60,
  )}:${p2(totalSeconds % 60)}`;
  const frac =
    micros === 0 ? "" : `.${String(micros).padStart(6, "0").replace(/0+$/, "")}`;
  return `${neg ? "-" : ""}${clock}${frac}`;
}

/** Format an Arrow `Interval<unit>` value the way DuckDB prints it
 *  (`3 days`, `1 year 2 months 3 days 04:05:06`, `00:00:00` for zero).
 *
 *  The value is an `Int32Array` whose meaning depends on the unit, so it was
 *  reaching the grid as the raw index-keyed dump `{"0":0,"1":0}`. Layouts:
 *  YEAR_MONTH `[years, months]`, DAY_TIME `[days, milliseconds]`,
 *  MONTH_DAY_NANO `[months, days, nanosLow, nanosHigh]`. */
export function arrowIntervalToString(
  raw: unknown,
  unit: string,
): string | null {
  const parts: number[] = [];
  if (raw instanceof Int32Array || Array.isArray(raw)) {
    const arr = raw as ArrayLike<number>;
    for (let i = 0; i < arr.length; i++) parts.push(Number(arr[i]));
  } else if (raw && typeof raw === "object") {
    // A structured-clone hop turns the typed array into an index-keyed object.
    for (const key of Object.keys(raw as Record<string, unknown>)) {
      if (!/^\d+$/.test(key)) return null;
      parts[Number(key)] = Number((raw as Record<string, number>)[key]);
    }
  } else {
    return null;
  }
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n))) return null;

  let months = 0;
  let days = 0;
  let micros = 0;
  switch (unit.toUpperCase()) {
    case "YEAR_MONTH":
      months = (parts[0] ?? 0) * 12 + (parts[1] ?? 0);
      break;
    case "DAY_TIME":
      days = parts[0] ?? 0;
      micros = (parts[1] ?? 0) * 1000;
      break;
    case "MONTH_DAY_NANO": {
      months = parts[0] ?? 0;
      days = parts[1] ?? 0;
      // nanoseconds is an int64 split across two int32 halves, little-endian.
      const lo = BigInt(parts[2] ?? 0) & 0xffffffffn;
      const hi = BigInt(parts[3] ?? 0);
      micros = Number(((hi << 32n) | lo) / 1000n);
      break;
    }
    default:
      return null;
  }
  return formatIntervalParts(months, days, micros);
}

/** `months`/`days`/`micros` → DuckDB's interval text. */
function formatIntervalParts(
  months: number,
  days: number,
  micros: number,
): string {
  const out: string[] = [];
  const years = Math.trunc(months / 12);
  const restMonths = months % 12;
  const plural = (n: number, word: string) =>
    `${n} ${word}${Math.abs(n) === 1 ? "" : "s"}`;
  if (years !== 0) out.push(plural(years, "year"));
  if (restMonths !== 0) out.push(plural(restMonths, "month"));
  if (days !== 0) out.push(plural(days, "day"));
  const clock = arrowTimeToString(micros, "MICROSECOND");
  // DuckDB omits a zero clock unless there is nothing else to print.
  if (micros !== 0 && clock) out.push(clock);
  if (out.length === 0) return "00:00:00";
  return out.join(" ");
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
