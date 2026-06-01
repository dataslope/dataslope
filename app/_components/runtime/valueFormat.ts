/** Shared, pure value-formatting helpers used by the engine adapters when
 *  flattening a query result for the grid. Kept free of engine/DOM imports so
 *  they can be unit-tested in isolation. */

/** Format a calendar-date value as a plain `YYYY-MM-DD` string.
 *
 *  Different engines hand a `date` column back in different shapes:
 *   - Postgres (PGlite) returns a JS `Date` at UTC midnight, which would
 *     otherwise render as the noisy `2024-12-30T00:00:00.000Z`.
 *   - DuckDB's Arrow `Date32<DAY>` arrives as an epoch number (milliseconds in
 *     duckdb-wasm; a day count in some Arrow builds), which would otherwise
 *     render as a raw integer like `1704412800000`.
 *   - A string is passed through after extracting its date part.
 *
 *  UTC parts are used so the calendar day is never shifted by the runner's
 *  local timezone. Returns `null` for anything not recognizable as a date so
 *  the caller can fall back to its default coercion. */
export function toDateOnlyString(v: unknown): string | null {
  let d: Date;
  if (v instanceof Date) {
    d = v;
  } else if (typeof v === "number") {
    // Heuristic: a value small enough to be a day count (≈ <100k days ≈ year
    // 2243) is treated as days since the epoch; otherwise it's epoch millis.
    d = new Date(Math.abs(v) < 1e8 ? v * 86_400_000 : v);
  } else if (typeof v === "string") {
    const m = v.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : v;
  } else {
    return null;
  }
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Render a fixed-point DECIMAL from its unscaled integer and scale, e.g.
 *  unscaled `2999` with scale `2` → `"29.99"`. Arrow hands DuckDB
 *  `DECIMAL(p,s)` columns back as the unscaled integer (a `BigInt` in some
 *  builds, a `Decimal` object whose `String()` is the unscaled integer in
 *  duckdb-wasm); without re-applying the scale the cell shows `2999` and an
 *  edit that adds decimals round-trips to the wrong magnitude. */
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

/** Coerce the unscaled integer out of whatever Arrow handed back for a DECIMAL
 *  cell — a `BigInt`, or an object/number whose `String()` is a plain integer.
 *  Returns `null` when the value already looks like a formatted decimal (has a
 *  `.`) or isn't an integer, so the caller leaves it untouched (guards against
 *  double-scaling on Arrow builds that pre-scale). */
export function unscaledIntegerFrom(raw: unknown): bigint | null {
  if (typeof raw === "bigint") return raw;
  if (raw === null || raw === undefined) return null;
  const s = String(raw);
  return /^-?\d+$/.test(s) ? BigInt(s) : null;
}
