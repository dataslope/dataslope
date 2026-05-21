"use client";

/**
 * `SqlChallengeCard` — the SQL counterpart to `<ChallengeCard>`.
 *
 * Why a separate component? SQL exercises don't fit the
 * "interpreter-with-stdout" model used by Python / JS / R: there is no
 * `print()` to inspect; the natural artefact is a result set returned
 * by the user's SELECT. Tests check that result set's shape (row
 * count, columns, exact values) — not stdout.
 *
 * Supported dialects: SQLite (via `@sqlite.org/sqlite-wasm`), DuckDB
 * (via `@duckdb/duckdb-wasm`), and PostgreSQL (via PGlite). All run
 * entirely in the browser — there is no server-side execution.
 *
 * Lifecycle:
 *   1. On first user action, lazy-instantiate the engine for the
 *      requested dialect, then `loadBlankDatabase()` + run `initSql` to
 *      seed the exercise's schema and data.
 *   2. "Run" executes the learner's SQL and renders the last result
 *      set (or affected-row count for DML).
 *   3. "Check Answer" runs the learner's SQL, then evaluates every
 *      `SqlChallengeTest` against the captured result + the live
 *      engine (for follow-up state checks like `runAfterSql`).
 *
 * Visual chrome is shared with `ChallengeCard.module.css` so the two
 * components feel like one product.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Box, RotateCcw, Check, X, ChevronDown, Clock, Database } from "lucide-react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers as lineNumbersExt,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  dropCursor,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { themeFor } from "./cmExtensions";
import styles from "./ChallengeCard.module.css";

// ─── Types ────────────────────────────────────────────────────────────

/** Supported SQL dialects. Each maps to a distinct WASM runtime in
 *  this codebase. */
export type SqlDialect = "sqlite" | "duckdb" | "postgres";

/** Generic result-set shape. Mirrors `QueryExecResult` from
 *  sqlite-wasm so existing playground helpers can be reused without
 *  glue — but typed locally so this module doesn't depend on the
 *  larger sqlite-wasm surface. */
export interface SqlResult {
  columns: string[];
  values: unknown[][];
}

export interface SqlChallengeTest {
  id: string;
  name: string;
  description: string;
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

export interface SqlChallengeCardProps {
  dialect: SqlDialect;
  title: string;
  badge?: string;
  category?: string;
  estimatedTime?: string;
  instructions: React.ReactNode;
  hint?: React.ReactNode;
  /** Setup SQL run once before the learner's first execution. Creates
   *  tables, populates seed data, etc. Replaces DataCamp's
   *  `pre-exercise-code` block. */
  initSql?: string;
  /** Starter SQL shown in the editor. */
  initialCode: string;
  /** Canonical reference solution. When provided, a "Show Solution"
   *  button appears in the toolbar; tests can also reference it via
   *  `matchesSolution: true`. */
  solutionSql?: string;
  /** Per-assertion tests evaluated after the learner runs their SQL. */
  tests: SqlChallengeTest[];
}

// ─── Engine adapter ───────────────────────────────────────────────────

interface SqlEngineLike {
  exec: (sql: string) => Promise<SqlResult[]>;
  /** Optional: detach any worker / connection so component unmount
   *  doesn't leak background threads. */
  destroy?: () => Promise<void>;
  /** Display name for the topbar. */
  label: string;
  /** Engine version (e.g. "3.53"). */
  version: string;
}

async function createSqliteChallengeEngine(): Promise<SqlEngineLike> {
  const { createSqliteEngineInProcess } = await import("./runtime/sqlite-core");
  const engine = await createSqliteEngineInProcess("__challenge__");
  await engine.loadBlankDatabase();
  return {
    exec: async (sql: string) => {
      const results = await engine.execAll(sql);
      // execAll returns null for non-SELECT statements; normalise into
      // the shared SqlResult shape with empty columns/values.
      return results.map((r) =>
        r === null ? { columns: [], values: [] } : { columns: r.columns, values: r.values },
      );
    },
    label: "SQLite",
    version: "3.x",
  };
}

async function createDuckDbChallengeEngine(): Promise<SqlEngineLike> {
  const { createDuckDbEngine } = await import("./runtime/duckdb");
  const engine = await createDuckDbEngine("blank");
  return {
    exec: async (sql: string) => {
      const results = await engine.exec(sql);
      return results.map((r) =>
        r === null ? { columns: [], values: [] } : { columns: r.columns, values: r.values },
      );
    },
    destroy: () => engine.destroy(),
    label: "DuckDB",
    version: engine.runtimeVersion(),
  };
}

async function createPostgresChallengeEngine(): Promise<SqlEngineLike> {
  const { createPostgresEngine } = await import("./runtime/postgres");
  const engine = await createPostgresEngine("blank");
  return {
    exec: async (sql: string) => {
      const results = await engine.exec(sql);
      return results.map((r) =>
        r === null ? { columns: [], values: [] } : { columns: r.columns, values: r.values },
      );
    },
    label: "PostgreSQL",
    version: "via PGlite",
  };
}

function createEngineForDialect(dialect: SqlDialect): Promise<SqlEngineLike> {
  switch (dialect) {
    case "sqlite":
      return createSqliteChallengeEngine();
    case "duckdb":
      return createDuckDbChallengeEngine();
    case "postgres":
      return createPostgresChallengeEngine();
  }
}

// ─── Result-set comparison helpers ────────────────────────────────────

function valueEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  // Coerce numeric strings to numbers and vice versa — PGlite tends to
  // return numeric-typed columns as JS numbers while sqlite-wasm
  // returns them as strings for INTEGER columns wider than 2^53. For a
  // learner-facing test framework, treating "42" and 42 as equal is
  // the principle of least surprise.
  if (typeof a === "number" && typeof b === "string") {
    return Number(b) === a;
  }
  if (typeof a === "string" && typeof b === "number") {
    return Number(a) === b;
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
  // expected row. n^2 in the row count — fine for teaching-scale
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

interface TestEvaluationContext {
  engine: SqlEngineLike;
  finalResult: SqlResult | null;
  solutionResult: SqlResult | null;
}

async function evaluateSqlTest(
  test: SqlChallengeTest,
  ctx: TestEvaluationContext,
): Promise<{ pass: boolean; detail: string | null }> {
  const r = ctx.finalResult;

  if (test.expectedRowCount !== undefined) {
    if (!r) return fail("No result set produced — did your query SELECT something?");
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

// ─── Component ────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "ready" | "running" | "error";
type TestState = "pending" | "pass" | "fail";

interface DisplayedTest {
  id: string;
  name: string;
  description: string;
  state: TestState;
  detail: string | null;
}

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod/.test(platform) || /Macintosh/.test(ua);
}

const CM_EDITOR_THEME = "idea";

function useBlockId(dialect: SqlDialect): string {
  const reactId = useId();
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < reactId.length; i++) {
      h = (h * 31 + reactId.charCodeAt(i)) >>> 0;
    }
    const suffix = h.toString(16).slice(0, 4).padStart(4, "0");
    const prefix =
      dialect === "sqlite"
        ? "Sqlite"
        : dialect === "duckdb"
          ? "DuckDb"
          : "Postgres";
    return `${prefix}Block-${suffix}`;
  }, [reactId, dialect]);
}

function CopyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden>
      <path d="M2 1l9 5-9 5V1z" fill="currentColor" />
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default function SqlChallengeCard({
  dialect,
  title,
  badge = "SQL Challenge",
  category,
  estimatedTime,
  instructions,
  hint,
  initSql,
  initialCode,
  solutionSql,
  tests,
}: SqlChallengeCardProps) {
  const blockId = useBlockId(dialect);

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const solutionEditorHostRef = useRef<HTMLDivElement | null>(null);
  const solutionEditorRef = useRef<EditorView | null>(null);

  // Each card owns its own engine instance — sharing across cards
  // would let one challenge's CREATE TABLE leak into another's
  // checks. The promise (not the resolved engine) is cached so two
  // near-simultaneous clicks share a single boot.
  const enginePromiseRef = useRef<Promise<SqlEngineLike> | null>(null);
  const engineSeededRef = useRef(false);
  const runSeqRef = useRef(0);
  const runRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [resultSet, setResultSet] = useState<SqlResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [resultError, setResultError] = useState<string>("");
  const [elapsed, setElapsed] = useState<string>("");
  const [hintOpen, setHintOpen] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);
  const [engineLabel, setEngineLabel] = useState<string>(
    dialect === "sqlite"
      ? "SQLite"
      : dialect === "duckdb"
        ? "DuckDB"
        : "PostgreSQL",
  );

  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  const canCheck = tests.length > 0;

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();

    const view = new EditorView({
      doc: initialCode,
      parent: editorHostRef.current,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        lineNumbersExt(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        EditorView.lineWrapping,
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              runRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        languageComp.of([]),
        themeComp.of(themeFor(CM_EDITOR_THEME)),
      ],
    });
    editorRef.current = view;

    void (async () => {
      try {
        const { sql } = await import("@codemirror/lang-sql");
        if (editorRef.current === view) {
          view.dispatch({ effects: languageComp.reconfigure(sql()) });
        }
      } catch {
        // SQL language extension is optional — editor still works
        // without syntax highlighting.
      }
    })();

    return () => {
      view.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount the read-only solution editor lazily when the modal opens.
  useEffect(() => {
    if (!solutionOpen || !solutionSql) return;
    if (!solutionEditorHostRef.current || solutionEditorRef.current) return;
    const languageComp = new Compartment();
    const view = new EditorView({
      doc: solutionSql,
      parent: solutionEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        EditorView.lineWrapping,
        languageComp.of([]),
        themeFor(CM_EDITOR_THEME),
      ],
    });
    solutionEditorRef.current = view;
    void (async () => {
      try {
        const { sql } = await import("@codemirror/lang-sql");
        if (solutionEditorRef.current === view) {
          view.dispatch({ effects: languageComp.reconfigure(sql()) });
        }
      } catch {
        /* see above */
      }
    })();
    return () => {
      view.destroy();
      solutionEditorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionOpen]);

  // Clean up the engine on unmount so workers don't leak. The ref is
  // a counter we mutate (not a DOM node we read), so the standard
  // exhaustive-deps caveat about stale ref values doesn't apply.
  useEffect(() => {
    return () => {
      runSeqRef.current = runSeqRef.current + 1;
      const p = enginePromiseRef.current;
      if (p) {
        void p
          .then((e) => e.destroy?.())
          .catch(() => {
            /* engine never finished initialising; nothing to clean up */
          });
      }
    };
  }, []);

  // ─── Engine bootstrap ───────────────────────────────────────────────
  const ensureEngine = useCallback(async (): Promise<SqlEngineLike> => {
    if (!enginePromiseRef.current) {
      enginePromiseRef.current = createEngineForDialect(dialect).catch((err) => {
        // Don't poison the cache with a failed init — let the next
        // attempt try again.
        enginePromiseRef.current = null;
        throw err;
      });
    }
    const engine = await enginePromiseRef.current;
    if (!engineSeededRef.current) {
      engineSeededRef.current = true;
      setEngineLabel(`${engine.label} ${engine.version}`.trim());
      if (initSql && initSql.trim()) {
        await engine.exec(initSql);
      }
    }
    return engine;
  }, [dialect, initSql]);

  // ─── Execution ──────────────────────────────────────────────────────
  /**
   * Run the user's SQL against the seeded engine. Returns the last
   * result set produced (or `null` for DML-only batches), along with
   * how long the SQL took to run. Throws on syntax / runtime errors so
   * callers can surface them in the UI.
   */
  const executeSql = useCallback(
    async (
      sql: string,
    ): Promise<{
      results: SqlResult[];
      last: SqlResult | null;
      elapsedMs: number;
    }> => {
      const mySeq = ++runSeqRef.current;
      setStatus("loading");
      setStatusMessage("Initializing database…");
      const engine = await ensureEngine();
      if (runSeqRef.current !== mySeq) {
        return { results: [], last: null, elapsedMs: 0 };
      }
      setStatus("running");
      setStatusMessage("Running…");
      const startedAt = performance.now();
      const results = await engine.exec(sql);
      const elapsedMs = performance.now() - startedAt;
      // The "last meaningful result" is the last result set with
      // columns. DML statements come back with empty columns so they
      // shouldn't shadow a preceding SELECT — but if the user only ran
      // DML, we still want to show *something*.
      let last: SqlResult | null = null;
      for (const r of results) {
        if (r.columns.length > 0) last = r;
      }
      if (!last && results.length > 0) last = results[results.length - 1];
      return { results, last, elapsedMs };
    },
    [ensureEngine],
  );

  const formatElapsed = (ms: number) =>
    ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

  // ─── Run (no tests) ─────────────────────────────────────────────────
  const run = useCallback(async () => {
    const userSql = editorRef.current?.state.doc.toString() ?? "";
    setTestResults([]);
    setBannerState(null);
    setResultError("");
    setResultMessage("");
    try {
      const { results, last, elapsedMs } = await executeSql(userSql);
      setElapsed(formatElapsed(elapsedMs));
      setResultSet(last);
      if (!last || last.columns.length === 0) {
        const dml = results.length;
        setResultMessage(
          dml === 0
            ? "Query ran successfully (no result set)."
            : `${dml} statement${dml === 1 ? "" : "s"} executed (no result set).`,
        );
      } else {
        setResultMessage("");
      }
      setStatus("ready");
      setStatusMessage("Done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResultSet(null);
      setResultError(message);
      setStatus("error");
      setStatusMessage(message);
    }
  }, [executeSql]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    const userSql = editorRef.current?.state.doc.toString() ?? "";

    setTestResults(
      tests.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        state: "pending",
        detail: null,
      })),
    );
    setBannerState(null);
    setTestListOpen(true);
    setResultError("");
    setResultMessage("");

    let engine: SqlEngineLike;
    try {
      engine = await ensureEngine();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setStatusMessage(message);
      setResultError(message);
      setTestResults((prev) =>
        prev.map((t) => ({
          ...t,
          state: "fail",
          detail: "Database failed to initialise.",
        })),
      );
      setBannerState("fail");
      return;
    }

    // Run the learner's SQL first, capturing the final result set.
    let last: SqlResult | null = null;
    let elapsedMs = 0;
    try {
      const out = await executeSql(userSql);
      last = out.last;
      elapsedMs = out.elapsedMs;
      setElapsed(formatElapsed(elapsedMs));
      setResultSet(last);
      if (!last || last.columns.length === 0) {
        setResultMessage(
          out.results.length === 0
            ? "Query ran successfully (no result set)."
            : `${out.results.length} statement(s) executed (no result set).`,
        );
      } else {
        setResultMessage("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResultError(message);
      setStatus("error");
      setStatusMessage(message);
      setTestResults((prev) =>
        prev.map((t) => ({
          ...t,
          state: "fail",
          detail: `SQL error: ${message}`,
        })),
      );
      setBannerState("fail");
      return;
    }

    // Run the reference solution (if any test asks for it) against the
    // SAME engine. Because tests may want to inspect post-DML state,
    // we evaluate `runAfterSql` BEFORE running the solution so the
    // learner's mutations are still visible. The solution SELECT
    // shouldn't mutate state — and if it did, every test's expectation
    // would be against the solution-mutated state, which would be a
    // bug in the exercise authoring anyway.
    let solutionResult: SqlResult | null = null;
    const wantsSolution = tests.some((t) => t.matchesSolution);
    if (wantsSolution) {
      if (!solutionSql) {
        setTestResults(
          tests.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            state: "fail" as TestState,
            detail: t.matchesSolution
              ? "Test requires matchesSolution but no solutionSql is defined on the card."
              : null,
          })),
        );
        setBannerState("fail");
        return;
      }
      try {
        const out = await engine.exec(solutionSql);
        for (const r of out) {
          if (r.columns.length > 0) solutionResult = r;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTestResults(
          tests.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            state: "fail" as TestState,
            detail: t.matchesSolution
              ? `Reference solution failed: ${msg}`
              : null,
          })),
        );
        setBannerState("fail");
        return;
      }
    }

    // Evaluate every test against the captured state.
    const displayed: DisplayedTest[] = [];
    for (const t of tests) {
      try {
        const res = await evaluateSqlTest(t, {
          engine,
          finalResult: last,
          solutionResult,
        });
        displayed.push({
          id: t.id,
          name: t.name,
          description: t.description,
          state: res.pass ? "pass" : "fail",
          detail: res.detail,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        displayed.push({
          id: t.id,
          name: t.name,
          description: t.description,
          state: "fail",
          detail: `Test raised an error: ${msg}`,
        });
      }
    }
    setTestResults(displayed);
    const passed = displayed.filter((d) => d.state === "pass").length;
    const allPass = passed === displayed.length && displayed.length > 0;
    setBannerState(allPass ? "pass" : "fail");
    setStatus("ready");
    setStatusMessage(
      allPass ? "All tests passed" : `${passed}/${displayed.length} passed`,
    );
  }, [canCheck, ensureEngine, executeSql, solutionSql, tests]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // ─── Reset ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
    setResultSet(null);
    setResultError("");
    setResultMessage("");
    setElapsed("");
    setStatus("idle");
    setStatusMessage("");
    setTestResults([]);
    setBannerState(null);
  }, [initialCode]);

  const copyCode = useCallback(async () => {
    const code = editorRef.current?.state.doc.toString() ?? "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      /* clipboard permission may be unavailable; silent fallback */
    }
  }, []);

  const isBusy = status === "loading" || status === "running";
  const passedCount = testResults.filter((t) => t.state === "pass").length;
  const totalTests = testResults.length;
  const allPassed = totalTests > 0 && passedCount === totalTests;
  const summaryState: TestState = allPassed
    ? "pass"
    : testResults.some((t) => t.state === "pending")
      ? "pending"
      : totalTests > 0
        ? "fail"
        : "pending";

  return (
    <div
      className={styles.card}
      aria-label={`SQL coding challenge: ${title}`}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} /> {badge}
        </div>
        <div className={styles.titleArea}>
          <div className={styles.title}>{title}</div>
          <div className={styles.meta}>
            {estimatedTime && (
              <span className={styles.metaPill}>
                <Clock size={11} aria-hidden />
                {estimatedTime}
              </span>
            )}
            {estimatedTime && category && (
              <span className={styles.metaSep}>·</span>
            )}
            {category && <span>{category}</span>}
          </div>
        </div>
        <div className={styles.statusArea}>
          {totalTests > 0 && bannerState !== null ? (
            allPassed ? (
              <div className={styles.statusPass}>
                <Check size={14} strokeWidth={2.5} aria-hidden />
                Passed
              </div>
            ) : (
              <div className={styles.statusPending}>
                <span className={styles.statusPendingCount}>
                  {passedCount}/{totalTests}
                </span>
                <span className={styles.statusPendingLabel}>tests</span>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* ── Instructions ── */}
      <div className={styles.instructions}>
        <div className={styles.instructionsLabel}>Instructions</div>
        <div className={styles.instructionsBody}>{instructions}</div>
        {hint && (
          <>
            <button
              type="button"
              className={styles.hintToggle}
              onClick={() => setHintOpen((v) => !v)}
              aria-expanded={hintOpen}
            >
              <HelpIcon />
              {hintOpen ? "Hide hint" : "Show hint"}
            </button>
            {hintOpen && <div className={styles.hintBox}>{hint}</div>}
          </>
        )}
      </div>

      {/* ── Topbar ── */}
      <div className={styles.topbar}>
        <span className={styles.blockId}>
          <Box size={13} aria-hidden /> {blockId}
        </span>
        <span className={styles.topbarDivider} aria-hidden />
        <span className={styles.dialectBadge}>{dialect.toUpperCase()}</span>
        <span className={styles.runtimeLabel}>
          <Database size={14} aria-hidden />
          {engineLabel}
        </span>
        <span
          className={styles.statusDot}
          data-status={status}
          title={statusMessage || status}
          aria-label={statusMessage || status}
        />
      </div>

      {/* ── Editor ── */}
      <div
        className={styles.editor}
        ref={editorHostRef}
        aria-label="SQL solution editor"
      />

      {/* ── Toolbar ── */}
      <div className={styles.toolbar} role="toolbar" aria-label="Challenge controls">
        <button
          type="button"
          className={styles.runBtn}
          onClick={() => void run()}
          disabled={isBusy}
        >
          {isBusy ? (
            <svg
              viewBox="0 0 12 12"
              className={styles.runBtnSpinner}
              aria-hidden
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="14 8"
              />
            </svg>
          ) : (
            <PlayIcon />
          )}
          <span>{isBusy ? "Running…" : "Run"}</span>
        </button>
        {!isBusy && (
          <span
            className={styles.kbdHint}
            title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
          >
            <kbd className={styles.kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
            <span className={styles.kbdPlus} aria-hidden>+</span>
            <kbd className={styles.kbd}>Enter</kbd>
          </span>
        )}
        <button
          type="button"
          className={styles.resetBtn}
          onClick={reset}
          disabled={isBusy}
        >
          <RotateCcw size={12} strokeWidth={2.4} aria-hidden />
          Reset
        </button>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => void copyCode()}
          title="Copy code"
          aria-label="Copy code"
        >
          <CopyIcon />
        </button>
        {solutionSql && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => setSolutionOpen(true)}
            disabled={isBusy}
          >
            Show Solution
          </button>
        )}
        <span className={styles.toolbarSpacer} />
        {canCheck && (
          <button
            type="button"
            className={styles.checkBtn}
            onClick={() => void check()}
            disabled={isBusy}
          >
            <Check size={12} strokeWidth={2.5} aria-hidden />
            Check Answer
          </button>
        )}
      </div>

      {/* ── Result panel ── */}
      {(resultSet || resultMessage || resultError || isBusy) && (
        <div className={styles.sqlResultPanel} aria-live="polite">
          <div className={styles.sqlResultHeader}>
            <div
              className={styles.accentBar}
              data-error={resultError.length > 0}
            />
            <span className={styles.sqlResultLabel}>Result</span>
            {resultSet && resultSet.columns.length > 0 && (
              <span className={styles.sqlResultCount}>
                {resultSet.values.length} row{resultSet.values.length === 1 ? "" : "s"}
                {elapsed ? ` · ${elapsed}` : ""}
              </span>
            )}
            {(!resultSet || resultSet.columns.length === 0) && elapsed && (
              <span className={styles.sqlResultCount}>{elapsed}</span>
            )}
          </div>
          {resultError ? (
            <div className={styles.sqlMessage} style={{ color: "var(--ch-red)" }}>
              {resultError}
            </div>
          ) : resultSet && resultSet.columns.length > 0 ? (
            resultSet.values.length === 0 ? (
              <div className={styles.sqlEmptyResult}>
                Query returned no rows.
              </div>
            ) : (
              <div className={styles.sqlResultScroll}>
                <table className={styles.sqlResultTable}>
                  <thead>
                    <tr>
                      {resultSet.columns.map((c, i) => (
                        <th key={i}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultSet.values.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci}>
                            {cell === null || cell === undefined ? (
                              <span className={styles.sqlNullValue}>NULL</span>
                            ) : cell instanceof Uint8Array ? (
                              `<${cell.byteLength} bytes>`
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : resultMessage ? (
            <div className={styles.sqlMessage}>{resultMessage}</div>
          ) : (
            <div className={styles.sqlMessage}>Running…</div>
          )}
        </div>
      )}

      {/* ── Test results ── */}
      {testResults.length > 0 && (
        <div className={styles.testPanel}>
          <button
            type="button"
            className={styles.testPanelHeader}
            onClick={() => setTestListOpen((v) => !v)}
            aria-expanded={testListOpen}
          >
            <span className={styles.testLabel}>Test Results</span>
            <div className={styles.testSummary}>
              <span className={styles.testPill} data-state={summaryState}>
                {summaryState === "pending" ? (
                  "Running…"
                ) : summaryState === "pass" ? (
                  <>
                    <Check size={10} strokeWidth={3} aria-hidden /> {passedCount}/{totalTests} passed
                  </>
                ) : (
                  <>
                    <X size={10} strokeWidth={3} aria-hidden /> {passedCount}/{totalTests} passed
                  </>
                )}
              </span>
            </div>
            <ChevronDown
              size={14}
              aria-hidden
              className={`${styles.testChevron} ${
                testListOpen ? styles.testChevronOpen : ""
              }`}
            />
          </button>
          {testListOpen && (
            <div className={styles.testList}>
              {testResults.map((t) => (
                <div key={t.id} className={styles.testItem}>
                  <div className={styles.testIcon} data-state={t.state}>
                    {t.state === "pass" ? (
                      <Check size={9} strokeWidth={3} aria-hidden />
                    ) : t.state === "fail" ? (
                      <X size={9} strokeWidth={3} aria-hidden />
                    ) : (
                      <svg
                        width="9"
                        height="9"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="5" />
                      </svg>
                    )}
                  </div>
                  <div className={styles.testItemBody}>
                    <div className={styles.testItemName}>{t.name}</div>
                    <div className={styles.testItemDesc}>{t.description}</div>
                    {t.state === "fail" && t.detail && (
                      <div className={styles.testItemDetail}>{t.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Banner ── */}
      {bannerState && (
        <div className={styles.banner} data-state={bannerState}>
          <div className={styles.bannerIcon}>
            {bannerState === "pass" ? (
              <Check size={14} strokeWidth={2.5} aria-hidden />
            ) : (
              <X size={14} strokeWidth={2.5} aria-hidden />
            )}
          </div>
          {bannerState === "pass" ? (
            <span>
              All tests passed!{" "}
              <span className={styles.bannerSub}>
                Great work — your solution is correct.
              </span>
            </span>
          ) : (
            <span>
              {totalTests - passedCount} test
              {totalTests - passedCount === 1 ? "" : "s"} failed{" "}
              <span className={styles.bannerSub}>
                — review the details and try again.
              </span>
            </span>
          )}
        </div>
      )}

      {/* ── Solution modal ── */}
      {solutionOpen && solutionSql && (
        <SolutionModal
          onClose={() => setSolutionOpen(false)}
          editorHostRef={solutionEditorHostRef}
        />
      )}
    </div>
  );
}

function SolutionModal({
  onClose,
  editorHostRef,
}: {
  onClose: () => void;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Trap-free modal: click on backdrop to close, Esc to close. Small
  // surface — no focus management beyond what the underlying editor
  // provides — because the alternative (a full dialog framework) is
  // disproportionate for a read-only code viewer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reference solution"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "720px",
          width: "100%",
          maxHeight: "80vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className={styles.header} style={{ borderBottom: "1px solid var(--ch-border-light)" }}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} /> Solution
          </div>
          <div className={styles.titleArea}>
            <div className={styles.title}>Reference solution</div>
            <div className={styles.meta}>
              <span>One valid answer — there may be others.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={styles.copyBtn}
            style={{ marginLeft: "auto" }}
          >
            <X size={14} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
        <div
          ref={editorHostRef}
          className={styles.editor}
          style={{ flex: 1, overflow: "auto" }}
          aria-label="Solution editor (read-only)"
        />
      </div>
    </div>
  );
}
