/** Shared, pure value-formatting helpers used by the engine adapters when
 *  flattening a query result for the grid. Kept free of engine/DOM imports so
 *  they can be unit-tested in isolation. */

/** Format a calendar-date value as `YYYY-MM-DD`. Engines differ: PGlite
 *  returns a JS Date at UTC midnight, DuckDB's Arrow Date32 an epoch number
 *  (millis, or a day count in some builds), strings pass through. UTC parts
 *  keep the calendar day from shifting with the local timezone. Returns
 *  null for non-dates so the caller falls back to default coercion. */
export function toDateOnlyString(v: unknown): string | null {
  let d: Date;
  if (v instanceof Date) {
    d = v;
  } else if (typeof v === "number") {
    // < 1e8 (≈ year 2243 as days) is treated as a day count, else millis.
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
