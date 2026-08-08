/**
 * The declarative test language `<SqlChallengeCard>` grades against, and the
 * evaluator for it.
 *
 * Extracted from SqlChallengeCard.tsx so that something other than a React
 * component can run it. `scripts/check-sql-blocks.mjs` imports this module
 * directly and grades every card in `content/` with the same code a reader's
 * Check Answer runs, for the same reason `check-challenge-cards.mjs` imports
 * `challengeHarness.ts` rather than reimplementing the Python one: a second
 * copy of a grader drifts from the first, and a drifted grader does not fail
 * loudly, it passes cards it should have failed.
 *
 * Everything here is pure and engine-agnostic. The only contact with a
 * database is `SqlEngineLike`, an interface the caller supplies, so the same
 * evaluator serves sqlite-wasm in the browser and PGlite in Node without
 * knowing which it has.
 *
 * SqlChallengeCard.tsx re-exports the types below, so existing imports of
 * `SqlDialect` / `SqlResult` / `SqlChallengeTest` from that module keep
 * working.
 */
/** Supported SQL dialects. Each maps to a distinct WASM runtime in
 *  this codebase. */
export type SqlDialect = "sqlite" | "duckdb" | "postgres";

/** Generic result-set shape. Mirrors `QueryExecResult` from
 *  sqlite-wasm so existing playground helpers can be reused without
 *  glue, but typed locally so this module doesn't depend on the
 *  larger sqlite-wasm surface. */
export interface SqlResult {
  columns: string[];
  values: unknown[][];
}

export interface SqlChallengeTest {
  id: string;
  name: string;
  description?: string;
  /** Expected row count of the learner's final result set. */
  expectedRowCount?: number;
  /** Minimum row count of the learner's final result set. */
  rowCountAtLeast?: number;
  /** Result set must include exactly these columns, in this order. */
  expectedColumns?: string[];
  /** Result set must include each of these column names (order
   *  doesn't matter, extras are allowed). */
  expectedColumnsInclude?: string[];
  /** Exact row values to match (defaults to order-independent). */
  expectedRows?: {
    columns?: string[];
    values: unknown[][];
    /** When true, row order must match. Defaults to false. */
    ordered?: boolean;
  };
  /** Compare the learner's result set against the result of running
   *  `solutionSql` (provided at the card level). Default ordering
   *  applies (order-independent). Use `ordered` to enforce row
   *  ordering. */
  matchesSolution?: boolean;
  /** When `matchesSolution` is true, require row ordering to match. */
  ordered?: boolean;
  /** Run this SQL after the learner's SQL and check the result. Useful
   *  for INSERT/UPDATE/DELETE exercises ("how many rows are in
   *  `orders` now?"). */
  runAfterSql?: string;
  /** Required scalar value of the first cell returned by
   *  `runAfterSql`. */
  runAfterEquals?: unknown;
  /** Required row count of the `runAfterSql` result. */
  runAfterRowCount?: number;
}

/** Human-readable, one-check-per-line summary of a SQL test's
 *  declarative expectations, shown by the test-details popover where a
 *  code-based test would show its code. */
export function sqlTestChecksSummary(t: SqlChallengeTest): string {
  const lines: string[] = [];
  if (t.expectedRowCount !== undefined)
    lines.push(`row count = ${t.expectedRowCount}`);
  if (t.rowCountAtLeast !== undefined)
    lines.push(`row count >= ${t.rowCountAtLeast}`);
  if (t.expectedColumns)
    lines.push(`columns = [${t.expectedColumns.join(", ")}]`);
  if (t.expectedColumnsInclude)
    lines.push(`columns include [${t.expectedColumnsInclude.join(", ")}]`);
  if (t.expectedRows)
    lines.push(
      `rows equal the expected values${t.expectedRows.ordered ? " (in order)" : ""}`,
    );
  if (t.matchesSolution)
    lines.push(
      `result matches the reference solution${t.ordered ? " (in order)" : ""}`,
    );
  if (t.runAfterSql) lines.push(`after your SQL, run:\n${t.runAfterSql.trim()}`);
  if (t.runAfterEquals !== undefined)
    lines.push(`…its first cell = ${JSON.stringify(t.runAfterEquals)}`);
  if (t.runAfterRowCount !== undefined)
    lines.push(`…its row count = ${t.runAfterRowCount}`);
  return lines.join("\n");
}

export interface SqlEngineLike {
  exec: (sql: string) => Promise<SqlResult[]>;
  /** Optional: detach any worker / connection so component unmount
   *  doesn't leak background threads. */
  destroy?: () => Promise<void>;
  /** Display name for the topbar. */
  label: string;
  /** Engine version (e.g. "3.53"). */
  version: string;
}

// ─── Result-set comparison helpers ────────────────────────────────────

function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  // Coerce numeric strings to numbers and vice versa, PGlite tends to
  // return numeric-typed columns as JS numbers while sqlite-wasm
  // returns them as strings for INTEGER columns wider than 2^53. For a
  // learner-facing test framework, treating "42" and 42 as equal is
  // the principle of least surprise. Blank strings are excluded,
  // Number("") is 0, which would make '' compare equal to 0.
  if (typeof a === "number" && typeof b === "string") {
    return b.trim() !== "" && Number(b) === a;
  }
  if (typeof a === "string" && typeof b === "number") {
    return a.trim() !== "" && Number(a) === b;
  }
  if (typeof a === "bigint" || typeof b === "bigint") {
    return String(a) === String(b);
  }
  return false;
}

function rowEquals(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!valueEquals(a[i], b[i])) return false;
  }
  return true;
}

function compareRowSets(
  actual: unknown[][],
  expected: unknown[][],
  ordered: boolean,
): { equal: true } | { equal: false; reason: string } {
  if (actual.length !== expected.length) {
    return {
      equal: false,
      reason: `Expected ${expected.length} row(s), got ${actual.length}.`,
    };
  }
  if (ordered) {
    for (let i = 0; i < expected.length; i++) {
      if (!rowEquals(actual[i], expected[i])) {
        return {
          equal: false,
          reason: `Row ${i + 1} mismatch.\n  expected: ${formatRow(expected[i])}\n  got:      ${formatRow(actual[i])}`,
        };
      }
    }
    return { equal: true };
  }
  // Order-independent: greedy match each actual row to a not-yet-used
  // expected row. n^2 in the row count, fine for teaching-scale
  // result sets (under ~1000 rows).
  const used = new Array(expected.length).fill(false);
  for (const aRow of actual) {
    let matched = false;
    for (let j = 0; j < expected.length; j++) {
      if (used[j]) continue;
      if (rowEquals(aRow, expected[j])) {
        used[j] = true;
        matched = true;
        break;
      }
    }
    if (!matched) {
      return {
        equal: false,
        reason: `Row not found in expected set: ${formatRow(aRow)}`,
      };
    }
  }
  return { equal: true };
}

function formatRow(row: unknown[]): string {
  return "[" + row.map(formatValue).join(", ") + "]";
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "string") return JSON.stringify(v);
  if (v instanceof Uint8Array) return `<${v.byteLength} bytes>`;
  return String(v);
}

export interface TestEvaluationContext {
  engine: SqlEngineLike;
  finalResult: SqlResult | null;
  solutionResult: SqlResult | null;
}

export async function evaluateSqlTest(
  test: SqlChallengeTest,
  ctx: TestEvaluationContext,
): Promise<{ pass: boolean; detail: string | null }> {
  const r = ctx.finalResult;

  if (test.expectedRowCount !== undefined) {
    if (!r) return fail("No result set produced, did your query SELECT something?");
    if (r.values.length !== test.expectedRowCount) {
      return fail(
        `Expected ${test.expectedRowCount} row(s), got ${r.values.length}.`,
      );
    }
  }
  if (test.rowCountAtLeast !== undefined) {
    if (!r) return fail("No result set produced.");
    if (r.values.length < test.rowCountAtLeast) {
      return fail(
        `Expected at least ${test.rowCountAtLeast} row(s), got ${r.values.length}.`,
      );
    }
  }
  if (test.expectedColumns !== undefined) {
    if (!r) return fail("No result set produced.");
    if (
      r.columns.length !== test.expectedColumns.length ||
      !test.expectedColumns.every((c, i) => c === r.columns[i])
    ) {
      return fail(
        `Expected columns ${formatRow(test.expectedColumns)}, got ${formatRow(r.columns)}.`,
      );
    }
  }
  if (test.expectedColumnsInclude !== undefined) {
    if (!r) return fail("No result set produced.");
    const have = new Set(r.columns);
    for (const c of test.expectedColumnsInclude) {
      if (!have.has(c)) {
        return fail(`Missing column: ${JSON.stringify(c)}.`);
      }
    }
  }
  if (test.expectedRows !== undefined) {
    if (!r) return fail("No result set produced.");
    if (test.expectedRows.columns) {
      const cols = test.expectedRows.columns;
      if (
        r.columns.length !== cols.length ||
        !cols.every((c, i) => c === r.columns[i])
      ) {
        return fail(
          `Expected columns ${formatRow(cols)}, got ${formatRow(r.columns)}.`,
        );
      }
    }
    const cmp = compareRowSets(
      r.values,
      test.expectedRows.values,
      test.expectedRows.ordered === true,
    );
    if (!cmp.equal) return fail(cmp.reason);
  }
  if (test.matchesSolution) {
    if (!r) return fail("No result set produced.");
    if (!ctx.solutionResult) {
      return fail(
        "matchesSolution was requested but no solution result is available.",
      );
    }
    const cmp = compareRowSets(
      r.values,
      ctx.solutionResult.values,
      test.ordered === true,
    );
    if (!cmp.equal) return fail(cmp.reason);
  }
  if (test.runAfterSql !== undefined) {
    let after: SqlResult[];
    try {
      after = await ctx.engine.exec(test.runAfterSql);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return fail(`Follow-up query failed: ${msg}`);
    }
    const last = after[after.length - 1] ?? null;
    if (test.runAfterRowCount !== undefined) {
      if (!last) return fail("Follow-up query produced no result set.");
      if (last.values.length !== test.runAfterRowCount) {
        return fail(
          `Expected ${test.runAfterRowCount} row(s) from follow-up query, got ${last.values.length}.`,
        );
      }
    }
    if (test.runAfterEquals !== undefined) {
      if (!last || last.values.length === 0 || last.values[0].length === 0) {
        return fail("Follow-up query produced no scalar value.");
      }
      const got = last.values[0][0];
      if (!valueEquals(got, test.runAfterEquals)) {
        return fail(
          `Expected first cell of follow-up to equal ${formatValue(test.runAfterEquals)}, got ${formatValue(got)}.`,
        );
      }
    }
  }
  return { pass: true, detail: null };
}

function fail(detail: string) {
  return { pass: false, detail };
}
