"use client";

/**
 * `SqlCodeBlock`, the SQL counterpart to `<CodeBlock>` for `/learn`:
 * editor + Run + result table + optional viewer of the seeded tables, with
 * no instructions or grading. Dialects (SQLite / DuckDB / PGlite) run
 * entirely in the browser; the engine, result renderer, and table-viewer
 * primitives are shared with `<SqlChallengeCard>`.
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
  type Status,
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
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
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
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import { SqlCardToolsMenu } from "./sqlCardTools/SqlCardToolsMenu";
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
  /** Setup SQL run once before the first execution (tables, seed data). */
  initSql?: string;
  /** Remote dataset script to run before `initSql`: a path inside the
   *  dataslope/datasets repo or a full URL, so a block can clone a complete
   *  sample database without embedding it. */
  remoteInitSql?: string;
  /** Starter SQL shown in the editor. */
  starterCode: string;
  /** Marks a block whose lesson *is* the failure. Purely declarative, but
   *  the content sweeps assert it in both directions: the block must raise,
   *  and one that stops raising is a regression nothing else would catch.
   *  Surfaced as `data-expect-error` for the e2e sweeps. */
  expectError?: boolean;
  /** Hand-picked tables (and optional schemas) to display in the table
   *  viewer. When omitted, every user table in the default schema is
   *  shown. Set to `false` to suppress the viewer entirely. */
  tables?: SqlTableViewerSpec[] | false;
  /** Maximum rows to fetch per table in the viewer. Default: 50. */
  tableRowLimit?: number;
}

const MIN_FORMAT_MS = 300;

export default function SqlCodeBlock({
  dialect,
  title,
  badge = "SQL",
  initSql,
  remoteInitSql,
  starterCode,
  expectError,
  tables,
  tableRowLimit = 50,
}: SqlCodeBlockProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const persistSaveTimerRef = useRef<number | null>(null);
  // Root card element (Ask AI visibility tracking) and the latest
  // introspected completion schema (reused as the Ask AI schema snapshot).
  const cardRef = useRef<HTMLDivElement | null>(null);
  const askAiSchemaRef = useRef<SqlCompletionSchema | null>(null);

  // Stable localStorage key. `dialect` is in the fingerprint because the
  // same starter SQL can mean different things across engines; `title`
  // disambiguates blocks sharing starter text.
  const persistedKey = useMemo(
    () => persistKey("sql-codeblock", `${dialect}|${title ?? ""}|${starterCode}`),
    [dialect, title, starterCode],
  );
  // The hash tail of that key, reused as the block's id in the exported
  // workbook's filename: already stable per block, already short.
  const exportId = persistedKey.slice(persistedKey.lastIndexOf(":") + 1);

  // Each block owns its own engine instance — sharing would let one block's
  // CREATE TABLE leak into another's results.
  const { ensureEngine, engineLabel, bootState, destroyEngine, resetEngine } =
    useSqlEngineBoot({ dialect, initSql, remoteInitSql });
  // Raw `exec` handle for the header's tools menu (Excel export, ER
  // diagram, DDL), reading the same live database the block queries.
  const ensureExec = useCallback(async () => {
    const engine = await ensureEngine();
    return (sql: string) => engine.exec(sql);
  }, [ensureEngine]);
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
    const completionComp = new Compartment();

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
        // Schema-aware completion, seeded empty so keywords complete right
        // away; reconfigured with live tables/columns once the engine
        // boots (see `refreshCompletionSchema`).
        completionComp.of(makeSqlAutocompletionExtension({ entities: [] }, dialect)),
        keymap.of([
          {
            key: "Mod-Enter",
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

  // Rebuild the completion schema from the live database after engine boot
  // and after every run, so newly-created tables complete immediately.
  // Best-effort: failures leave the previous schema in place.
  const refreshCompletionSchema = useCallback(
    async (engine: { exec: (sql: string) => Promise<SqlResult[]> }) => {
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

  // Ask AI context: the block registers itself so the assistant can see the
  // SQL the user is editing, the last error/result, and the live schema.
  useAskAiSource({
    kind: "code-block",
    label: title ? `SQL code block: ${title}` : `SQL code block (${dialect})`,
    elementRef: cardRef,
    getSnapshot: () => ({
      content: describeSqlSurface({
        dialect,
        sql: editorRef.current?.state.doc.toString() ?? "",
        error: resultError,
        resultSummary: resultSet
          ? `${resultSet.values.length} row(s): ${resultSet.columns.join(", ")}`
          : resultMessage,
      }),
      schema: formatSqlSchemaText(askAiSchemaRef.current),
    }),
  });

  // Sync the CodeMirror theme whenever the docs color scheme toggles.
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
  // before the learner clicks Run. The completion schema piggybacks on
  // the same boot.
  useEffect(() => {
    if (!tableViewerEnabled) return;
    void ensureEngine()
      .then((engine) => {
        void refreshCompletionSchema(engine);
        return refreshTableViewer(engine);
      })
      .catch(() => {
        // Lower the skeleton so it doesn't spin forever.
        markTablesInitDone();
      });
  }, [ensureEngine, refreshTableViewer, refreshCompletionSchema, tableViewerEnabled, markTablesInitDone]);

  // ─── Execution ──────────────────────────────────────────────────────
  const executeSql = useCallback(
    async (
      sql: string,
      // The caller's run sequence; owning the increment there lets it guard
      // its own post-await state updates too.
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
      // Last result set WITH columns: DML comes back with empty columns and
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
    }
  }, [executeSql, ensureEngine, refreshTableViewer, refreshCompletionSchema, tableViewerEnabled]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // ─── Reset ──────────────────────────────────────────────────────────
  // Restores the starter code AND re-seeds the database so DML snippets can
  // be retried from a clean slate.
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
        .then((engine) => {
          void refreshCompletionSchema(engine);
          return refreshTableViewer(engine);
        })
        .catch(() => {
          markTablesInitDone();
        });
    }
    toasts.show("Reset to starter SQL.");
  }, [starterCode, persistedKey, resetEngine, ensureEngine, refreshTableViewer, refreshCompletionSchema, clearTableViewer, markTablesInitDone, tableViewerEnabled, toasts]);

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
    <div className={styles.cardShell}>
    <div
      ref={cardRef}
      className={styles.card}
      data-flavor="sql"
      data-testid="sql-code-block"
      data-run-status={status}
      data-expect-error={expectError ? "true" : undefined}
      aria-label={title ? `SQL code block: ${title}` : "SQL code block"}
    >
      {/* ── Header ── */}
      <div className={`${styles.header} ${styles.headerCompact}`}>
        <div className={styles.headerRow}>
          <div className={styles.badge}>
            <Database size={13} aria-hidden /> {badge}
          </div>
          <div className={styles.headerMeta}>
            <SqlCardToolsMenu
              dialect={dialect}
              ensureExec={ensureExec}
              disabled={isBusy}
              surface="sql-code-block"
              exportId={exportId}
              showToast={toasts.show}
            />
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
    </div>
  );
}
