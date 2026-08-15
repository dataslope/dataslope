import { formatCellValue } from "./cellUtils";

/**
 * Pure, engine-agnostic column statistics over the loaded rows for the
 * "Column statistics" inspector. Input is `unknown` and every branch is
 * defensive (adapters surface booleans, Dates, arrays). PG numeric/decimal
 * columns arrive as *strings*, so a column whose every non-null value is a
 * finite numeric string is treated as numeric; any non-numeric string keeps
 * it "text".
 */

/** One of the most-frequent non-null values, with its occurrence count. */
export interface ColumnTopValue {
  /** Display string (via `formatCellValue`) of the value. */
  label: string;
  count: number;
}

export interface NumericColumnStats {
  /** How many finite numeric values the aggregates are computed over. */
  count: number;
  min: number;
  max: number;
  sum: number;
  mean: number;
  median: number;
}

export interface TextColumnStats {
  /** How many string values the length aggregates are computed over. */
  count: number;
  minLength: number;
  maxLength: number;
  avgLength: number;
}

/** Dominant value kind, used to decide which extra block to show. */
export type ColumnStatsKind =
  | "numeric"
  | "text"
  | "boolean"
  | "blob"
  | "mixed"
  | "empty";

export interface ColumnStats {
  /** Rows considered (includes NULLs). */
  total: number;
  /** Non-null (and non-undefined) values. */
  nonNull: number;
  /** NULL / undefined values. */
  nulls: number;
  /** Fraction of NULLs in `[0, 1]` (0 when there are no rows). */
  nullFraction: number;
  /** Distinct non-null values. A number `1` and the string `"1"` are counted
   *  as two distinct values (the key is type-aware), so cardinality is exact. */
  distinct: number;
  kind: ColumnStatsKind;
  /** Numeric aggregates, present only when `kind === "numeric"`. */
  numeric?: NumericColumnStats;
  /** String length aggregates, present only when `kind === "text"`. */
  text?: TextColumnStats;
  /** Up to `topN` most frequent non-null values, most-frequent first. */
  top: ColumnTopValue[];
}

export const DEFAULT_TOP_VALUES = 5;

function isNullish(v: unknown): boolean {
  return v === null || v === undefined;
}

/** Parse a value as a finite number, or return `null`. Accepts real numbers
 *  and finite numeric strings (so PG `numeric`/`decimal` strings aggregate),
 *  but never the empty string (which `Number("")` would turn into `0`). */
export function asFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Type-aware distinct key so cross-type values (number `1` vs string `"1"`)
 *  never collapse. Blobs are keyed by length (a deliberate approximation,
 *  binary columns are summarised by size, not byte-compared). */
function distinctKey(v: unknown): string {
  if (typeof v === "number") return `n:${v}`;
  if (typeof v === "string") return `s:${v}`;
  if (typeof v === "boolean") return `B:${v}`;
  if (v instanceof Uint8Array) return `b:${v.length}`;
  return `o:${formatCellValue(v)}`;
}

/** Median of an unsorted numeric array (sorts a copy). Empty → 0. */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Compute descriptive statistics for a single column's values. */
export function computeColumnStats(
  values: readonly unknown[],
  topN: number = DEFAULT_TOP_VALUES,
): ColumnStats {
  const total = values.length;
  let nulls = 0;

  // Per-kind tallies (over non-null values) to classify the column.
  let numberLike = 0; // real numbers or finite numeric strings
  let stringCount = 0;
  let nonNumericString = 0;
  let boolCount = 0;
  let blobCount = 0;
  let otherCount = 0;

  // Numeric aggregates (single pass; median needs the collected array).
  const numbers: number[] = [];
  let numSum = 0;
  let numMin = Infinity;
  let numMax = -Infinity;

  // Text length aggregates.
  let strLenCount = 0;
  let strLenSum = 0;
  let strLenMin = Infinity;
  let strLenMax = -Infinity;

  // Frequency by type-aware key; the label is the first value's display string.
  const freq = new Map<string, ColumnTopValue>();

  for (const v of values) {
    if (isNullish(v)) {
      nulls++;
      continue;
    }

    const key = distinctKey(v);
    const existing = freq.get(key);
    if (existing) existing.count++;
    else freq.set(key, { label: formatCellValue(v), count: 1 });

    const num = asFiniteNumber(v);
    if (num !== null) {
      numberLike++;
      numbers.push(num);
      numSum += num;
      if (num < numMin) numMin = num;
      if (num > numMax) numMax = num;
    }

    if (typeof v === "number") {
      // already counted in numberLike
    } else if (typeof v === "string") {
      stringCount++;
      if (num === null) nonNumericString++;
      const len = v.length;
      strLenCount++;
      strLenSum += len;
      if (len < strLenMin) strLenMin = len;
      if (len > strLenMax) strLenMax = len;
    } else if (typeof v === "boolean") {
      boolCount++;
    } else if (v instanceof Uint8Array) {
      blobCount++;
    } else {
      otherCount++;
    }
  }

  const nonNull = total - nulls;
  const distinct = freq.size;
  const top = [...freq.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, Math.max(0, topN));

  // Classify by what every non-null value is.
  let kind: ColumnStatsKind;
  if (nonNull === 0) {
    kind = "empty";
  } else if (numberLike === nonNull) {
    // Every non-null value is a number or a finite numeric string.
    kind = "numeric";
  } else if (boolCount === nonNull) {
    kind = "boolean";
  } else if (blobCount === nonNull) {
    kind = "blob";
  } else if (stringCount === nonNull && nonNumericString > 0) {
    // All strings, and at least one isn't numeric → a genuine text column.
    kind = "text";
  } else if (otherCount === 0 && blobCount === 0 && boolCount === 0) {
    // A mix of numbers and numeric/non-numeric strings, still text-ish.
    kind = stringCount > 0 ? "text" : "numeric";
  } else {
    kind = "mixed";
  }

  const stats: ColumnStats = {
    total,
    nonNull,
    nulls,
    nullFraction: total > 0 ? nulls / total : 0,
    distinct,
    kind,
    top,
  };

  if (kind === "numeric" && numbers.length > 0) {
    stats.numeric = {
      count: numbers.length,
      min: numMin,
      max: numMax,
      sum: numSum,
      mean: numSum / numbers.length,
      median: median(numbers),
    };
  }

  if (kind === "text" && strLenCount > 0) {
    stats.text = {
      count: strLenCount,
      minLength: strLenMin,
      maxLength: strLenMax,
      avgLength: strLenSum / strLenCount,
    };
  }

  return stats;
}

/** Format a number for compact display: integers get thousands separators;
 *  fractionals are limited to ~4 significant fraction digits, trimmed. */
export function formatStatNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toLocaleString();
  const rounded = Number(n.toFixed(4));
  // toLocaleString keeps the integer part grouped while dropping trailing zeros.
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Format a `[0,1]` fraction as a percentage string (e.g. `12.5%`). */
export function formatPercent(fraction: number): string {
  const pct = fraction * 100;
  const rounded = Number(pct.toFixed(1));
  return `${rounded.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}
