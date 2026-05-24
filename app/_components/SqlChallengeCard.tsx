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
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { RotateCcw, Check, X, ChevronDown, Eye, Play, Database } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import {
  CopyIcon,
  PlayIcon,
  FormatIcon,
  renderInstructions,
  useChallengeToasts,
  ChallengeToastViewport,
  useIsDark,
  cmThemeNameFor,
} from "./challengeShared";
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
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { themeFor, noActiveLine } from "./cmExtensions";
import { DUCKDB_VERSION } from "./runtime/duckdb";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
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

/** Specification for which tables the table viewer should display.
 *  When `tables` is undefined, every user table in the default schema
 *  is shown. To override, pass an array of table names or
 *  `{schema, table}` pairs. */
export type SqlTableViewerSpec =
  | string
  | { schema?: string; table: string };

export interface SqlChallengeCardProps {
  dialect: SqlDialect;
  title: string;
  badge?: string;
  /** Rendered above the editor. Pass MDX content / React elements, or a
   *  markdown string for terser authoring. Strings support paragraphs,
   *  bullet lists, **bold**, *italic*, and `inline code`. */
  instructions: React.ReactNode | string;
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
  /** Hand-picked tables (and optional schemas) to display in the table
   *  viewer. When omitted, every user table in the default schema is
   *  shown. Set to `false` to suppress the viewer entirely. */
  tables?: SqlTableViewerSpec[] | false;
  /** Maximum rows to fetch per table in the viewer. Default: 50. */
  tableRowLimit?: number;
  /** Per-assertion tests evaluated after the learner runs their SQL. */
  tests: SqlChallengeTest[];
}

/** One table entry in the viewer panel. */
interface TableViewerEntry {
  schema: string | null;
  table: string;
  result: SqlResult | null;
  error: string | null;
  truncated: boolean;
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
    version: "3.53",
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
    version: "17",
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

/** Default schema where a dialect's user tables live unless qualified
 *  otherwise. SQLite has no schema concept (we use `main`); DuckDB
 *  uses `main`; PostgreSQL uses `public`. */
function defaultSchemaFor(dialect: SqlDialect): string {
  return dialect === "postgres" ? "public" : "main";
}

/** SQL fragment that lists every user table in the default schema for
 *  a given dialect. Used by the table viewer to enumerate tables when
 *  the author didn't hand-pick a list. Returns rows of
 *  (schema, table_name). */
function listTablesSqlFor(dialect: SqlDialect): string {
  if (dialect === "sqlite") {
    return `SELECT 'main' AS schema_name, name AS table_name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`;
  }
  if (dialect === "duckdb") {
    return `SELECT table_schema AS schema_name, table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE' ORDER BY table_name;`;
  }
  return `SELECT table_schema AS schema_name, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;`;
}

/** Quote a SQL identifier with double quotes, escaping any embedded
 *  double quote. Same approach used by sqlite-core's `quoteIdent`. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Build a qualified table reference for a given dialect, quoting
 *  every component. */
function qualifiedTable(
  dialect: SqlDialect,
  schema: string | null,
  table: string,
): string {
  if (dialect === "sqlite" || !schema) return quoteIdent(table);
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
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



// Minimum time (ms) the "running" overlay is held visible after a run
// completes. Mirrors the playground's MIN_ANIMATION_MS so a fast
// query doesn't blink the wave animation in and back out within a
// single frame.
const MIN_RUN_OVERLAY_MS = 300;

/** Map a SQL dialect to the corresponding key in the shared
 *  `LANGUAGE_ICONS` registry so the SqlChallengeCard's runtime label
 *  uses the same brand glyph as the playground language switcher. */
function languageIconKeyForDialect(d: SqlDialect): string {
  return d;
}

// Sine-wave running overlay — mirrors `<CodeBlock>`'s RunOverlay so the
// SQL challenge card shows the same blue-wave hint while running/submitting.
function RunOverlay({ active }: { active: boolean }) {
  return (
    <div
      className={`${styles.runOverlay}${active ? ` ${styles.runOverlayActive}` : ""}`}
      aria-hidden="true"
    >
      <div className={styles.runGlow} />
      <svg
        className={styles.runWaves}
        viewBox="0 0 240 28"
        preserveAspectRatio="none"
      >
        <path
          className={styles.runWaveBack}
          d="M0 18 C 20 14, 40 14, 60 18 S 100 22, 120 18 S 160 14, 180 18 S 220 22, 240 18 S 280 14, 300 18 S 340 22, 360 18 S 400 14, 420 18 S 460 22, 480 18 L 480 28 L 0 28 Z"
        />
        <path
          className={styles.runWaveFront}
          d="M0 21 C 20 17, 40 17, 60 21 S 100 25, 120 21 S 160 17, 180 21 S 220 25, 240 21 S 280 17, 300 21 S 340 25, 360 21 S 400 17, 420 21 S 460 25, 480 21 L 480 28 L 0 28 Z"
        />
      </svg>
      <div className={styles.runStream} />
    </div>
  );
}

function DialectGlyph({ dialect }: { dialect: SqlDialect }) {
  const key = languageIconKeyForDialect(dialect);
  const Icon = LANGUAGE_ICONS[key];
  const color = LANGUAGE_ICON_COLORS[key];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[key] ?? 1;
  if (!Icon) return null;
  return (
    <Icon
      style={{
        color,
        width: `${Math.round(14 * factor)}px`,
        height: `${Math.round(14 * factor)}px`,
      }}
      aria-hidden
    />
  );
}

/** Map dialect → sql-formatter language identifier. PGlite is Postgres-
 *  compatible; DuckDB's grammar is largely Postgres-derived too, so
 *  reusing the postgres rules produces good results for both. */
function sqlFormatterLanguage(d: SqlDialect): "sqlite" | "postgresql" | "duckdb" {
  if (d === "sqlite") return "sqlite";
  if (d === "duckdb") return "duckdb";
  return "postgresql";
}

export default function SqlChallengeCard({
  dialect,
  title,
  badge = "SQL Challenge",
  instructions,
  initSql,
  initialCode,
  solutionSql,
  tables,
  tableRowLimit = 50,
  tests,
}: SqlChallengeCardProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const solutionEditorHostRef = useRef<HTMLDivElement | null>(null);
  const solutionEditorRef = useRef<EditorView | null>(null);
  // Theme compartments — stored so the dark/light sync effect can
  // reconfigure the CM theme without remounting the editor.
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const solutionThemeCompRef = useRef<Compartment | null>(null);
  // Debounce handle for localStorage persistence (see editor mount).
  const persistSaveTimerRef = useRef<number | null>(null);

  // Stable localStorage key for the user's SQL buffer. `dialect` is in
  // the fingerprint because the same starter SQL might mean different
  // things across engines (e.g. `RETURNING` is Postgres/SQLite but not
  // historically DuckDB), and `title` disambiguates challenges that
  // happen to share starter text.
  const persistedKey = useMemo(
    () => persistKey("sql-challenge", `${dialect}|${title}|${initialCode}`),
    [dialect, title, initialCode],
  );

  // Each card owns its own engine instance — sharing across cards
  // would let one challenge's CREATE TABLE leak into another's
  // checks. The promise (not the resolved engine) is cached so two
  // near-simultaneous clicks share a single boot.
  const enginePromiseRef = useRef<Promise<SqlEngineLike> | null>(null);
  const engineSeededRef = useRef(false);
  const runSeqRef = useRef(0);
  const runRef = useRef<() => void>(() => {});
  // Default action of the split button (Submit when canCheck,
  // otherwise plain Run). Bound to Mod-Enter from the editor's keymap.
  const submitRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  // Tracks which action triggered the in-flight run so the Submit
  // pill can show "Submitting…" vs "Running…" correctly when the
  // dropdown's "Run without Submitting" item is the trigger.
  const [activeAction, setActiveAction] = useState<"submit" | "run" | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [resultSet, setResultSet] = useState<SqlResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [resultError, setResultError] = useState<string>("");
  const [elapsed, setElapsed] = useState<string>("");
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [tableEntries, setTableEntries] = useState<TableViewerEntry[]>([]);
  const [tableViewerOpen, setTableViewerOpen] = useState(true);
  const [activeTableIdx, setActiveTableIdx] = useState(0);
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const toasts = useChallengeToasts();
  const [engineLabel, setEngineLabel] = useState<string>(
    dialect === "sqlite"
      ? "SQLite 3.53"
      : dialect === "duckdb"
        ? `DuckDB ${DUCKDB_VERSION}`
        : "PostgreSQL 17",
  );

  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  const isDark = useIsDark();
  const cmThemeName = cmThemeNameFor(isDark);
  // Ref so editor-mount effects (which have [] deps) can read the
  // current theme name without becoming stale.
  const cmThemeNameRef = useRef(cmThemeName);
  useEffect(() => {
    cmThemeNameRef.current = cmThemeName;
  });

  const canCheck = tests.length > 0;

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();

    // Restore any previously-saved SQL buffer; fall back to the MDX
    // starter when nothing is stored.
    const persisted = loadPersistedCode(persistedKey);
    const initialDoc = persisted ?? initialCode;

    const view = new EditorView({
      doc: initialDoc,
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
            // Default keyboard action mirrors the split button:
            // Submit (run + grade against tests). For challenges
            // with no tests, the submit handler short-circuits to a
            // plain Run so the keystroke isn't a dead key.
            key: "Mod-Enter",
            run: () => {
              submitRef.current();
              return true;
            },
          },
          {
            // Dropdown action: run the query without grading it,
            // matching the menu item visible from the Submit
            // button's chevron.
            key: "Mod-Shift-Enter",
            run: () => {
              runRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        languageComp.of([]),
        themeComp.of(themeFor(cmThemeNameRef.current)),
        noActiveLine,
        // Debounced persist of the user's SQL so reloads / nav restore
        // their in-progress query.
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          if (persistSaveTimerRef.current !== null)
            window.clearTimeout(persistSaveTimerRef.current);
          persistSaveTimerRef.current = window.setTimeout(() => {
            persistSaveTimerRef.current = null;
            savePersistedCode(persistedKey, update.state.doc.toString());
          }, 400);
        }),
      ],
    });
    editorRef.current = view;
    mainThemeCompRef.current = themeComp;

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
      // Flush any pending debounced save so the last keystroke survives.
      if (persistSaveTimerRef.current !== null) {
        window.clearTimeout(persistSaveTimerRef.current);
        persistSaveTimerRef.current = null;
        savePersistedCode(persistedKey, view.state.doc.toString());
      }
      view.destroy();
      editorRef.current = null;
      mainThemeCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the CodeMirror theme whenever the docs colour scheme toggles
  // (Fumadocs dark/light toggle or OS preference change).
  useEffect(() => {
    const reconfigure = (view: EditorView | null, comp: Compartment | null) => {
      if (view && comp) {
        view.dispatch({ effects: comp.reconfigure(themeFor(cmThemeName)) });
      }
    };
    reconfigure(editorRef.current, mainThemeCompRef.current);
    reconfigure(solutionEditorRef.current, solutionThemeCompRef.current);
  }, [cmThemeName]);

  // Mount the read-only solution editor lazily when the modal opens.
  // We keep the doc editable at the contenteditable level (relying on
  // `readOnly` to block insertions) so the user can click into the
  // editor and select text — including Mod-A select-all, wired via
  // the default keymap below since `editable.of(false)` would
  // otherwise disable keyboard focus and shortcuts.
  useEffect(() => {
    if (!solutionOpen || !solutionSql) return;
    if (!solutionEditorHostRef.current || solutionEditorRef.current) return;
    const languageComp = new Compartment();
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: solutionSql,
      parent: solutionEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        EditorView.lineWrapping,
        keymap.of(defaultKeymap),
        languageComp.of([]),
        themeComp.of(themeFor(cmThemeNameRef.current)),
        noActiveLine,
      ],
    });
    solutionEditorRef.current = view;
    solutionThemeCompRef.current = themeComp;
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
      solutionThemeCompRef.current = null;
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

  // ─── Table viewer ───────────────────────────────────────────────────
  const tableViewerEnabled = tables !== false;

  /** Refresh the table viewer's contents. Lists tables (either the
   *  hand-picked subset or every user table in the default schema),
   *  then runs `SELECT ... LIMIT N` against each. Errors per table are
   *  isolated so one broken entry doesn't blank the panel. */
  const refreshTableViewer = useCallback(
    async (engine: SqlEngineLike) => {
      if (!tableViewerEnabled) return;
      const defaultSchema = defaultSchemaFor(dialect);
      let plan: { schema: string | null; table: string }[];
      if (Array.isArray(tables)) {
        plan = tables.map((t) =>
          typeof t === "string"
            ? { schema: defaultSchema, table: t }
            : { schema: t.schema ?? defaultSchema, table: t.table },
        );
      } else {
        try {
          const listed = await engine.exec(listTablesSqlFor(dialect));
          const row = listed.find((r) => r.columns.length > 0);
          plan = (row?.values ?? []).map((r) => ({
            schema: String(r[0] ?? defaultSchema),
            table: String(r[1] ?? ""),
          }));
        } catch {
          plan = [];
        }
      }
      const limit = Math.max(1, Math.floor(tableRowLimit));
      const fetchLimit = limit + 1;
      const entries: TableViewerEntry[] = await Promise.all(
        plan.map(async ({ schema, table }) => {
          if (!table) {
            return {
              schema,
              table,
              result: null,
              error: "Empty table name.",
              truncated: false,
            };
          }
          try {
            const ref = qualifiedTable(dialect, schema, table);
            const out = await engine.exec(`SELECT * FROM ${ref} LIMIT ${fetchLimit};`);
            const last = out.findLast?.((r) => r.columns.length > 0) ??
              [...out].reverse().find((r) => r.columns.length > 0) ?? null;
            if (!last) {
              return { schema, table, result: null, error: null, truncated: false };
            }
            const truncated = last.values.length > limit;
            const trimmed: SqlResult = truncated
              ? { columns: last.columns, values: last.values.slice(0, limit) }
              : last;
            return { schema, table, result: trimmed, error: null, truncated };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { schema, table, result: null, error: msg, truncated: false };
          }
        }),
      );
      setTableEntries(entries);
      setActiveTableIdx((idx) =>
        entries.length === 0 ? 0 : Math.min(idx, entries.length - 1),
      );
    },
    [dialect, tableViewerEnabled, tableRowLimit, tables],
  );

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
      await refreshTableViewer(engine);
    }
    return engine;
  }, [dialect, initSql, refreshTableViewer]);

  // Eagerly boot the engine on mount so the table viewer can populate
  // before the learner clicks Run. The engine is per-card and isolated,
  // so doing this once per mount is safe.
  useEffect(() => {
    if (!tableViewerEnabled) return;
    void ensureEngine().catch(() => {
      /* surface errors via the per-table error column instead of blocking mount */
    });
  }, [ensureEngine, tableViewerEnabled]);

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
      let results: SqlResult[];
      try {
        results = await engine.exec(sql);
      } finally {
        // Hold the running overlay for at least MIN_RUN_OVERLAY_MS so
        // the wave animation doesn't blink in/out on sub-frame runs.
        // The throw path is covered here too so error states get the
        // same minimum visible duration before the caller's catch
        // swaps status to "error".
        const wait = MIN_RUN_OVERLAY_MS - (performance.now() - startedAt);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
        }
      }
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
    setActiveAction("run");
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
      if (tableViewerEnabled) {
        try {
          const engine = await ensureEngine();
          await refreshTableViewer(engine);
        } catch {
          /* viewer refresh failure shouldn't mask the run's success */
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResultSet(null);
      setResultError(message);
      setStatus("error");
      setStatusMessage(message);
    } finally {
      setActiveAction(null);
    }
  }, [executeSql, ensureEngine, refreshTableViewer, tableViewerEnabled]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    setActiveAction("submit");
    try {
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
    if (tableViewerEnabled) {
      try {
        await refreshTableViewer(engine);
      } catch {
        /* viewer refresh failure shouldn't mask the run's outcome */
      }
    }
    } finally {
      setActiveAction(null);
    }
  }, [canCheck, ensureEngine, executeSql, refreshTableViewer, solutionSql, tableViewerEnabled, tests]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // The split button's default action (and Mod-Enter) is "Submit"
  // when the challenge actually has tests; otherwise it falls back
  // to a plain Run so the keystroke still does something useful.
  useEffect(() => {
    submitRef.current = canCheck ? () => void check() : () => void run();
  }, [canCheck, check, run]);

  // ─── Reset ──────────────────────────────────────────────────────────
  // Reset restores the starter code AND re-seeds the database so
  // INSERT/UPDATE/DELETE exercises can be retried from a clean slate.
  // We do this by destroying the engine and clearing the seed flag —
  // `ensureEngine()` will boot a fresh instance on the next user
  // action, and the table-viewer effect will repopulate the panel.
  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
    // Drop the persisted buffer and cancel the debounced save the
    // dispatch above just scheduled.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    clearPersistedCode(persistedKey);
    const oldEngine = enginePromiseRef.current;
    enginePromiseRef.current = null;
    engineSeededRef.current = false;
    if (oldEngine) {
      void oldEngine.then((e) => e.destroy?.()).catch(() => {});
    }
    setResultSet(null);
    setResultError("");
    setResultMessage("");
    setElapsed("");
    setStatus("idle");
    setStatusMessage("");
    setTestResults([]);
    setBannerState(null);
    setTableEntries([]);
    if (tableViewerEnabled) {
      void ensureEngine().catch(() => {
        /* see mount-time bootstrap */
      });
    }
    toasts.show("Reset to starter SQL.");
  }, [initialCode, persistedKey, ensureEngine, tableViewerEnabled, toasts]);

  const copyCode = useCallback(async () => {
    const code = editorRef.current?.state.doc.toString() ?? "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        toasts.show("SQL copied to clipboard.");
      } else {
        toasts.show("Clipboard unavailable in this browser.", "warn");
      }
    } catch {
      toasts.show("Couldn't copy SQL — clipboard blocked.", "warn");
    }
  }, [toasts]);

  const MIN_FORMAT_MS = 300;

  const formatCode = useCallback(async () => {
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    const startedAt = performance.now();
    try {
      const { format: sqlFormat } = await import("sql-formatter");
      const formatted = sqlFormat(code, {
        language: sqlFormatterLanguage(dialect),
      });
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      if (formatted === code) {
        toasts.show("Already formatted — nothing to change.");
      } else {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        toasts.show("SQL formatted.");
      }
    } catch {
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      toasts.show("Couldn't format — SQL may have a syntax error.", "warn");
    } finally {
      setIsFormatting(false);
    }
  }, [dialect, toasts]);

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
      data-flavor="sql"
      aria-label={`SQL coding challenge: ${title}`}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.badge}>
            <Database size={9} aria-hidden /> {badge}
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerRuntimeLabel}>
              <DialectGlyph dialect={dialect} />
              {engineLabel}
            </span>
            <span
              className={styles.statusDot}
              data-status={status}
              title={statusMessage || status}
              aria-label={statusMessage || status}
            />
          </div>
        </div>
        <div className={styles.titleRow}>
          <div className={styles.title}>{title}</div>
          <div className={styles.headerStatus}>
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
      </div>

      {/* ── Instructions ── */}
      <div className={styles.instructions}>
        <div className={styles.instructionsBody}>
          {renderInstructions(instructions)}
        </div>
      </div>

      {/* ── Table viewer ── */}
      {tableViewerEnabled && tableEntries.length > 0 && (
        <div className={styles.tableViewer}>
          <button
            type="button"
            className={styles.tableViewerHeader}
            onClick={() => setTableViewerOpen((v) => !v)}
            aria-expanded={tableViewerOpen}
          >
            <span className={styles.tableViewerLabel}>Tables</span>
            <span className={styles.tableViewerCount}>
              {tableEntries.length} {tableEntries.length === 1 ? "table" : "tables"}
            </span>
            <ChevronDown
              size={14}
              aria-hidden
              className={`${styles.testChevron} ${
                tableViewerOpen ? styles.testChevronOpen : ""
              }`}
            />
          </button>
          {tableViewerOpen && (
            <>
              <div className={styles.tableViewerTabs} role="tablist">
                {tableEntries.map((entry, idx) => (
                  <button
                    key={`${entry.schema ?? ""}.${entry.table}`}
                    type="button"
                    role="tab"
                    aria-selected={idx === activeTableIdx}
                    className={`${styles.tableViewerTab} ${
                      idx === activeTableIdx ? styles.tableViewerTabActive : ""
                    }`}
                    onClick={() => setActiveTableIdx(idx)}
                  >
                    {entry.schema && entry.schema !== defaultSchemaFor(dialect) ? (
                      <>
                        <span className={styles.tableViewerSchema}>{entry.schema}.</span>
                        {entry.table}
                      </>
                    ) : (
                      entry.table
                    )}
                  </button>
                ))}
              </div>
              {tableEntries[activeTableIdx] && (
                <TableViewerPane
                  entry={tableEntries[activeTableIdx]}
                  limit={tableRowLimit}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── Editor ── */}
      <div
        className={styles.editor}
        ref={editorHostRef}
        aria-label="SQL solution editor"
      />

      {/* ── Action bar ── */}
      <div className={styles.actionBar} role="toolbar" aria-label="Challenge controls">
        <div className={styles.btnGroupPrimary}>
          {canCheck ? (
            <>
              <button
                type="button"
                className={styles.runBtn}
                onClick={() => void check()}
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
                  <Check size={12} strokeWidth={2.6} aria-hidden />
                )}
                <span className={styles.runBtnLabel}>
                  {isBusy
                    ? activeAction === "run"
                      ? "Running…"
                      : "Submitting…"
                    : "Submit"}
                </span>
                {!isBusy && (
                  <span
                    className={styles.btnKbd}
                    title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
                  >
                    <kbd className={styles.kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
                    <span className={styles.kbdSep} aria-hidden>+</span>
                    <kbd className={styles.kbd}>↵</kbd>
                  </span>
                )}
              </button>
              <Menu.Root>
                <Menu.Trigger
                  className={styles.runBtnChevron}
                  disabled={isBusy}
                  aria-label="More run options"
                  title="More run options"
                >
                  <ChevronDown size={14} strokeWidth={2.4} aria-hidden />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    sideOffset={6}
                    align="end"
                    className={styles.runMenuPositioner}
                  >
                    <Menu.Popup className={styles.runMenuPopup}>
                      <Menu.Item
                        className={styles.runMenuItem}
                        onClick={() => void run()}
                      >
                        <Play
                          size={12}
                          strokeWidth={2.4}
                          fill="currentColor"
                          aria-hidden
                        />
                        <span className={styles.runMenuLabel}>
                          Run without Submitting
                        </span>
                        <span
                          className={styles.runMenuKbd}
                          title={
                            isMac
                              ? "Cmd + Shift + Enter"
                              : "Ctrl + Shift + Enter"
                          }
                        >
                          <kbd className={styles.kbd}>
                            {isMac ? "⌘" : "Ctrl"}
                          </kbd>
                          <span className={styles.kbdSep} aria-hidden>
                            +
                          </span>
                          <kbd className={styles.kbd}>⇧</kbd>
                          <span className={styles.kbdSep} aria-hidden>
                            +
                          </span>
                          <kbd className={styles.kbd}>↵</kbd>
                        </span>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </>
          ) : (
            // No tests on this challenge: render a plain Run pill,
            // no menu. Mod-Enter falls back to `run` for the same
            // reason.
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
              <span className={styles.runBtnLabel}>{isBusy ? "Running…" : "Run"}</span>
              {!isBusy && (
                <span
                  className={styles.btnKbd}
                  title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
                >
                  <kbd className={styles.kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
                  <span className={styles.kbdSep} aria-hidden>+</span>
                  <kbd className={styles.kbd}>↵</kbd>
                </span>
              )}
            </button>
          )}
        </div>
        <div className={styles.btnGroupUtil}>
          {/* Runtime status — shows "Loading PGlite", "Loading
              DuckDB-WASM", etc. while the SQL engine is fetching its
              WASM bundle on first run. Once the engine is warm this
              stays hidden. */}
          {isBusy && statusMessage && (
            <span
              className={styles.actionBarStatus}
              data-status={status}
              title={statusMessage}
            >
              {statusMessage}
            </span>
          )}
          <button
            type="button"
            className={styles.utilBtn}
            onClick={reset}
            disabled={isBusy}
            title="Reset"
            aria-label="Reset"
          >
            <RotateCcw size={12} strokeWidth={2.4} aria-hidden />
            <span className={styles.utilBtnLabel}>Reset</span>
          </button>
          {solutionSql && (
            <>
              <div className={styles.btnGroupUtilSep} aria-hidden />
              <button
                type="button"
                className={styles.utilBtn}
                onClick={() => setSolutionOpen(true)}
                disabled={isBusy}
                title="Solution"
                aria-label="Solution"
              >
                <Eye size={12} strokeWidth={2} aria-hidden />
                <span className={styles.utilBtnLabel}>Solution</span>
              </button>
            </>
          )}
          <div className={styles.btnGroupUtilSep} aria-hidden />
          <button
            type="button"
            className={styles.utilBtn}
            onClick={() => void formatCode()}
            disabled={isBusy || isFormatting}
            title="Format SQL"
            aria-label="Format SQL"
          >
            {isFormatting ? (
              <svg viewBox="0 0 12 12" className={styles.utilSpinner} aria-hidden>
                <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 8" />
              </svg>
            ) : (
              <FormatIcon />
            )}
            <span className={styles.utilBtnLabel}>Format</span>
          </button>
          <div className={styles.btnGroupUtilSep} aria-hidden />
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => void copyCode()}
            title="Copy SQL"
            aria-label="Copy SQL"
          >
            <CopyIcon />
          </button>
        </div>
        <ChallengeToastViewport
          toasts={toasts.toasts}
          onDismiss={toasts.dismiss}
          className={styles.toastViewport}
          itemClassName={styles.toast}
        />
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
              <VirtualizedResultTable
                columns={resultSet.columns}
                values={resultSet.values}
              />
            )
          ) : resultMessage ? (
            <div className={styles.sqlMessage}>{resultMessage}</div>
          ) : (
            <div className={styles.sqlMessage}>Running…</div>
          )}
          <RunOverlay active={isBusy} />
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
          source={solutionSql}
        />
      )}

    </div>
  );
}

function SolutionModal({
  onClose,
  editorHostRef,
  source,
}: {
  onClose: () => void;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
  source: string;
}) {
  // Trap-free modal: click on backdrop to close, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copySolution = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(source);
      }
    } catch {
      /* ignore */
    }
  }, [source]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reference solution"
      onClick={onClose}
      className={styles.modalBackdrop}
    >
      <div
        className={`${styles.card} ${styles.modalCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.badge}>
            <Database size={9} aria-hidden /> Solution
          </div>
          <div className={styles.modalTitleArea}>
            <div className={styles.modalTitle}>Reference solution</div>
            <div className={styles.modalSubtitle}>
              One valid answer — there may be others.
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={() => void copySolution()}
              aria-label="Copy solution"
              title="Copy solution"
              className={styles.modalIconBtn}
            >
              <CopyIcon />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className={styles.modalIconBtn}
            >
              <X size={14} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        </div>
        <div
          ref={editorHostRef}
          className={styles.modalEditor}
          aria-label="Solution editor (read-only)"
        />
      </div>
    </div>
  );
}

/** Renders a single table's contents inside the table viewer panel.
/** Virtualised SQL result table — used both by the main result pane
 *  and the per-table viewer at the bottom of the card. The result
 *  set is in memory by the time we render (executeSql returns the
 *  full Promise<SqlResult>), so there's no per-page load — we just
 *  render only the rows currently in the viewport via
 *  `@tanstack/react-virtual` + a TanStack table for the column
 *  definitions. For very wide tables the inner row is still a
 *  regular `<tr>` so column auto-widths just work. */
function VirtualizedResultTable({
  columns,
  values,
  maxHeight,
}: {
  columns: string[];
  values: unknown[][];
  /** CSS max-height of the scroll container. Defaults to 320px so a
   *  giant result set doesn't push the whole page below the fold. */
  maxHeight?: number;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Stable row identity — TanStack Table keys rows by index when no
  // explicit id is supplied, which is fine here since the result set
  // never re-sorts in this component.
  const data = useMemo(
    () => values.map((row, i) => ({ __idx: i, row })),
    [values],
  );
  const columnHelper = useMemo(
    () => createColumnHelper<{ __idx: number; row: unknown[] }>(),
    [],
  );
  const tableColumns = useMemo(
    () =>
      columns.map((c, i) =>
        columnHelper.accessor((d) => d.row[i], {
          id: `${i}`,
          header: c,
          cell: (info) => {
            const v = info.getValue();
            if (v === null || v === undefined) {
              return <span className={styles.sqlNullValue}>NULL</span>;
            }
            if (v instanceof Uint8Array) {
              return `<${v.byteLength} bytes>`;
            }
            return String(v);
          },
        }),
      ),
    [columns, columnHelper],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for the column / cell model.
  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });
  const tableRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    // Matches the playground's VIRTUAL_ROW_HEIGHT_ESTIMATE so the
    // table feels identical to the playground's result pane.
    estimateSize: () => 30,
    overscan: 20,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const colSpan = tableColumns.length;

  return (
    <div
      ref={scrollRef}
      className={styles.sqlResultScroll}
      style={{ maxHeight: maxHeight ?? 320 }}
    >
      <table className={styles.sqlResultTable}>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden style={{ height: paddingTop }}>
              <td colSpan={colSpan} />
            </tr>
          )}
          {virtualRows.map((vr) => {
            const row = tableRows[vr.index];
            return (
              <tr
                key={row.id}
                data-index={vr.index}
                ref={rowVirtualizer.measureElement}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden style={{ height: paddingBottom }}>
              <td colSpan={colSpan} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Renders a single table's contents inside the table viewer panel.
 *  Errors and empty-table cases produce a contextual message rather
 *  than a blank pane. */
function TableViewerPane({
  entry,
  limit,
}: {
  entry: TableViewerEntry;
  limit: number;
}) {
  if (entry.error) {
    return (
      <div className={styles.tableViewerEmpty} style={{ color: "var(--ch-red)" }}>
        {entry.error}
      </div>
    );
  }
  const r = entry.result;
  if (!r || r.columns.length === 0) {
    return <div className={styles.tableViewerEmpty}>Table has no columns.</div>;
  }
  if (r.values.length === 0) {
    return (
      <div className={styles.tableViewerEmpty}>
        <code>{entry.table}</code> is empty.
      </div>
    );
  }
  return (
    <div>
      <VirtualizedResultTable
        columns={r.columns}
        values={r.values}
        maxHeight={220}
      />
      {entry.truncated && (
        <div className={styles.tableViewerFootnote}>
          Showing first {limit} row{limit === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}
