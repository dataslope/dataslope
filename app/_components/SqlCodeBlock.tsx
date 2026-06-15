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
import { RotateCcw, Database } from "lucide-react";
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
import { themeFor, noActiveLine, redoKeymap } from "./cmExtensions";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import styles from "./ChallengeCard.module.css";
import {
  DialectGlyph,
  sqlFormatterLanguage,
  TableViewer,
  useSqlEngineBoot,
  useSqlTableViewer,
  type ResultTabData,
  type SqlDialect,
  type SqlResult,
  type SqlTableViewerSpec,
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
  /** Remote dataset to load before `initSql`: a path inside the
   *  dataslope/datasets GitHub repo (e.g. `sqlite/chinook_sqlite.sql`)
   *  or a full URL. The script is downloaded from
   *  raw.githubusercontent.com and executed against the block's engine,
   *  so a block can clone a complete sample database (Chinook,
   *  Northwind, …) without embedding it. `initSql` still runs after it
   *  for any block-specific extras. */
  remoteInitSql?: string;
  /** Starter SQL shown in the editor. */
  starterCode: string;
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
  remoteInitSql,
  starterCode,
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
    () => persistKey("sql-codeblock", `${dialect}|${title ?? ""}|${starterCode}`),
    [dialect, title, starterCode],
  );

  // Each block owns its own engine instance — sharing across blocks
  // would let one block's CREATE TABLE leak into another's results. The
  // shared hook owns the cached boot+seed promise, the live engine
  // label, and the boot-progress state that drives the boot loader.
  const { ensureEngine, engineLabel, bootState, destroyEngine, resetEngine } =
    useSqlEngineBoot({ dialect, initSql, remoteInitSql });
  const runSeqRef = useRef(0);
  const runRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [resultSet, setResultSet] = useState<SqlResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [resultError, setResultError] = useState<string>("");
  const [elapsed, setElapsed] = useState<string>("");
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
          ...redoKeymap,
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
  // Shared with `<SqlChallengeCard>` so both stay consistent.
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
  // before the learner clicks Run.
  useEffect(() => {
    if (!tableViewerEnabled) return;
    void ensureEngine()
      .then((engine) => refreshTableViewer(engine))
      .catch(() => {
        // Lower the skeleton so it doesn't spin forever.
        markTablesInitDone();
      });
  }, [ensureEngine, refreshTableViewer, tableViewerEnabled, markTablesInitDone]);

  // ─── Execution ──────────────────────────────────────────────────────
  const executeSql = useCallback(
    async (
      sql: string,
      // The caller's run sequence (from `++runSeqRef.current`). Owning
      // the increment in the caller lets it guard its own post-await
      // state updates too — a newer run/reset supersedes both this
      // execution's status updates and the caller's final ones.
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
    const mySeq = ++runSeqRef.current;
    setResultRunSeq((s) => s + 1);
    const userSql = editorRef.current?.state.doc.toString() ?? "";
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
      if (tableViewerEnabled) {
        try {
          const engine = await ensureEngine();
          await refreshTableViewer(engine);
        } catch {
          /* viewer refresh failure shouldn't mask the run's success */
        }
      }
    } catch (err) {
      if (runSeqRef.current !== mySeq) return;
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
        changes: { from: 0, to: view.state.doc.length, insert: starterCode },
      });
    }
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
    clearTableViewer();
    if (tableViewerEnabled) {
      void ensureEngine()
        .then((engine) => refreshTableViewer(engine))
        .catch(() => {
          markTablesInitDone();
        });
    }
    toasts.show("Reset to starter SQL.");
  }, [starterCode, persistedKey, resetEngine, ensureEngine, refreshTableViewer, clearTableViewer, markTablesInitDone, tableViewerEnabled, toasts]);

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

  return (
    <div
      className={styles.card}
      data-flavor="sql"
      data-testid="sql-code-block"
      data-run-status={status}
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
        aria-label="SQL editor"
      />

      {/* ── Action bar ── */}
      <div className={styles.actionBar} role="toolbar" aria-label="SQL controls">
        <div className={styles.btnGroupPrimary}>
          <button
            type="button"
            className={styles.runBtn}
            onClick={() => void run()}
            // Also disabled while the table viewer's first load seeds the
            // database, so Run can't race the engine boot.
            disabled={isBusy || tablesInitializing}
            data-testid="sql-codeblock-run"
          >
            {isBusy ? (
              <svg viewBox="0 0 12 12" className={styles.runBtnSpinner} aria-hidden>
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

    </div>
  );
}
