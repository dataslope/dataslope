/**
 * Duplicate-row planning, shared by all three SQL playgrounds.
 *
 * Copying a row verbatim only works while nothing in it has to be unique.
 * The moment the table has a primary key or a UNIQUE column whose value the
 * database won't mint for us, the INSERT fails on a constraint violation, so
 * the grid used to grey "Duplicate row" out and explain why. It now collects
 * the columns that would collide and asks what to put in them instead — the
 * planning half of that lives here, free of React and of any one engine.
 */

import type {
  ColumnConstraintInfo,
  TableColumnInfo,
} from "../../runtime/sqlite";

/** Column DEFAULTs that mint a fresh, distinct value on every INSERT, so a
 *  duplicate that leaves the column out can't collide with the row it was
 *  copied from. Sequences (`nextval`) plus the UUID generators the three
 *  engines ship (`gen_random_uuid()`, `uuid()`, `uuid_generate_v4()`,
 *  DuckDB's `uuid()`/`gen_random_uuid()`). Deliberately excludes defaults
 *  like `now()`, which generate a value but not a *distinct* one. */
const GENERATING_DEFAULT_RE =
  /\b(?:nextval|gen_random_uuid|uuid_generate_v\d+|uuid|newid)\s*\(/i;

/** True when `defaultValue` produces a fresh value per row. */
export function defaultGeneratesUniqueValue(
  defaultValue: string | null | undefined,
): boolean {
  return !!defaultValue && GENERATING_DEFAULT_RE.test(defaultValue);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the stored value is itself a UUID, which is the tell for a
 *  `TEXT`/`VARCHAR` column holding UUIDs (SQLite has no uuid type). */
export function looksLikeUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

const UUID_TYPE_RE = /^(?:uuid|guid|uniqueidentifier)$/i;

/** Declared types whose next value is "one more than the largest". Matches
 *  whole words so `interval` and `point` don't read as numeric. */
const NUMERIC_TYPE_RE =
  /\b(?:int|int2|int4|int8|integer|bigint|smallint|tinyint|hugeint|serial|smallserial|bigserial|decimal|numeric|real|double|float|float4|float8|utinyint|usmallint|uinteger|ubigint)\b/i;

export function isNumericColumnType(type: string | undefined): boolean {
  return !!type && NUMERIC_TYPE_RE.test(type);
}

/** How the dialog's "Auto" option fills one conflicting column in.
 *  - `next-number`: `MAX(col) + 1`, resolved against the table at insert
 *    time (the browser only sees the current page of rows).
 *  - `uuid`: a fresh UUID minted in the browser. */
export type DuplicateAutoKind = "next-number" | "uuid";

/** What the user picked for one conflicting column. `keep` copies the
 *  original value through; it is only offered on composite-primary-key
 *  members ({@link DuplicateColumnChoice.canKeep}), where changing one
 *  member is enough to make the whole key fresh. */
export type DuplicateStrategy = "auto" | "custom" | "null" | "keep";

/** One column that stops the row being copied as-is. */
export interface DuplicateColumnChoice {
  name: string;
  /** Declared type, or "" when the engine doesn't report one. */
  type: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  /** Value in the row being duplicated. */
  originalValue: unknown;
  /** `null` when nothing sensible can be generated and the user has to type
   *  a value. */
  autoKind: DuplicateAutoKind | null;
  /** NULLs compare as distinct in a unique index, so clearing a nullable
   *  UNIQUE column is a legal way out. Never true for a primary key. */
  canBeNull: boolean;
  /** "Keep original" is legal only where changing a *different* column can
   *  satisfy this one's constraint: a composite-primary-key member with no
   *  unique constraint of its own. A sole-member key, or any single-column
   *  UNIQUE, must always change — offering keep there just promises a
   *  constraint violation. */
  canKeep: boolean;
}

/** The engine-facing half of the user's answers. Columns the user chose to
 *  keep simply don't appear: the copied value carries through. */
export interface DuplicateRowPlan {
  /** Columns whose value is `MAX(col) + 1`, computed by the playground
   *  against the live table just before the INSERT. */
  nextNumber: readonly string[];
  /** Values replacing the copied ones (a typed value, NULL, a fresh UUID). */
  overrides: ReadonlyArray<{ column: string; value: unknown }>;
}

/** SQLite fills `INTEGER PRIMARY KEY` in by itself — that column *is* the
 *  table's rowid, AUTOINCREMENT keyword or not. The alias holds only for the
 *  exact declared type `INTEGER` (`INT` is a different, ordinary column), a
 *  single-column primary key, and a table that still has a rowid. */
export function isSqliteRowidAlias(col: {
  /** Declared type, as `PRAGMA table_info` reports it. */
  type: string;
  /** Position within the primary key; 0 = not part of it. */
  pk: number;
  /** True when the table's primary key names exactly one column. */
  singleColumnPk: boolean;
  /** True for a `WITHOUT ROWID` table, which has no rowid to alias. */
  withoutRowid: boolean;
  /** True when `PRAGMA index_list` shows an origin-'pk' index. A rowid alias
   *  needs no index at all, so the presence of one is the tell for the
   *  non-alias forms — most notably `INTEGER PRIMARY KEY DESC`, which SQLite
   *  deliberately does NOT treat as the rowid. */
  hasPkIndex: boolean;
}): boolean {
  return (
    col.pk === 1 &&
    col.singleColumnPk &&
    !col.withoutRowid &&
    !col.hasPkIndex &&
    /^integer$/i.test(col.type.trim())
  );
}

/** Does the database fill this column in by itself when an INSERT omits it? */
export function isAutoPopulated(info: ColumnConstraintInfo): boolean {
  return (
    info.autoPopulated ??
    (info.isAutoIncrement || defaultGeneratesUniqueValue(info.defaultValue))
  );
}

/** The column/value pairs an INSERT that copies `rowValues` should carry.
 *  Auto-populated columns under a unique constraint (a rowid alias, a serial
 *  or IDENTITY key, a UUID-default key) are dropped so the database mints
 *  fresh values for them instead of colliding on the copied ones. An
 *  auto-populated column that is NOT unique (say, a `uuid()`-default trace
 *  column) is copied verbatim: nothing can collide, and a duplicate should
 *  reproduce the row wherever it legally can. */
export function duplicateInsertColumns(
  columns: readonly string[],
  rowValues: readonly unknown[],
  constraintInfo: readonly ColumnConstraintInfo[] | undefined,
): { names: string[]; values: unknown[] } {
  const autoNames = new Set(
    (constraintInfo ?? [])
      .filter((c) => (c.isPrimaryKey || c.isUnique) && isAutoPopulated(c))
      .map((c) => c.name),
  );
  const names: string[] = [];
  const values: unknown[] = [];
  columns.forEach((name, i) => {
    if (autoNames.has(name)) return;
    names.push(name);
    values.push(rowValues[i]);
  });
  return { names, values };
}

/** The columns of `columns` that would collide if the row were inserted
 *  verbatim, in the order they appear in the result set.
 *
 *  Skipped, because they can't collide: columns under no unique constraint,
 *  columns the database re-generates when left out of the INSERT, and NULLs
 *  in a non-key UNIQUE column (SQL treats NULLs as distinct). */
export function conflictingDuplicateColumns(
  columns: readonly string[],
  values: readonly unknown[],
  constraintInfo: readonly ColumnConstraintInfo[] | undefined,
): DuplicateColumnChoice[] {
  if (!constraintInfo || constraintInfo.length === 0) return [];
  const byName = new Map(constraintInfo.map((c) => [c.name, c]));
  // A composite key with an auto-populated member is already fresh: the
  // database re-mints that member, so the *pair* can't collide and the other
  // members only conflict through unique constraints of their own.
  const pkAuto = constraintInfo.some(
    (c) => c.isPrimaryKey && isAutoPopulated(c),
  );
  const out: DuplicateColumnChoice[] = [];
  columns.forEach((name, i) => {
    const info = byName.get(name);
    if (!info) return;
    const pkConflict = info.isPrimaryKey && !pkAuto;
    if (!pkConflict && !info.isUnique) return;
    if (isAutoPopulated(info)) return;
    const value = values[i];
    const canBeNull = !info.isPrimaryKey && info.notNull !== true;
    if (canBeNull && (value === null || value === undefined)) return;
    const type = info.type ?? "";
    out.push({
      name,
      type,
      isPrimaryKey: info.isPrimaryKey,
      isUnique: info.isUnique,
      originalValue: value,
      autoKind: autoKindFor(type, value),
      canBeNull,
      canKeep: false,
    });
  });
  // Keep is only sound for pure composite-PK members: with two or more of
  // them in play, changing one frees the rest to stay. A member that also
  // carries its own UNIQUE constraint must change regardless.
  const pureKeyMembers = out.filter((c) => c.isPrimaryKey && !c.isUnique);
  if (pureKeyMembers.length >= 2) {
    for (const member of pureKeyMembers) member.canKeep = true;
  }
  return out;
}

/** UUID before number: a `uuid`-typed column never wants `MAX(col) + 1`. */
function autoKindFor(type: string, value: unknown): DuplicateAutoKind | null {
  if (UUID_TYPE_RE.test(type.trim()) || looksLikeUuid(value)) return "uuid";
  if (isNumericColumnType(type)) return "next-number";
  if (typeof value === "number" || typeof value === "bigint")
    return "next-number";
  return null;
}

/** The strategy a column starts on: generate where we can, otherwise put the
 *  cursor in an input the user has to fill. */
export function defaultDuplicateStrategy(
  choice: DuplicateColumnChoice,
): DuplicateStrategy {
  return choice.autoKind === null ? "custom" : "auto";
}

/** One more than `max`, preserving integer precision past 2^53 by falling
 *  back to a decimal string (Postgres hands `bigint` back as a string
 *  anyway). An empty table (`MAX` of no rows is NULL) starts at 1. */
export function incrementMaxValue(max: unknown): number | string {
  if (max === null || max === undefined) return 1;
  if (typeof max === "bigint") return fromBigInt(max + 1n);
  if (typeof max === "number") {
    return Number.isFinite(max) ? Math.floor(max) + 1 : 1;
  }
  const text = String(max).trim();
  if (/^-?\d+$/.test(text)) return fromBigInt(BigInt(text) + 1n);
  const n = Number(text);
  return Number.isFinite(n) ? Math.floor(n) + 1 : 1;
}

function fromBigInt(value: bigint): number | string {
  const limit = BigInt(Number.MAX_SAFE_INTEGER);
  return value <= limit && value >= -limit ? Number(value) : value.toString();
}

/** Pre-filled text for a column's "Custom value" input. `freshUuid` is passed
 *  in rather than minted here so the caller owns the randomness. */
export function suggestDuplicateText(
  choice: DuplicateColumnChoice,
  freshUuid: string,
): string {
  if (choice.autoKind === "uuid") return freshUuid;
  if (choice.autoKind === "next-number") {
    return String(incrementMaxValue(choice.originalValue));
  }
  const original = choice.originalValue;
  if (original === null || original === undefined) return "";
  const text = String(original);
  return text ? `${text} (copy)` : "";
}

/** A v4 UUID, from `crypto.randomUUID` where it exists (it needs a secure
 *  context) and from `getRandomValues` otherwise. */
export function newUuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Version 4, variant 1.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A plan is insertable once every constraint in it is satisfiable: every
 *  custom input is filled, "keep" appears only where it is legal
 *  ({@link DuplicateColumnChoice.canKeep}), and — where a composite key
 *  offers keep at all — at least one of its members actually changes,
 *  otherwise the INSERT reproduces the key it was copied from. */
export function isDuplicatePlanComplete(
  choices: readonly DuplicateColumnChoice[],
  strategies: Readonly<Record<string, DuplicateStrategy>>,
  customText: Readonly<Record<string, string>>,
): boolean {
  const keepOffered = choices.some((c) => c.canKeep);
  let keyChanged = false;
  for (const choice of choices) {
    const strategy = strategies[choice.name] ?? defaultDuplicateStrategy(choice);
    if (strategy === "keep") {
      if (!choice.canKeep) return false;
      continue;
    }
    // An empty input is not "set it to NULL" — "Set to NULL" is its own
    // option, and it isn't offered where NULL is illegal.
    if (strategy === "custom" && (customText[choice.name] ?? "") === "") {
      return false;
    }
    if (choice.canKeep) keyChanged = true;
  }
  return !keepOffered || keyChanged;
}

/** Fold the dialog's answers into the plan the playground executes.
 *  `freshUuid` mints one UUID per `auto` UUID column. */
export function buildDuplicateRowPlan(
  choices: readonly DuplicateColumnChoice[],
  strategies: Readonly<Record<string, DuplicateStrategy>>,
  customText: Readonly<Record<string, string>>,
  freshUuid: () => string,
): DuplicateRowPlan {
  const nextNumber: string[] = [];
  const overrides: Array<{ column: string; value: unknown }> = [];
  for (const choice of choices) {
    const strategy = strategies[choice.name] ?? defaultDuplicateStrategy(choice);
    if (strategy === "keep") continue;
    if (strategy === "null") {
      overrides.push({ column: choice.name, value: null });
      continue;
    }
    if (strategy === "custom") {
      const raw = customText[choice.name] ?? "";
      overrides.push({ column: choice.name, value: coerceCustomValue(choice, raw) });
      continue;
    }
    if (choice.autoKind === "uuid") {
      overrides.push({ column: choice.name, value: freshUuid() });
    } else if (choice.autoKind === "next-number") {
      nextNumber.push(choice.name);
    }
  }
  return { nextNumber, overrides };
}

/** Typed text becomes a number for numeric columns so the engine binds an
 *  integer rather than a string (which SQLite would happily store as text). */
function coerceCustomValue(
  choice: DuplicateColumnChoice,
  raw: string,
): unknown {
  const numeric =
    isNumericColumnType(choice.type) ||
    typeof choice.originalValue === "number" ||
    typeof choice.originalValue === "bigint";
  if (!numeric) return raw;
  const trimmed = raw.trim();
  if (trimmed === "") return raw;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return raw;
  // An integer past 2^53 would silently round through Number; bind the text
  // instead — every engine parses a decimal string into its own integer type
  // (mirrors incrementMaxValue's string fallback).
  if (/^-?\d+$/.test(trimmed) && !Number.isSafeInteger(n)) return trimmed;
  return n;
}

/** Apply a plan to the column/value arrays an INSERT is about to bind.
 *  `nextNumber` resolves `MAX(col)` for one column; it runs once per column
 *  the plan asks for, and never when the plan asks for none. */
export async function applyDuplicateRowPlan(
  columnNames: readonly string[],
  values: readonly unknown[],
  plan: DuplicateRowPlan | undefined,
  nextNumber: (column: string) => Promise<unknown>,
): Promise<{ names: string[]; values: unknown[] }> {
  const names = [...columnNames];
  const nextValues = [...values];
  if (!plan) return { names, values: nextValues };
  for (const { column, value } of plan.overrides) {
    const i = names.indexOf(column);
    if (i >= 0) nextValues[i] = value;
  }
  for (const column of plan.nextNumber) {
    const i = names.indexOf(column);
    if (i < 0) continue;
    nextValues[i] = incrementMaxValue(await nextNumber(column));
  }
  return { names, values: nextValues };
}

/** Derive {@link ColumnConstraintInfo} from a `listColumns()` result, for the
 *  playgrounds that already hold the column list in memory (Postgres,
 *  DuckDB) — one round trip per table saved over asking the engine again.
 *  SQLite is the exception: its rowid-alias rule needs the table's DDL, so
 *  it keeps using `getColumnConstraintInfo`. */
export function constraintInfoFromColumns(
  columns: readonly TableColumnInfo[],
): ColumnConstraintInfo[] {
  return columns.map((col) => {
    const isAutoIncrement =
      col.identity === true || defaultGeneratesSequence(col.defaultValue);
    return {
      name: col.name,
      isPrimaryKey: col.pk > 0,
      isAutoIncrement,
      isUnique: col.unique === true,
      autoPopulated:
        isAutoIncrement || defaultGeneratesUniqueValue(col.defaultValue),
      type: col.type,
      notNull: col.notNull,
      defaultValue: col.defaultValue,
    };
  });
}

/** Sequence-style defaults: `nextval(...)`, plus the `GENERATED ...` text
 *  some DuckDB builds report as an identity column's default. */
function defaultGeneratesSequence(
  defaultValue: string | null | undefined,
): boolean {
  return (
    !!defaultValue &&
    (/\bnextval\s*\(/i.test(defaultValue) || /^GENERATED\b/i.test(defaultValue))
  );
}
