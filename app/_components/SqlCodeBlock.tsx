"use client";

/**
 * `SqlCodeBlock` — a runnable SQL snippet for the `/learn` route.
 *
 * It's the SQL counterpart to `<CodeBlock>`: an editor + Run button +
 * result table, plus an optional read-only viewer of the seeded tables.
 * Unlike `<SqlChallengeCard>` it has no instructions, no Submit/grading,
 * and no reference-solution button — it's just a place to type SQL and
 * see the result set.
 *
 * Supported dialects: SQLite (via `@sqlite.org/sqlite-wasm`), DuckDB
 * (via `@duckdb/duckdb-wasm`), and PostgreSQL (via PGlite). All run
 * entirely in the browser. The execution engine, result-table renderer,
 * and table-viewer primitives are shared with `<SqlChallengeCard>` so
 * the two components stay visually and behaviourally consistent.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { RotateCcw, ChevronDown, Database } from "lucide-react";
import {
  CopyIcon,
  FormatIcon,
  PlayIcon,
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
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
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
import {
  createEngineForDialect,
  defaultSchemaFor,
  DialectGlyph,
  listTablesSqlFor,
  qualifiedTable,
  RunOverlay,
  sqlFormatterLanguage,
  TableViewerPane,
  VirtualizedResultTable,
  type SqlDialect,
  type SqlEngineLike,
  type SqlResult,
  type SqlTableViewerSpec,
  type TableViewerEntry,
} from "./SqlChallengeCard";

export type { SqlDialect } from "./SqlChallengeCard";

export interface SqlCodeBlockProps {
  dialect: SqlDialect;
  /** Optional heading rendered in the card header. */
  title?: string;
  /** Header badge label. Defaults to "SQL". */
  badge?: string;
  /** Setup SQL run once before the first execution — creates tables,
   *  seeds data, etc. */
  initSql?: string;
  /** Starter SQL shown in the editor. */
  initialCode: string;
  /** Hand-picked tables (and optional schemas) to display in the table
   *  viewer. When omitted, every user table in the default schema is
   *  shown. Set to `false` to suppress the viewer entirely. */
  tables?: SqlTableViewerSpec[] | false;
  /** Maximum rows to fetch per table in the viewer. Default: 50. */
  tableRowLimit?: number;
}

type Status = "idle" | "loading" | "ready" | "running" | "error";

// Minimum time (ms) the "running" overlay stays visible so a fast query
// doesn't blink the wave animation in and back out within a frame.
const MIN_RUN_OVERLAY_MS = 300;
const MIN_FORMAT_MS = 300;

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod/.test(platform) || /Macintosh/.test(ua);
}

export default function SqlCodeBlock({
  dialect,
  title,
  badge = "SQL",
  initSql,
  initialCode,
  tables,
  tableRowLimit = 50,
}: SqlCodeBlockProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const persistSaveTimerRef = useRef<number | null>(null);

  // Stable localStorage key for the user's SQL buffer. `dialect` is in
  // the fingerprint because identical starter SQL can mean different
  // things across engines, and `title` disambiguates blocks that share
  // starter text.
  const persistedKey = useMemo(
    () => persistKey("sql-codeblock", `${dialect}|${title ?? ""}|${initialCode}`),
    [dialect, title, initialCode],
  );

  // Each block owns its own engine instance — sharing across blocks
  // would let one block's CREATE TABLE leak into another's results. The
  // promise (not the resolved engine) is cached so two near-simultaneous
  // clicks share a single boot.
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
  const [tableEntries, setTableEntries] = useState<TableViewerEntry[]>([]);
  const [tableViewerOpen, setTableViewerOpen] = useState(true);
  const [activeTableIdx, setActiveTableIdx] = useState(0);
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
  // Ref so the editor-mount effect (which has [] deps) can read the
  // current theme name without becoming stale.
  const cmThemeNameRef = useRef(cmThemeName);
  useEffect(() => {
    cmThemeNameRef.current = cmThemeName;
  });

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();

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
            key: "Mod-Enter",
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

  // Sync the CodeMirror theme whenever the docs colour scheme toggles.
  useEffect(() => {
    const view = editorRef.current;
    const comp = mainThemeCompRef.current;
    if (view && comp) {
      view.dispatch({ effects: comp.reconfigure(themeFor(cmThemeName)) });
    }
  }, [cmThemeName]);

  // Clean up the engine on unmount so workers don't leak.
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
            const last =
              out.findLast?.((r) => r.columns.length > 0) ??
              [...out].reverse().find((r) => r.columns.length > 0) ??
              null;
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
  // before the learner clicks Run.
  useEffect(() => {
    if (!tableViewerEnabled) return;
    void ensureEngine().catch(() => {
      /* surface errors via the per-table error column instead of blocking mount */
    });
  }, [ensureEngine, tableViewerEnabled]);

  // ─── Execution ──────────────────────────────────────────────────────
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
        const wait = MIN_RUN_OVERLAY_MS - (performance.now() - startedAt);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
        }
      }
      const elapsedMs = performance.now() - startedAt;
      // The "last meaningful result" is the last result set with
      // columns. DML statements come back with empty columns so they
      // shouldn't shadow a preceding SELECT.
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

  // ─── Run ────────────────────────────────────────────────────────────
  const run = useCallback(async () => {
    const userSql = editorRef.current?.state.doc.toString() ?? "";
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
    }
  }, [executeSql, ensureEngine, refreshTableViewer, tableViewerEnabled]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // ─── Reset ──────────────────────────────────────────────────────────
  // Reset restores the starter code AND re-seeds the database so
  // INSERT/UPDATE/DELETE snippets can be retried from a clean slate.
  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
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

  return (
    <div
      className={styles.card}
      data-flavor="sql"
      aria-label={title ? `SQL code block: ${title}` : "SQL code block"}
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
        {title && (
          <div className={styles.titleRow}>
            <div className={styles.title}>{title}</div>
          </div>
        )}
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
        aria-label="SQL editor"
      />

      {/* ── Action bar ── */}
      <div className={styles.actionBar} role="toolbar" aria-label="SQL controls">
        <div className={styles.btnGroupPrimary}>
          <button
            type="button"
            className={styles.runBtn}
            onClick={() => void run()}
            disabled={isBusy}
          >
            {isBusy ? (
              <svg viewBox="0 0 12 12" className={styles.runBtnSpinner} aria-hidden>
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
        </div>
        <div className={styles.btnGroupUtil}>
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
            <div className={styles.accentBar} data-error={resultError.length > 0} />
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
              <div className={styles.sqlEmptyResult}>Query returned no rows.</div>
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
    </div>
  );
}
