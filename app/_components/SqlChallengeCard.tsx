"use client";

/**
 * `SqlChallengeCard`, the SQL counterpart to `<ChallengeCard>`.
 *
 * Why a separate component? SQL exercises don't fit the
 * "interpreter-with-stdout" model used by Python / JS / R: there is no
 * `print()` to inspect; the natural artefact is a result set returned
 * by the user's SELECT. Tests check that result set's shape (row
 * count, columns, exact values), not stdout.
 *
 * Supported dialects: SQLite (via `@sqlite.org/sqlite-wasm`), DuckDB
 * (via `@duckdb/duckdb-wasm`), and PostgreSQL (via PGlite). All run
 * entirely in the browser, there is no server-side execution.
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
import { createPortal } from "react-dom";
import { RotateCcw, Check, CheckCheck, ListChecks, ListX, X, ChevronDown, Eye, Play, Database, Table, List, FileInput } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import {
  createColumnHelper,
  flexRender,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  LANGUAGE_ICONS,
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
  TestResultsRail,
  type Status,
  type TestState,
  type DisplayedTest,
  detectIsMac,
  MIN_RUN_OVERLAY_MS,
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
import {
  acceptCompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
} from "@codemirror/autocomplete";
import { themeFor, noActiveLine, redoKeymap } from "./cmExtensions";
import {
  makeSqlAutocompletionExtension,
  makeSqlLangExtension,
} from "./sql/shared/editorSetup";
import { introspectSqlSchemas } from "./sql/shared/schemaIntrospect";
import { useAskAiSource } from "./ai/contextRegistry";
import { describeSqlSurface } from "./ai/widgetSnapshots";
import { formatSqlSchemaText } from "./ai/sqlSchemaText";
import type { SqlCompletionSchema } from "./sql/sqlCompletion";
import { DUCKDB_VERSION } from "./runtime/duckdb";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import { RuntimeBootNotice } from "./RuntimeBootNotice";
import { DiamondSpinner } from "./mdx/loadingAnimations";
import styles from "./ChallengeCard.module.css";

// ─── Types ────────────────────────────────────────────────────────────

// The declarative test language and its evaluator live in
// `sqlChallengeHarness.ts` so the content sweep can grade cards with exactly
// this code instead of a second copy of it. Re-exported here because these
// types were part of this module's public surface before the split.
import {
  evaluateSqlTest,
  sqlTestChecksSummary,
  type SqlChallengeTest,
  type SqlDialect,
  type SqlEngineLike,
  type SqlResult,
} from "./sqlChallengeHarness";

export {
  evaluateSqlTest,
  sqlTestChecksSummary,
  type SqlChallengeTest,
  type SqlDialect,
  type SqlEngineLike,
  type SqlResult,
};

/** One row of the result grid: the source row plus its index, which is what
 *  the column helper's accessors read. */
type ResultRow = { __idx: number; row: unknown[] };

/** TanStack Table v9 requires an explicit, tree-shakeable feature set in place
 *  of v8's `get*RowModel()` options — the core row model is always present, so
 *  this preview grid (no sorting, filtering, or pagination) needs no features
 *  at all. Built once at module scope so its identity is stable across
 *  renders. */
const RESULT_TABLE_FEATURES = tableFeatures({});


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
  /** Remote dataset to load before `initSql`: a path inside the
   *  dataslope/datasets GitHub repo (e.g. `sqlite/chinook_sqlite.sql`)
   *  or a full URL. The script is downloaded from
   *  raw.githubusercontent.com and executed against the card's engine,
   *  so a card can clone a complete sample database (Chinook,
   *  Northwind, …) without embedding it. `initSql` still runs after it
   *  for any card-specific extras. */
  remoteInitSql?: string;
  /** Starter SQL shown in the editor. */
  starterCode: string;
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

/** One table entry in the viewer panel. Rows are loaded a page at a
 *  time: `result.values` holds everything fetched so far, `hasMore`
 *  records whether another page exists (so the viewer can keep
 *  scroll-loading), and `loadingMore` guards/labels an in-flight fetch. */
export interface TableViewerEntry {
  schema: string | null;
  table: string;
  result: SqlResult | null;
  error: string | null;
  /** True when at least one more row exists beyond what's loaded. */
  hasMore: boolean;
  /** True while the next page is being fetched (drives the spinner). */
  loadingMore: boolean;
}

// ─── Engine adapter ───────────────────────────────────────────────────


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

export function createEngineForDialect(dialect: SqlDialect): Promise<SqlEngineLike> {
  switch (dialect) {
    case "sqlite":
      return createSqliteChallengeEngine();
    case "duckdb":
      return createDuckDbChallengeEngine();
    case "postgres":
      return createPostgresChallengeEngine();
  }
}

/** Human-readable engine name for a dialect, used in the boot loader
 *  copy ("Setting up the DuckDB runtime…"). */
export function sqlDialectDisplayName(dialect: SqlDialect): string {
  return dialect === "sqlite"
    ? "SQLite"
    : dialect === "duckdb"
      ? "DuckDB"
      : "PostgreSQL";
}

/** Approximate cold-download size (MB) of each dialect's in-browser
 *  WASM engine, feeds the boot notice's "downloads once (~N MB)" hint.
 *  Ballpark figures (SQLite ~1 MB, PGlite ~3 MB, DuckDB ~5–10 MB), in
 *  the same spirit as `LanguageAdapter.coldDownloadMB` for the other
 *  runtimes. */
export function sqlDialectColdMB(dialect: SqlDialect): number {
  return dialect === "sqlite" ? 1 : dialect === "duckdb" ? 6 : 3;
}

/** Engine label shown before the live runtime reports its exact version. */
function defaultSqlEngineLabel(dialect: SqlDialect): string {
  return dialect === "sqlite"
    ? "SQLite 3.53"
    : dialect === "duckdb"
      ? `DuckDB ${DUCKDB_VERSION}`
      : "PostgreSQL 17";
}

// Dialects whose engine has booted at least once this page session.
// Mirrors runtimeRegistry's `ready` set for the non-SQL adapters: it
// lets the boot notice show its "downloads once (~N MB)" cold copy only
// on the first block of each dialect, not on every later block (whose
// WASM is already served from the HTTP cache).
const bootedSqlDialects = new Set<SqlDialect>();

/** Boot-progress snapshot consumed by `<TableViewer>` to render the
 *  shared `<RuntimeBootNotice>` while a dialect's WASM engine downloads
 *  and seeds. `null` once the engine is ready (or if the boot failed,
 *  the error surfaces in the result pane instead). */
export interface SqlEngineBootState {
  cold: boolean;
  message: string;
  dialect: SqlDialect;
  downloadMB: number;
}

export interface UseSqlEngineBootOptions {
  dialect: SqlDialect;
  initSql?: string;
  remoteInitSql?: string;
}

/** Shared engine-boot lifecycle for `<SqlChallengeCard>` and
 *  `<SqlCodeBlock>`. Owns the per-block engine promise (boot + seed
 *  folded into one cached promise so every caller awaits the same
 *  fully-seeded engine, see the race note below), the live engine
 *  label, and the boot-progress state that drives the branded boot
 *  loader. Keeping it here lets both card components surface the same
 *  loading affordance the non-SQL blocks already show. */
export function useSqlEngineBoot({
  dialect,
  initSql,
  remoteInitSql,
}: UseSqlEngineBootOptions) {
  // The promise (not the resolved engine) is cached so two near-
  // simultaneous callers, e.g. the mount-time table-viewer boot and a
  // Run click, share one boot. Seeding (`initSql`) is folded INTO the
  // promise so every caller awaits the same fully-seeded engine; an
  // earlier design flipped a "seeded" flag before `await
  // engine.exec(initSql)` resolved, letting a second caller query a
  // table that didn't exist yet, invisible on in-process SQLite but
  // reliably racy on DuckDB, whose multi-second WASM download widens the
  // window.
  const enginePromiseRef = useRef<Promise<SqlEngineLike> | null>(null);
  const [engineLabel, setEngineLabel] = useState<string>(() =>
    defaultSqlEngineLabel(dialect),
  );
  const [booting, setBooting] = useState(false);
  const [bootFailed, setBootFailed] = useState(false);
  const [bootCold, setBootCold] = useState<boolean>(
    () => !bootedSqlDialects.has(dialect),
  );
  const [bootMessage, setBootMessage] = useState<string>(
    () => `Starting the ${sqlDialectDisplayName(dialect)} engine…`,
  );
  // True once the engine has downloaded and we're running the (tiny) seed
  // SQL. The cold-download size is the engine wasm, not the data, so it's
  // suppressed in this phase to avoid implying the few sample rows are MBs.
  const [bootSeeding, setBootSeeding] = useState(false);

  const ensureEngine = useCallback(async (): Promise<SqlEngineLike> => {
    if (!enginePromiseRef.current) {
      setBooting(true);
      setBootFailed(false);
      setBootCold(!bootedSqlDialects.has(dialect));
      setBootMessage(`Starting the ${sqlDialectDisplayName(dialect)} engine…`);
      setBootSeeding(false);
      enginePromiseRef.current = (async () => {
        // Start the dataset download while the engine boots, the two
        // are independent and the WASM fetch usually dominates. The
        // no-op catch keeps an engine-boot failure from leaving this
        // promise's rejection unhandled; awaiting it below still throws.
        const remoteSqlPromise = remoteInitSql
          ? fetchRemoteInitSql(dialect, remoteInitSql)
          : null;
        remoteSqlPromise?.catch(() => {});
        const engine = await createEngineForDialect(dialect);
        setEngineLabel(`${engine.label} ${engine.version}`.trim());
        bootedSqlDialects.add(dialect);
        if (remoteSqlPromise || (initSql && initSql.trim())) {
          setBootMessage("Loading sample data…");
          setBootSeeding(true);
        }
        if (remoteSqlPromise) {
          await engine.exec(await remoteSqlPromise);
        }
        if (initSql && initSql.trim()) {
          await engine.exec(initSql);
        }
        return engine;
      })().then(
        (engine) => {
          setBooting(false);
          return engine;
        },
        (err) => {
          // Don't poison the cache with a failed init, let the next
          // attempt try again.
          enginePromiseRef.current = null;
          setBooting(false);
          setBootFailed(true);
          throw err;
        },
      );
    }
    return enginePromiseRef.current;
  }, [dialect, initSql, remoteInitSql]);

  /** Destroy the current engine (if any), used on unmount so the
   *  underlying WASM workers don't leak. */
  const destroyEngine = useCallback(() => {
    const p = enginePromiseRef.current;
    if (p) {
      void p.then((e) => e.destroy?.()).catch(() => {
        /* engine never finished initialising; nothing to clean up */
      });
    }
  }, []);

  /** Destroy the current engine and re-arm boot state so the next
   *  `ensureEngine()` boots + re-seeds a fresh instance, used by Reset. */
  const resetEngine = useCallback(() => {
    const old = enginePromiseRef.current;
    enginePromiseRef.current = null;
    setBooting(false);
    setBootFailed(false);
    if (old) {
      void old.then((e) => e.destroy?.()).catch(() => {});
    }
  }, []);

  const bootState: SqlEngineBootState | null =
    booting && !bootFailed
      ? {
          cold: bootCold,
          message: bootMessage,
          dialect,
          // 0 once seeding (engine already downloaded) → the notice hides the
          // size, since the seed data is tiny.
          downloadMB: bootSeeding ? 0 : sqlDialectColdMB(dialect),
        }
      : null;

  return {
    ensureEngine,
    engineLabel,
    setEngineLabel,
    bootState,
    destroyEngine,
    resetEngine,
  };
}

/** Download a remote dataset script (a path inside the
 *  dataslope/datasets GitHub repo, or a full URL) and prepare it for
 *  the given dialect's embedded engine. Used by the `remoteInitSql`
 *  prop of `<SqlChallengeCard>` and `<SqlCodeBlock>`. */
export async function fetchRemoteInitSql(
  dialect: SqlDialect,
  pathOrUrl: string,
): Promise<string> {
  const { fetchDatasetText } = await import("./runtime/remoteDatasets");
  const script = await fetchDatasetText(pathOrUrl);
  if (dialect === "postgres") {
    // Scripts authored for a full Postgres server may open with psql
    // meta-commands / CREATE DATABASE lines that can never run in
    // PGlite, strip them before execution.
    const { preparePostgresScriptForPglite } = await import("./runtime/postgres");
    return preparePostgresScriptForPglite(script);
  }
  return script;
}

/** Default schema where a dialect's user tables live unless qualified
 *  otherwise. SQLite has no schema concept (we use `main`); DuckDB
 *  uses `main`; PostgreSQL uses `public`. */
export function defaultSchemaFor(dialect: SqlDialect): string {
  return dialect === "postgres" ? "public" : "main";
}

/** SQL fragment that lists every user table in the default schema for
 *  a given dialect. Used by the table viewer to enumerate tables when
 *  the author didn't hand-pick a list. Returns rows of
 *  (schema, table_name). */
export function listTablesSqlFor(dialect: SqlDialect): string {
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
export function qualifiedTable(
  dialect: SqlDialect,
  schema: string | null,
  table: string,
): string {
  if (dialect === "sqlite" || !schema) return quoteIdent(table);
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}


// ─── Component ────────────────────────────────────────────────────────

/** Map a SQL dialect to the corresponding key in the shared
 *  `LANGUAGE_ICONS` registry so the SqlChallengeCard's runtime label
 *  uses the same brand glyph as the playground language switcher. */
function languageIconKeyForDialect(d: SqlDialect): string {
  return d;
}


export function DialectGlyph({ dialect }: { dialect: SqlDialect }) {
  const key = languageIconKeyForDialect(dialect);
  const Icon = LANGUAGE_ICONS[key];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[key] ?? 1;
  if (!Icon) return null;
  return (
    <Icon
      style={{
        width: `${Math.round(14 * factor)}px`,
        height: `${Math.round(14 * factor)}px`,
      }}
      aria-hidden
    />
  );
}

/** Map dialect → sql-formatter language identifier. PGlite is Postgres-
 *  compatible, so postgres formats with the `postgresql` rules; SQLite and
 *  DuckDB use sql-formatter's matching native dialects. Keep this the single
 *  source of truth so every surface formats a given dialect identically. */
export function sqlFormatterLanguage(d: SqlDialect): "sqlite" | "postgresql" | "duckdb" {
  if (d === "sqlite") return "sqlite";
  if (d === "duckdb") return "duckdb";
  return "postgresql";
}

// ─── Table viewer hook ────────────────────────────────────────────────

/** Fetch a single page of a table's rows. Asks for `pageSize + 1` rows
 *  so the caller can tell, without a second COUNT(*) round-trip,
 *  whether more rows remain past this page. Works for every dialect
 *  because `LIMIT … OFFSET …` is supported by SQLite, DuckDB, and
 *  Postgres alike. Errors are returned, not thrown, so one broken table
 *  can't blank the whole viewer. */
export async function fetchTablePage(
  engine: SqlEngineLike,
  dialect: SqlDialect,
  schema: string | null,
  table: string,
  pageSize: number,
  offset: number,
): Promise<{ result: SqlResult | null; hasMore: boolean; error: string | null }> {
  if (!table) return { result: null, hasMore: false, error: "Empty table name." };
  try {
    const ref = qualifiedTable(dialect, schema, table);
    const out = await engine.exec(
      `SELECT * FROM ${ref} LIMIT ${pageSize + 1} OFFSET ${offset};`,
    );
    const last =
      out.findLast?.((r) => r.columns.length > 0) ??
      [...out].reverse().find((r) => r.columns.length > 0) ??
      null;
    if (!last) return { result: null, hasMore: false, error: null };
    const hasMore = last.values.length > pageSize;
    const result: SqlResult = hasMore
      ? { columns: last.columns, values: last.values.slice(0, pageSize) }
      : last;
    return { result, hasMore, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { result: null, hasMore: false, error: msg };
  }
}

export interface UseSqlTableViewerOptions {
  dialect: SqlDialect;
  tables: SqlTableViewerSpec[] | false | undefined;
  /** Rows fetched per page. The viewer scroll-loads further pages on
   *  demand, so this is a page size rather than a hard cap. */
  tableRowLimit: number;
  ensureEngine: () => Promise<SqlEngineLike>;
}

export interface ResultTabData {
  resultSet: SqlResult | null;
  error: string;
  message: string;
  loading: boolean;
  elapsed?: string;
  runSeq: number;
}

/** Shared table-viewer state machine for `<SqlChallengeCard>` and
 *  `<SqlCodeBlock>`. Owns the list of tables, the active tab, the
 *  open/closed state, the first-load "initializing" flag (which drives
 *  the skeleton animation while the WASM engine boots and seeds), and
 *  the per-table infinite-scroll paging. Living here keeps the two
 *  card components byte-for-byte consistent. */
export function useSqlTableViewer({
  dialect,
  tables,
  tableRowLimit,
  ensureEngine,
}: UseSqlTableViewerOptions) {
  const enabled = tables !== false;
  const pageSize = Math.max(1, Math.floor(tableRowLimit));

  const [entries, setEntries] = useState<TableViewerEntry[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  // True from mount until the first table list has been fetched (or the
  // boot failed). Drives the loading skeleton. Subsequent refreshes
  // don't re-raise it, so re-running a query updates rows in place
  // rather than flashing the skeleton.
  const [initializing, setInitializing] = useState(enabled);

  // Mirror of `entries` for stale-free reads inside async callbacks.
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  });
  // Guards against firing a duplicate page fetch for the same table
  // while one is already in flight (the scroll handler can fire many
  // times before React commits the `loadingMore` flag).
  const inFlightRef = useRef<Set<number>>(new Set());
  // Invalidates in-flight refreshes: a Reset destroys the engine and
  // immediately starts a refresh against the fresh one, without this,
  // a slower refresh that was already in flight (e.g. the mount-time
  // boot on DuckDB) could land last and show the pre-reset rows.
  const refreshSeqRef = useRef(0);

  const refresh = useCallback(
    async (engine: SqlEngineLike) => {
      if (!enabled) return;
      const mySeq = ++refreshSeqRef.current;
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
      inFlightRef.current.clear();
      const next: TableViewerEntry[] = await Promise.all(
        plan.map(async ({ schema, table }) => {
          const page = await fetchTablePage(engine, dialect, schema, table, pageSize, 0);
          return {
            schema,
            table,
            result: page.result,
            error: page.error,
            hasMore: page.hasMore,
            loadingMore: false,
          };
        }),
      );
      if (refreshSeqRef.current !== mySeq) return;
      setEntries(next);
      setActiveIdx((idx) => (next.length === 0 ? 0 : Math.min(idx, next.length - 1)));
      setInitializing(false);
    },
    [dialect, enabled, pageSize, tables],
  );

  /** Append the next page of rows to the table at `idx`. No-op when the
   *  table has no more rows, errored, or already has a fetch in flight. */
  const loadMore = useCallback(
    async (idx: number) => {
      const entry = entriesRef.current[idx];
      if (!entry || !entry.hasMore || entry.error || !entry.result) return;
      if (inFlightRef.current.has(idx)) return;
      inFlightRef.current.add(idx);
      setEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, loadingMore: true } : e)),
      );
      try {
        const engine = await ensureEngine();
        const offset = entry.result.values.length;
        const page = await fetchTablePage(
          engine,
          dialect,
          entry.schema,
          entry.table,
          pageSize,
          offset,
        );
        setEntries((prev) =>
          prev.map((e, i) => {
            if (i !== idx) return e;
            const added = page.result?.values ?? [];
            const mergedResult: SqlResult | null = e.result
              ? { columns: e.result.columns, values: [...e.result.values, ...added] }
              : page.result;
            return {
              ...e,
              result: mergedResult,
              hasMore: page.error ? false : page.hasMore,
              loadingMore: false,
            };
          }),
        );
      } catch {
        setEntries((prev) =>
          prev.map((e, i) =>
            i === idx ? { ...e, hasMore: false, loadingMore: false } : e,
          ),
        );
      } finally {
        inFlightRef.current.delete(idx);
      }
    },
    [dialect, ensureEngine, pageSize],
  );

  /** Clear all entries and re-arm the loading skeleton, used by Reset,
   *  which destroys and re-seeds the engine. Also invalidates any
   *  refresh still in flight so it can't resurrect the cleared rows. */
  const clear = useCallback(() => {
    refreshSeqRef.current++;
    inFlightRef.current.clear();
    setEntries([]);
    setInitializing(enabled);
  }, [enabled]);

  /** Lower the skeleton without populating tables, used when engine
   *  bootstrap fails so the skeleton doesn't spin forever. */
  const markInitDone = useCallback(() => setInitializing(false), []);

  return {
    enabled,
    entries,
    activeIdx,
    setActiveIdx,
    initializing,
    refresh,
    loadMore,
    clear,
    markInitDone,
  };
}

export default function SqlChallengeCard({
  dialect,
  title,
  badge = "SQL Challenge",
  instructions,
  initSql,
  remoteInitSql,
  starterCode,
  solutionSql,
  tables,
  tableRowLimit = 50,
  tests,
}: SqlChallengeCardProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const solutionEditorHostRef = useRef<HTMLDivElement | null>(null);
  const solutionEditorRef = useRef<EditorView | null>(null);
  // Theme compartments, stored so the dark/light sync effect can
  // reconfigure the CM theme without remounting the editor.
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const solutionThemeCompRef = useRef<Compartment | null>(null);
  // Lang/completion compartments, stored so the completion-schema
  // refresh can reconfigure without remounting the editor.
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  // Debounce handle for localStorage persistence (see editor mount).
  const persistSaveTimerRef = useRef<number | null>(null);
  // Root card element (Ask AI visibility tracking) and the latest
  // introspected completion schema (reused as the Ask AI schema snapshot).
  const cardRef = useRef<HTMLDivElement | null>(null);
  const askAiSchemaRef = useRef<SqlCompletionSchema | null>(null);

  // Stable localStorage key for the user's SQL buffer. `dialect` is in
  // the fingerprint because the same starter SQL might mean different
  // things across engines (e.g. `RETURNING` is Postgres/SQLite but not
  // historically DuckDB), and `title` disambiguates challenges that
  // happen to share starter text.
  const persistedKey = useMemo(
    () => persistKey("sql-challenge", `${dialect}|${title}|${starterCode}`),
    [dialect, title, starterCode],
  );

  // Each card owns its own engine instance, sharing across cards would
  // let one challenge's CREATE TABLE leak into another's checks. The
  // shared hook owns the cached boot+seed promise, the live engine
  // label, and the boot-progress state that drives the boot loader.
  const { ensureEngine, engineLabel, bootState, destroyEngine, resetEngine } =
    useSqlEngineBoot({ dialect, initSql, remoteInitSql });
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
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [resultRunSeq, setResultRunSeq] = useState(0);
  const toasts = useChallengeToasts();

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
    const completionComp = new Compartment();

    // Restore any previously-saved SQL buffer; fall back to the MDX
    // starter when nothing is stored.
    const persisted = loadPersistedCode(persistedKey);
    const initialDoc = persisted ?? starterCode;

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
        // Schema-aware completion (same engine as the SQL playgrounds).
        // Seeded with an empty schema so keyword completion works right
        // away; reconfigured with live tables/columns once the card's
        // engine boots, see `refreshCompletionSchema` below.
        completionComp.of(makeSqlAutocompletionExtension({ entities: [] }, dialect)),
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
          {
            key: "Ctrl-Space",
            run: (v) => {
              startCompletion(v);
              return true;
            },
          },
          ...closeBracketsKeymap,
          // Completion keys before `defaultKeymap` so arrows move the
          // popup selection. Enter is removed so it always inserts a
          // newline; Tab accepts instead, matching the SQL playgrounds.
          ...completionKeymap.filter((b) => b.key !== "Enter"),
          { key: "Tab", run: acceptCompletion },
          ...defaultKeymap,
          ...historyKeymap,
          ...redoKeymap,
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
    langCompRef.current = languageComp;
    completionCompRef.current = completionComp;

    void (async () => {
      try {
        const langExt = await makeSqlLangExtension(dialect);
        if (editorRef.current === view) {
          view.dispatch({ effects: languageComp.reconfigure(langExt) });
        }
      } catch {
        // SQL language extension is optional, editor still works
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
      langCompRef.current = null;
      completionCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the completion schema (and lang-sql's copy) from the live
  // database. Called after engine boot and after every run/submit, so
  // tables the challenge SQL creates complete immediately. Best-effort:
  // failures leave the previous schema in place.
  const refreshCompletionSchema = useCallback(
    async (engine: SqlEngineLike) => {
      try {
        const schemas = await introspectSqlSchemas(engine.exec, dialect);
        askAiSchemaRef.current = schemas.completion;
        const view = editorRef.current;
        const completionComp = completionCompRef.current;
        const langComp = langCompRef.current;
        if (!view || !completionComp || !langComp) return;
        const langExt = await makeSqlLangExtension(dialect, schemas.langSchema);
        view.dispatch({
          effects: [
            completionComp.reconfigure(
              makeSqlAutocompletionExtension(schemas.completion, dialect),
            ),
            langComp.reconfigure(langExt),
          ],
        });
      } catch {
        // Completion schema is a nicety, never surface as an error.
      }
    },
    [dialect],
  );

  // Ask AI context: the card registers itself so the assistant can see the
  // challenge the user is looking at, instructions, their current SQL, the
  // last error/result, test results, and the live database schema.
  useAskAiSource({
    kind: "challenge",
    label: `${badge}: ${title}`,
    elementRef: cardRef,
    getSnapshot: () => {
      const instructionsText =
        typeof instructions === "string"
          ? instructions
          : (cardRef.current
              ?.querySelector("[data-askai-instructions]")
              ?.textContent ?? "");
      return {
        content: describeSqlSurface({
          dialect,
          sql: editorRef.current?.state.doc.toString() ?? "",
          instructions: instructionsText,
          error: resultError,
          resultSummary: resultSet
            ? `${resultSet.values.length} row(s): ${resultSet.columns.join(", ")}`
            : resultMessage,
          tests: testResults,
          banner: bannerState,
        }),
        schema: formatSqlSchemaText(askAiSchemaRef.current),
      };
    },
  });

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
  // editor and select text, including Mod-A select-all, wired via
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

  // Clean up the engine on unmount so workers don't leak. (Bumping the
  // run sequence makes any in-flight run bail out of its post-await
  // state updates.)
  useEffect(() => {
    return () => {
      runSeqRef.current = runSeqRef.current + 1;
      destroyEngine();
    };
  }, [destroyEngine]);

  // ─── Table viewer ───────────────────────────────────────────────────
  // All table-list / paging / loading state lives in the shared hook so
  // this card and `<SqlCodeBlock>` behave identically.
  const {
    enabled: tableViewerEnabled,
    entries: tableEntries,
    activeIdx: activeTableIdx,
    setActiveIdx: setActiveTableIdx,
    initializing: tablesInitializing,
    refresh: refreshTableViewer,
    loadMore: loadMoreTable,
    clear: clearTableViewer,
    markInitDone: markTablesInitDone,
  } = useSqlTableViewer({ dialect, tables, tableRowLimit, ensureEngine });

  const loadMoreActiveTable = useCallback(
    () => void loadMoreTable(activeTableIdx),
    [loadMoreTable, activeTableIdx],
  );

  // Eagerly boot the engine on mount so the table viewer can populate
  // before the learner clicks Run. The engine is per-card and isolated,
  // so doing this once per mount is safe. The completion schema
  // piggybacks on the same boot.
  useEffect(() => {
    if (!tableViewerEnabled) return;
    void ensureEngine()
      .then((engine) => {
        void refreshCompletionSchema(engine);
        return refreshTableViewer(engine);
      })
      .catch(() => {
        // Lower the skeleton so it doesn't spin forever; per-table
        // errors surface in their own column once a run succeeds.
        markTablesInitDone();
      });
  }, [ensureEngine, refreshTableViewer, refreshCompletionSchema, tableViewerEnabled, markTablesInitDone]);

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
      // The caller's run sequence (from `++runSeqRef.current`). Owning
      // the increment in the caller lets it guard its own post-await
      // state updates too, a newer run/check/reset supersedes both
      // this execution's streaming updates and the caller's final ones.
      mySeq: number,
    ): Promise<{
      results: SqlResult[];
      last: SqlResult | null;
      elapsedMs: number;
    }> => {
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
      // shouldn't shadow a preceding SELECT, but if the user only ran
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
    const mySeq = ++runSeqRef.current;
    setResultRunSeq((s) => s + 1);
    setActiveAction("run");
    const userSql = editorRef.current?.state.doc.toString() ?? "";
    setTestResults([]);
    setBannerState(null);
    setResultError("");
    setResultMessage("");
    try {
      const { results, last, elapsedMs } = await executeSql(userSql, mySeq);
      if (runSeqRef.current !== mySeq) return;
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
      // The run may have created/dropped tables, refresh the
      // completion schema (and the viewer when enabled).
      try {
        const engine = await ensureEngine();
        void refreshCompletionSchema(engine);
        if (tableViewerEnabled) await refreshTableViewer(engine);
      } catch {
        /* viewer refresh failure shouldn't mask the run's success */
      }
    } catch (err) {
      if (runSeqRef.current !== mySeq) return;
      const message = err instanceof Error ? err.message : String(err);
      setResultSet(null);
      setResultError(message);
      setStatus("error");
      setStatusMessage(message);
    } finally {
      // Only the latest run owns the busy spinner, a superseded run
      // clearing it would re-enable Submit mid-flight for its successor.
      if (runSeqRef.current === mySeq) setActiveAction(null);
    }
  }, [executeSql, ensureEngine, refreshTableViewer, refreshCompletionSchema, tableViewerEnabled]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    const mySeq = ++runSeqRef.current;
    setResultRunSeq((s) => s + 1);
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
      if (runSeqRef.current !== mySeq) return;
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
    if (runSeqRef.current !== mySeq) return;

    // Run the learner's SQL first, capturing the final result set.
    let last: SqlResult | null = null;
    let elapsedMs = 0;
    try {
      const out = await executeSql(userSql, mySeq);
      if (runSeqRef.current !== mySeq) return;
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
      if (runSeqRef.current !== mySeq) return;
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
    // shouldn't mutate state, and if it did, every test's expectation
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
        if (runSeqRef.current !== mySeq) return;
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
      if (runSeqRef.current !== mySeq) return;
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
    if (runSeqRef.current !== mySeq) return;
    setTestResults(displayed);
    const passed = displayed.filter((d) => d.state === "pass").length;
    const allPass = passed === displayed.length && displayed.length > 0;
    setBannerState(allPass ? "pass" : "fail");
    setStatus("ready");
    setStatusMessage(
      allPass ? "All tests passed" : `${passed}/${displayed.length} passed`,
    );
    void refreshCompletionSchema(engine);
    if (tableViewerEnabled) {
      try {
        await refreshTableViewer(engine);
      } catch {
        /* viewer refresh failure shouldn't mask the run's outcome */
      }
    }
    } finally {
      // Only the latest submission owns the busy spinner (see `run`).
      if (runSeqRef.current === mySeq) setActiveAction(null);
    }
  }, [canCheck, ensureEngine, executeSql, refreshTableViewer, refreshCompletionSchema, solutionSql, tableViewerEnabled, tests]);

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

  // ─── Test hook ─────────────────────────────────────────────────────
  // Mirror <ChallengeCard>: expose an imperative driver on the shared
  // `window.__dsChallenges` registry so the Playwright solution sweep
  // (e2e/challenge-solutions.spec.ts) can load a card's reference SQL into
  // the editor and run its tests without round-tripping through the DOM.
  // The single editor surface is modelled as one virtual file, "query.sql".
  const checkRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const bannerStateRef = useRef(bannerState);
  const testResultsRef = useRef(testResults);
  useEffect(() => {
    checkRef.current = () => check();
  }, [check]);
  useEffect(() => {
    bannerStateRef.current = bannerState;
  }, [bannerState]);
  useEffect(() => {
    testResultsRef.current = testResults;
  }, [testResults]);
  useEffect(() => {
    if (typeof window === "undefined" || !solutionSql) return;
    const w = window as unknown as {
      __dsChallenges?: Record<string, unknown>;
    };
    const key = `${dialect}::${title}`;
    const handle = {
      adapterId: dialect,
      title,
      entryFilename: "query.sql",
      filenames: ["query.sql"],
      setFileContent(_filename: string, content: string) {
        const view = editorRef.current;
        if (!view) return false;
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: content },
        });
        return true;
      },
      submit() {
        return checkRef.current();
      },
      getBannerState() {
        return bannerStateRef.current;
      },
      getTestResults() {
        return testResultsRef.current.map((t) => ({
          id: t.id,
          name: t.name,
          state: t.state,
          detail: t.detail,
        }));
      },
    };
    const registry = w.__dsChallenges ?? {};
    w.__dsChallenges = { ...registry, [key]: handle };
    return () => {
      const current = w.__dsChallenges;
      if (current && current[key] === handle) {
        const next = { ...current };
        delete next[key];
        w.__dsChallenges = next;
      }
    };
  }, [dialect, title, solutionSql]);

  // ─── Reset ──────────────────────────────────────────────────────────
  // Reset restores the starter code AND re-seeds the database so
  // INSERT/UPDATE/DELETE exercises can be retried from a clean slate.
  // We do this by destroying the engine and clearing the seed flag,
  // `ensureEngine()` will boot a fresh instance on the next user
  // action, and the table-viewer effect will repopulate the panel.
  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: starterCode },
      });
    }
    // Drop the persisted buffer and cancel the debounced save the
    // dispatch above just scheduled.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    clearPersistedCode(persistedKey);
    // Destroy the engine and re-arm boot state so the next ensureEngine()
    // boots + re-seeds a fresh instance (the boot loader shows again).
    resetEngine();
    setResultSet(null);
    setResultError("");
    setResultMessage("");
    setElapsed("");
    setStatus("idle");
    setStatusMessage("");
    setTestResults([]);
    setBannerState(null);
    // A run superseded by this reset skips its own spinner cleanup
    // (its `finally` is sequence-guarded), so clear it here.
    setActiveAction(null);
    clearTableViewer();
    if (tableViewerEnabled) {
      void ensureEngine()
        .then((engine) => {
          void refreshCompletionSchema(engine);
          return refreshTableViewer(engine);
        })
        .catch(() => {
          /* see mount-time bootstrap */
        });
    }
    toasts.show("Reset to starter SQL.");
  }, [starterCode, persistedKey, resetEngine, ensureEngine, refreshTableViewer, refreshCompletionSchema, clearTableViewer, tableViewerEnabled, toasts]);

  // ─── Apply solution ─────────────────────────────────────────────────
  // Load the reference SQL into the learner's editor (the "Load Solution
  // into Editor" button in the solution modal), mirroring <ChallengeCard>.
  const applySolutionToEditor = useCallback(() => {
    if (!solutionSql) return;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: solutionSql },
      });
    }
    // Persist immediately and cancel the debounced save the dispatch above
    // just scheduled, so closing the modal right away doesn't drop it.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    savePersistedCode(persistedKey, solutionSql);
    setSolutionOpen(false);
    toasts.show("Solution loaded into your editor.");
  }, [solutionSql, persistedKey, toasts]);

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
      toasts.show("Couldn't copy SQL, clipboard blocked.", "warn");
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
        toasts.show("Already formatted, nothing to change.");
      } else {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        toasts.show("SQL formatted.");
      }
    } catch {
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      toasts.show("Couldn't format, SQL may have a syntax error.", "warn");
    } finally {
      setIsFormatting(false);
    }
  }, [dialect, toasts]);

  const isBusy = status === "loading" || status === "running";

  // Readable summary of each test's declarative checks, surfaced by the
  // test-details popover in the results rail.
  const testChecksById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tests) m.set(t.id, sqlTestChecksSummary(t));
    return m;
  }, [tests]);

  const hasResult = isBusy || resultSet !== null || resultError !== "" || resultMessage !== "";
  const resultTabDataProp: ResultTabData | null = hasResult
    ? {
        resultSet,
        error: resultError,
        message: resultMessage,
        loading: isBusy,
        elapsed,
        runSeq: resultRunSeq,
      }
    : null;
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
    <div className={styles.cardShell}>
    <div
      ref={cardRef}
      className={styles.card}
      data-flavor="sql"
      data-testid="sql-challenge-card"
      data-adapter-id={dialect}
      data-challenge-title={title}
      data-solution-files={
        solutionSql
          ? JSON.stringify([{ filename: "query.sql", source: solutionSql }])
          : undefined
      }
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
        {/* data-askai-instructions lets the Ask AI snapshot read the rendered
            instructions text when `instructions` is JSX rather than a string. */}
        <div className={styles.instructionsBody} data-askai-instructions>
          {renderInstructions(instructions)}
        </div>
      </div>

      {/* ── Table viewer / Result viewer ── */}
      {(tableViewerEnabled || hasResult) && (
        <TableViewer
          dialect={dialect}
          entries={tableEntries}
          activeIdx={activeTableIdx}
          setActiveIdx={setActiveTableIdx}
          initializing={tablesInitializing}
          onLoadMore={loadMoreActiveTable}
          resultTabData={resultTabDataProp}
          bootState={bootState}
        />
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
                // Also disabled while the table viewer's first load seeds
                // the database, so Submit can't race the engine boot.
                disabled={isBusy || tablesInitializing}
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
                      stroke="currentColor"
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
                  disabled={isBusy || tablesInitializing}
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
              // Also disabled while the table viewer's first load seeds
              // the database, so Run can't race the engine boot.
              disabled={isBusy || tablesInitializing}
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
                    stroke="currentColor"
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
          {/* Runtime status, shows "Loading PGlite", "Loading
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

      {/* ── Test results ── */}
      {testResults.length > 0 && (
        <div className={styles.testPanel}>
          <button
            type="button"
            className={styles.testPanelHeader}
            onClick={() => setTestListOpen((v) => !v)}
            aria-expanded={testListOpen}
          >
            <span className={styles.testLabel} data-state={summaryState}>
              Test Results
            </span>
            <div className={styles.testSummary}>
              <span className={styles.testPill} data-state={summaryState}>
                {summaryState === "pending" ? (
                  "Running…"
                ) : summaryState === "pass" ? (
                  <>
                    <ListChecks size={11} strokeWidth={2.5} aria-hidden /> {passedCount}/{totalTests} passed
                  </>
                ) : (
                  <>
                    <ListX size={11} strokeWidth={2.5} aria-hidden /> {passedCount}/{totalTests} passed
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
            <TestResultsRail
              tests={testResults.map((t) => ({
                ...t,
                code: testChecksById.get(t.id),
              }))}
              codeLabel="Checks"
            />
          )}
        </div>
      )}

      {/* ── Banner ── */}
      {bannerState && (
        <div className={styles.banner} data-state={bannerState}>
          {bannerState === "pass" ? (
            <>
              <CheckCheck size={16} strokeWidth={2.5} aria-hidden />
              <span>All tests passed!</span>
            </>
          ) : (
            <>
              <X size={16} strokeWidth={2.5} aria-hidden />
              <span>
                {totalTests - passedCount} test
                {totalTests - passedCount === 1 ? "" : "s"} failed
              </span>
            </>
          )}
        </div>
      )}

      {/* ── Solution modal ── */}
      {solutionOpen && solutionSql && (
        <SolutionModal
          onClose={() => setSolutionOpen(false)}
          editorHostRef={solutionEditorHostRef}
          source={solutionSql}
          onApplySolution={applySolutionToEditor}
        />
      )}

    </div>
    </div>
  );
}

function SolutionModal({
  onClose,
  editorHostRef,
  source,
  onApplySolution,
}: {
  onClose: () => void;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
  source: string;
  onApplySolution: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  // Trap-free modal: click on backdrop to close, Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Tidy the "Copied!" reset timer on unmount.
  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null)
        window.clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText(source);
      setCopied(true);
      if (copiedTimerRef.current !== null)
        window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 1500);
    } catch {
      /* clipboard blocked, leave the label unchanged */
    }
  }, [source]);

  const modal = (
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
            <Database size={9} aria-hidden />
          </div>
          <div className={styles.modalTitleArea}>
            <div className={styles.modalTitle}>Reference solution</div>
            <div className={styles.modalSubtitle}>
              One valid answer, there may be others.
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={() => void handleCopy()}
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
        {/* Action bar pinned below the read-only editor. Borderless utility
            buttons mirror <ChallengeCard>'s solution modal. */}
        <div className={styles.solutionActionBar}>
          <button
            type="button"
            className={styles.utilBtn}
            onClick={() => void handleCopy()}
            title="Copy solution query to clipboard"
          >
            {copied ? (
              <Check size={13} strokeWidth={2.4} aria-hidden />
            ) : (
              <CopyIcon />
            )}
            <span>{copied ? "Copied!" : "Copy Solution Query"}</span>
          </button>
          <span className={styles.solutionActionSeparator} aria-hidden />
          <button
            type="button"
            className={styles.utilBtn}
            onClick={onApplySolution}
            title="Replace your editor's code with this solution"
          >
            <FileInput size={13} strokeWidth={2} aria-hidden />
            <span>Load Solution into Editor</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the backdrop's `position: fixed` is sized to the
  // viewport. Left inline, an ancestor with a transform/filter (e.g. the home
  // hero's BlurFade) becomes the containing block and the backdrop shrinks to
  // that ancestor, see app/_components/ChallengeCard.module.css (.modalBackdrop).
  return typeof document === "undefined"
    ? modal
    : createPortal(modal, document.body);
}

/** Human-readable form of a cell value, used both for the visible text
 *  (where applicable) and the `title` tooltip so a value clipped by the
 *  column's max-width is still fully readable on hover. */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Uint8Array) return `<${v.byteLength} bytes>`;
  return String(v);
}

/** Virtualised SQL result table, used both by the main result pane
 *  and the per-table viewer at the bottom of the card. The query
 *  result set is in memory by the time we render (executeSql returns
 *  the full Promise<SqlResult>), so we just render the rows currently
 *  in the viewport via `@tanstack/react-virtual` + a TanStack table for
 *  the column definitions.
 *
 *  The table viewer passes `onLoadMore`/`hasMore` so browsing a large
 *  seeded table scroll-loads further pages on demand (infinite scroll);
 *  the main result pane omits them (the whole result is already here).
 *  Long column names / values are clipped with an ellipsis via CSS and
 *  carry a `title` so the full text stays available on hover. */
export function VirtualizedResultTable({
  columns,
  values,
  maxHeight,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: {
  columns: string[];
  values: unknown[][];
  /** CSS max-height of the scroll container. Defaults to 320px so a
   *  giant result set doesn't push the whole page below the fold. */
  maxHeight?: number;
  /** Called when the viewport nears the bottom and `hasMore` is true.
   *  Omit for fully-in-memory result sets (no paging). */
  onLoadMore?: () => void;
  /** Whether another page of rows exists past what's rendered. */
  hasMore?: boolean;
  /** Whether the next page is currently being fetched. */
  loadingMore?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Stable row identity, TanStack Table keys rows by index when no
  // explicit id is supplied, which is fine here since the result set
  // never re-sorts in this component.
  const data = useMemo(
    () => values.map((row, i) => ({ __idx: i, row })),
    [values],
  );
  const columnHelper = useMemo(
    () =>
      createColumnHelper<typeof RESULT_TABLE_FEATURES, ResultRow>(),
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
            return cellText(v);
          },
        }),
      ),
    [columns, columnHelper],
  );
  const table = useTable({
    features: RESULT_TABLE_FEATURES,
    data,
    columns: tableColumns,
  });
  const tableRows = table.getRowModel().rows;
  // This suppression used to sit on `useReactTable`, where it masked the
  // virtualizer's own report — the rule only names the first incompatible
  // call in a component. React Table v9's `useTable` is compatible, so
  // TanStack Virtual is now the only one left.
  // eslint-disable-next-line react-hooks/incompatible-library -- row virtualization has no compatible alternative here.
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
  // Data columns + the trailing filler column that absorbs leftover width.
  const colSpan = tableColumns.length + 1;

  // Infinite scroll: when the last virtualised row gets within a short
  // distance of the end of what's loaded, ask the owner for the next
  // page. The owner guards against duplicate fetches, so a few extra
  // calls during fast scrolling are harmless.
  const lastIndex =
    virtualRows.length > 0 ? virtualRows[virtualRows.length - 1].index : -1;
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;
    if (lastIndex < 0) return;
    if (lastIndex >= tableRows.length - 1 - 8) {
      onLoadMore();
    }
  }, [lastIndex, hasMore, loadingMore, tableRows.length, onLoadMore]);

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
                <th key={h.id} title={columns[Number(h.column.id)]}>
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
              {/* Filler column, absorbs the leftover width so the data
                  columns only take the space their content needs instead
                  of stretching across the card. */}
              <th className={styles.sqlResultFiller} aria-hidden />
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
                {/* getAllCells, not getVisibleCells: v9 gates visibility
                    behind `columnVisibilityFeature`, and this grid never
                    hides a column, so the two return the same cells. */}
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} title={cellText(row.original.row[Number(cell.column.id)])}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className={styles.sqlResultFiller} aria-hidden />
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden style={{ height: paddingBottom }}>
              <td colSpan={colSpan} />
            </tr>
          )}
          {loadingMore && (
            <tr aria-hidden className={styles.sqlResultLoadingRow}>
              <td colSpan={colSpan}>
                <span className={styles.tableViewerSpinner} /> Loading more rows…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Fixed height (px) of the table viewer's scrollable contents.
const TABLE_VIEWER_HEIGHT = 240;

/** Renders a single table's contents inside the table viewer panel.
 *  Errors and empty-table cases produce a contextual message rather
 *  than a blank pane. Wires the result table's infinite scroll so more
 *  rows stream in as the learner scrolls. */
export function TableViewerPane({
  entry,
  height = TABLE_VIEWER_HEIGHT,
  onLoadMore,
}: {
  entry: TableViewerEntry;
  /** Height (px) of the table's scroll area. */
  height?: number;
  onLoadMore?: () => void;
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
        maxHeight={height}
        onLoadMore={onLoadMore}
        hasMore={entry.hasMore}
        loadingMore={entry.loadingMore}
      />
      <div className={styles.tableViewerFootnote}>
        {entry.loadingMore
          ? "Loading more rows…"
          : entry.hasMore
            ? `${r.values.length} rows loaded, scroll for more`
            : `${r.values.length} row${r.values.length === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

/** Shimmering placeholder rows shown while the WASM engine boots and
 *  seeds, before the first table list is available. */
export function TableViewerSkeleton() {
  return (
    <div className={styles.tableViewerSkeleton} aria-hidden>
      {Array.from({ length: 4 }).map((_, r) => (
        <div key={r} className={styles.skeletonRow}>
          {Array.from({ length: 4 }).map((_, c) => (
            <div key={c} className={styles.skeletonCell} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** The always-visible "Tables" panel shared by `<SqlChallengeCard>` and
 *  `<SqlCodeBlock>`. Shows a loading skeleton until the first table
 *  list is fetched, then a tab bar (styled to match the non-SQL code
 *  block file tabs) plus the active table's paginated contents. The
 *  panel is not collapsible and renders at a fixed height. */
export function TableViewer({
  dialect,
  entries,
  activeIdx,
  setActiveIdx,
  initializing,
  onLoadMore,
  resultTabData,
  bootState,
}: {
  dialect: SqlDialect;
  entries: TableViewerEntry[];
  activeIdx: number;
  setActiveIdx: React.Dispatch<React.SetStateAction<number>>;
  initializing: boolean;
  onLoadMore: () => void;
  resultTabData?: ResultTabData | null;
  /** When set, the dialect's WASM engine is still downloading / seeding;
   *  show the shared branded boot loader in place of the skeleton (and
   *  in the result area for table-less blocks) so SQL matches the other
   *  runtimes' first-run loading affordance. */
  bootState?: SqlEngineBootState | null;
}) {
  const [resultTabDismissed, setResultTabDismissed] = useState(false);
  const [resultIsActive, setResultIsActive] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const prevRunSeqRef = useRef<number>(-1);

  useEffect(() => {
    if (resultTabData == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset synced to the resultTabData prop
      setResultTabDismissed(false);
      setResultIsActive(false);
      return;
    }
    if (resultTabData.runSeq !== prevRunSeqRef.current) {
      prevRunSeqRef.current = resultTabData.runSeq;
      setResultTabDismissed(false);
      setResultIsActive(true);
      setFlashKey((k) => k + 1);
    }
  }, [resultTabData]);

  const resultTabVisible = resultTabData != null && !resultTabDismissed;
  // While the engine cold-boots there are no tables (and any result tab
  // is only showing "Running…"), so the boot loader takes the panel,
  // mirroring how the non-SQL blocks show the notice before first output.
  const showBootNotice = bootState != null && entries.length === 0;
  const showSkeleton =
    !showBootNotice && initializing && entries.length === 0 && !resultTabVisible;
  // Nothing to show: engine ready, no tables found, no result yet.
  if (
    !showBootNotice &&
    !showSkeleton &&
    entries.length === 0 &&
    !resultTabVisible
  )
    return null;
  const active = entries[activeIdx];
  return (
    <div className={styles.tableViewer}>
      {showBootNotice ? (
        <div className={styles.tableViewerBoot}>
          <RuntimeBootNotice
            language={sqlDialectDisplayName(bootState.dialect)}
            statusMessage={bootState.message}
            cold={bootState.cold}
            downloadMB={bootState.cold ? bootState.downloadMB : undefined}
            fraction={null}
            testId="sql-boot"
          />
        </div>
      ) : showSkeleton ? (
        <TableViewerSkeleton />
      ) : (
        <>
          <div className={styles.tableViewerTabs} role="tablist">
            {entries.map((entry, idx) => (
              <button
                key={`${entry.schema ?? ""}.${entry.table}`}
                type="button"
                role="tab"
                aria-selected={idx === activeIdx}
                className={`${styles.tableViewerTab} ${
                  idx === activeIdx && !resultIsActive ? styles.tableViewerTabActive : ""
                }`}
                onClick={() => { setActiveIdx(idx); setResultIsActive(false); }}
              >
                <Table size={12} aria-hidden />
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
            {resultTabVisible && (
              <button
                type="button"
                role="tab"
                aria-selected={resultIsActive}
                className={`${styles.tableViewerTab} ${resultIsActive ? styles.tableViewerTabActive : ""}`}
                onClick={() => setResultIsActive(true)}
              >
                <List size={12} aria-hidden />
                Result
                <span
                  role="button"
                  aria-label="Close result tab"
                  className={styles.resultTabClose}
                  onClick={(e) => {
                    e.stopPropagation();
                    setResultTabDismissed(true);
                    setResultIsActive(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setResultTabDismissed(true);
                      setResultIsActive(false);
                    }
                  }}
                  tabIndex={0}
                >
                  <X size={10} aria-hidden />
                </span>
              </button>
            )}
          </div>
          {resultIsActive && resultTabVisible && resultTabData ? (
            <div
              className={`${styles.resultPane}${resultTabData.loading ? ` ${styles.resultPaneBusy}` : ""}`}
              style={{ position: "relative" }}
            >
              {flashKey > 0 && (
                <div key={flashKey} className={styles.resultFlashOverlay} aria-hidden />
              )}
              {/* Mirrors TableViewerPane's layout, table first, then the
                  row-count footnote, so the Result tab reads exactly like
                  the table tabs. The execution time rides along in the
                  footnote instead of a separate info bar above the table. */}
              {resultTabData.error ? (
                <div className={styles.sqlMessage} style={{ color: "var(--ch-red)" }}>
                  {resultTabData.error}
                </div>
              ) : resultTabData.resultSet && resultTabData.resultSet.columns.length > 0 ? (
                resultTabData.resultSet.values.length === 0 ? (
                  <>
                    <div className={styles.sqlEmptyResult}>Query returned no rows.</div>
                    <div className={styles.tableViewerFootnote}>
                      0 rows
                      {resultTabData.elapsed ? ` · ${resultTabData.elapsed}` : ""}
                    </div>
                  </>
                ) : (
                  <>
                    <VirtualizedResultTable
                      columns={resultTabData.resultSet.columns}
                      values={resultTabData.resultSet.values}
                      maxHeight={TABLE_VIEWER_HEIGHT}
                    />
                    <div className={styles.tableViewerFootnote}>
                      {resultTabData.resultSet.values.length} row
                      {resultTabData.resultSet.values.length === 1 ? "" : "s"}
                      {resultTabData.elapsed ? ` · ${resultTabData.elapsed}` : ""}
                    </div>
                  </>
                )
              ) : resultTabData.message ? (
                <div className={styles.sqlMessage}>
                  {resultTabData.message}
                  {resultTabData.elapsed ? ` · ${resultTabData.elapsed}` : ""}
                </div>
              ) : null /* No "Running…" text; a centered spinner below
                          signals the run; .resultPaneBusy reserves height. */}
              {resultTabData.loading && (
                <div className={styles.runSpinner} aria-hidden="true">
                  <DiamondSpinner size={28} label="Running…" />
                </div>
              )}
            </div>
          ) : (
            active && (
              <TableViewerPane
                // Re-key per table so switching tabs resets scroll to the
                // top instead of inheriting the previous table's offset.
                key={`${active.schema ?? ""}.${active.table}`}
                entry={active}
                height={TABLE_VIEWER_HEIGHT}
                onLoadMore={onLoadMore}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
