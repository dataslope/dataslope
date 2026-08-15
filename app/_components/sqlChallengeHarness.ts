/**
 * The declarative test language `<SqlChallengeCard>` grades against, and its
 * evaluator. Also imported by `scripts/check-sql-blocks.mjs` so content is
 * graded by the exact code a reader's Check Answer runs — a second grader
 * copy would drift and silently pass cards it should fail. Pure and
 * engine-agnostic: the caller supplies `SqlEngineLike` (sqlite-wasm or
 * PGlite). SqlChallengeCard.tsx re-exports these types.
 */
/** Supported SQL dialects; each maps to a distinct WASM runtime. */
export type SqlDialect = "sqlite" | "duckdb" | "postgres";

/** Result-set shape mirroring sqlite-wasm's `QueryExecResult`, typed locally
 *  to avoid depending on the larger sqlite-wasm surface. */
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
  /** Result set must include these column names (any order, extras allowed). */
  expectedColumnsInclude?: string[];
  /** Exact row values to match (defaults to order-independent). */
  expectedRows?: {
    columns?: string[];
    values: unknown[][];
    /** When true, row order must match. Defaults to false. */
    ordered?: boolean;
  };
  /** Compare against the card-level `solutionSql` result (order-independent
   *  unless `ordered`). */
  matchesSolution?: boolean;
  /** When `matchesSolution` is true, require row ordering to match. */
  ordered?: boolean;
  /** SQL run after the learner's SQL, for INSERT/UPDATE/DELETE exercises. */
  runAfterSql?: string;
  /** Required first-cell scalar of the `runAfterSql` result. */
  runAfterEquals?: unknown;
  /** Required row count of the `runAfterSql` result. */
  runAfterRowCount?: number;
}

/** One-check-per-line summary of a SQL test, for the test-details popover. */
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
  /** Detach any worker/connection so unmount doesn't leak threads. */
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
  // Treat "42" and 42 as equal: PGlite returns numbers where sqlite-wasm may
  // return strings. Blank strings are excluded — Number("") is 0, which would
  // make '' equal 0.
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
  // Order-independent: greedy-match each actual row to an unused expected
  // row. O(n^2), fine for teaching-scale result sets.
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
