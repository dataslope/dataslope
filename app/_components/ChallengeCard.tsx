"use client";

/**
 * `ChallengeCard` — an executable coding-challenge embeddable for the
 * `/learn` pages. Visually matches the "Python Challenge" design from
 * the handoff bundle, but is intentionally language-agnostic so the
 * same component will host upcoming R and TypeScript challenges.
 *
 * Architecture mirrors `<CodeBlock>`:
 *   - A shared per-adapter runtime is fetched via `getSharedRuntime`,
 *     so multiple challenge cards on the same page share one worker.
 *   - The CodeMirror editor uses the same theme + language loader as
 *     the surrounding playground / code blocks.
 *
 * What's different from a CodeBlock:
 *   - There's a header (badge + title + meta + status), an
 *     instructions panel with an optional hint, and a Check Answer
 *     button that runs a test harness on top of the user's submission.
 *   - Test results render in a collapsible panel with a pass/fail
 *     banner. The harness is language-specific and lives in
 *     `challengeHarness.ts`.
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
import { Box, RotateCcw, Check, X, ChevronDown, Clock } from "lucide-react";
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
import { loadLanguage, themeFor } from "./cmExtensions";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
} from "./types";
import {
  buildHarness,
  canRunTests,
  evaluateStdoutExpect,
  isNativeTest,
  isStdoutTest,
  parseHarnessOutput,
  type ChallengeTest,
  type ParsedTestResult,
} from "./challengeHarness";
import styles from "./ChallengeCard.module.css";

type Status = "idle" | "loading" | "ready" | "running" | "error";
type TestState = "pending" | "pass" | "fail";

interface DisplayedTest {
  id: string;
  name: string;
  description: string;
  state: TestState;
  detail: string | null;
}

export interface ChallengeCardProps {
  /** Language adapter used for both running the code and building the
   *  test harness. Pass the same instance as a CodeBlock would. */
  adapter: LanguageAdapter;
  /** Challenge title shown in the header. */
  title: string;
  /** Optional uppercase badge label. Defaults to "Challenge". */
  badge?: string;
  /** Optional category descriptor, rendered after the time pill.
   *  Free-form — e.g. "pandas · groupby · agg". */
  category?: string;
  /** Optional estimated time, e.g. "~5 min". */
  estimatedTime?: string;
  /** Rendered above the editor. Pass MDX content or React elements. */
  instructions: React.ReactNode;
  /** Optional hint, revealed when the user clicks "Show hint". */
  hint?: React.ReactNode;
  /** Optional initialization code prepended verbatim to the user's
   *  code on every run. Rendered in a collapsed-by-default read-only
   *  panel above the editor, mirroring `<CodeBlock>`'s `initCode`. */
  initCode?: string;
  /** Starting source loaded into the editor. The Reset button restores
   *  this exact text. */
  initialCode: string;
  /** Tests run when "Check Answer" is pressed. Each test's `code`
   *  should `assert`/`throw`/`stop()` on failure and be silent on
   *  success — the language-specific harness wraps the rest. */
  tests: ChallengeTest[];
}

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod/.test(platform) || /Macintosh/.test(ua);
}

// The challenge card is intentionally light-themed even when the
// surrounding docs are dark — the design treats it as a "worksheet"
// card rather than a console. We always render the IntelliJ IDEA
// CodeMirror theme so the editor matches the card chrome.
const CM_EDITOR_THEME = "idea";

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

function LanguageGlyph({ adapter }: { adapter: LanguageAdapter }) {
  const Icon = LANGUAGE_ICONS[adapter.id];
  const color = LANGUAGE_ICON_COLORS[adapter.id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[adapter.id] ?? 1;
  if (!Icon) return <span aria-hidden>{adapter.logoText}</span>;
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

function useBlockId(adapter: LanguageAdapter): string {
  const reactId = useId();
  return useMemo(() => {
    let h = 0;
    for (let i = 0; i < reactId.length; i++) {
      h = (h * 31 + reactId.charCodeAt(i)) >>> 0;
    }
    const suffix = h.toString(16).slice(0, 4).padStart(4, "0");
    const prefix =
      adapter.logoText.charAt(0).toUpperCase() +
      adapter.logoText.slice(1).toLowerCase();
    return `${prefix}Block-${suffix}`;
  }, [reactId, adapter.logoText]);
}

export default function ChallengeCard({
  adapter,
  title,
  badge = "Challenge",
  category,
  estimatedTime,
  instructions,
  hint,
  initCode,
  initialCode,
  tests,
}: ChallengeCardProps) {
  const blockId = useBlockId(adapter);
  const trimmedInit = initCode?.trimEnd() ?? "";
  const hasInit = trimmedInit.length > 0;
  const initLineCount = hasInit ? trimmedInit.split("\n").length : 0;
  const initPanelId = `${blockId}-init`;

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const initEditorHostRef = useRef<HTMLDivElement | null>(null);
  const initEditorRef = useRef<EditorView | null>(null);
  // Per-card runtime. Each `<ChallengeCard>` gets its own instance —
  // sharing across cards would let one challenge's state (Pyodide
  // globals, micropip installs, monkey-patched modules) influence
  // another's, which would make challenge results dependent on page
  // history. The runtime is initialised lazily on first Run / Check
  // and cached in this ref for subsequent runs of the same card.
  const runtimePromiseRef = useRef<Promise<LanguageRuntime> | null>(null);
  const runSeqRef = useRef(0);
  // Latest run handler — keeps the CodeMirror keymap closure
  // (registered once at mount) wired to the current function.
  const runRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [elapsed, setElapsed] = useState<string>("");
  const [initExpanded, setInitExpanded] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);

  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  const canCheck = canRunTests(adapter.id, tests);

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();
    const lineOffset = hasInit ? initLineCount : 0;

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
        lineNumbersExt({
          formatNumber: lineOffset
            ? (n) => String(n + lineOffset)
            : undefined,
        }),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        EditorState.tabSize.of(4),
        indentUnit.of("    "),
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

    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
      if (ext && editorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      view.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount the read-only init editor lazily when expanded.
  useEffect(() => {
    if (!hasInit || !initExpanded) return;
    if (!initEditorHostRef.current || initEditorRef.current) return;
    const languageComp = new Compartment();
    const view = new EditorView({
      doc: trimmedInit,
      parent: initEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(4),
        indentUnit.of("    "),
        EditorView.lineWrapping,
        languageComp.of([]),
        themeFor(CM_EDITOR_THEME),
      ],
    });
    initEditorRef.current = view;
    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
      if (ext && initEditorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      view.destroy();
      initEditorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInit, initExpanded]);

  // ─── Execution helpers ─────────────────────────────────────────────

  /** Execute a single combined snippet against the shared runtime,
   *  capturing output cells via the streaming emitter. Returns the
   *  collected cells and total elapsed milliseconds.
   *
   *  Sentinel-line filtering for the test harness is handled by the
   *  caller (so plain Run can stream raw output, but Check can post-
   *  process the stdout to peel off `__DSTEST__:…` lines). */
  const execute = useCallback(
    async (code: string): Promise<{ cells: OutputCell[]; elapsedMs: number }> => {
      const mySeq = ++runSeqRef.current;
      setOutputs([]);
      setStatus("loading");
      setStatusMessage("Initializing runtime…");

      // Lazily spin up an isolated runtime for this card on first run.
      // Cache the promise (not just the resolved runtime) so two near-
      // simultaneous calls — e.g. clicking Run then Check in quick
      // succession before the first init resolves — share the same init
      // instead of racing to create two workers. Each subsequent
      // `runtime.run(...)` call starts with fresh globals because every
      // adapter resets its scope at the start of `run()`.
      if (!runtimePromiseRef.current) {
        runtimePromiseRef.current = adapter
          .init((msg) => {
            if (runSeqRef.current === mySeq) setStatusMessage(msg);
          })
          .catch((err) => {
            // Don't poison the cache with a failed init — let the next
            // attempt try again.
            runtimePromiseRef.current = null;
            throw err;
          });
      }
      const runtime = await runtimePromiseRef.current;
      if (runSeqRef.current !== mySeq)
        return { cells: [], elapsedMs: 0 };

      setStatus("running");
      setStatusMessage("Running…");

      const startedAt = performance.now();
      let nextOutputId = 0;
      const cells: OutputCell[] = [];

      await runtime.run(code, (cell) => {
        if (runSeqRef.current !== mySeq) return;
        const elapsedMs = performance.now() - startedAt;
        const fmt =
          elapsedMs < 1000
            ? `${elapsedMs.toFixed(0)}ms`
            : `${(elapsedMs / 1000).toFixed(2)}s`;
        const full: OutputCell = {
          id: ++nextOutputId,
          elapsed: fmt,
          ...cell,
        };
        cells.push(full);
      });

      const elapsedMs = performance.now() - startedAt;
      return { cells, elapsedMs };
    },
    [adapter],
  );

  const formatElapsed = (ms: number) =>
    ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

  // ─── Run (no tests) ────────────────────────────────────────────────
  const run = useCallback(async () => {
    const userCode = editorRef.current?.state.doc.toString() ?? "";
    const combined = hasInit ? `${trimmedInit}\n${userCode}` : userCode;
    try {
      const { cells, elapsedMs } = await execute(combined);
      setOutputs(cells);
      setElapsed(formatElapsed(elapsedMs));
      const erred = cells.some((c) => c.type === "stderr");
      setStatus(erred ? "error" : "ready");
      setStatusMessage(erred ? "Errored" : "Done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutputs([
        {
          id: 1,
          type: "stderr",
          content: message,
          elapsed: "",
        },
      ]);
      setStatus("error");
      setStatusMessage(message);
    }
  }, [execute, hasInit, trimmedInit]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    const userCode = editorRef.current?.state.doc.toString() ?? "";
    const userPart = hasInit ? `${trimmedInit}\n${userCode}` : userCode;
    // Build a native harness for the subset of tests that have a `code`
    // field. Stdout-based tests are evaluated separately after the run.
    const harness = buildHarness(adapter.id, tests);
    const combined = harness ? `${userPart}\n${harness}` : userPart;

    // Pre-populate the test panel in pending state so the user sees the
    // list immediately while the runtime warms up.
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

    try {
      const { cells, elapsedMs } = await execute(combined);

      // Split stdout cells into "user-visible" + parsed harness results.
      // Non-stdout cells (html / image / plot / stderr) pass through
      // untouched — the harness only emits text. Also collect the raw
      // stdout/stderr text so we can evaluate stdout-based expectations
      // against it.
      const finalCells: OutputCell[] = [];
      const allResults: ParsedTestResult[] = [];
      let cleanStdout = "";
      let stderrText = "";
      for (const cell of cells) {
        if (cell.type === "stderr") {
          stderrText += (stderrText ? "\n" : "") + cell.content;
          finalCells.push(cell);
          continue;
        }
        if (cell.type !== "stdout") {
          finalCells.push(cell);
          continue;
        }
        const { clean, results } = parseHarnessOutput(cell.content);
        allResults.push(...results);
        if (clean.length > 0) {
          cleanStdout += (cleanStdout ? "\n" : "") + clean;
          finalCells.push({ ...cell, content: clean });
        }
      }

      // Evaluate stdout-based tests against the cleaned stdout.
      for (const t of tests) {
        if (isStdoutTest(t)) {
          allResults.push(evaluateStdoutExpect(t, cleanStdout, stderrText));
        }
      }

      setOutputs(finalCells);
      setElapsed(formatElapsed(elapsedMs));

      const byId = new Map(allResults.map((r) => [r.id, r]));
      const displayed: DisplayedTest[] = tests.map((t) => {
        const r = byId.get(t.id);
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          state: r ? (r.pass ? "pass" : "fail") : "fail",
          detail: r
            ? r.detail
            : isNativeTest(t)
              ? "Test did not produce a result (the runtime may have errored before reaching this check)."
              : "Test did not run.",
        };
      });
      setTestResults(displayed);

      const passed = displayed.filter((d) => d.state === "pass").length;
      const allPass = passed === displayed.length && displayed.length > 0;
      setBannerState(allPass ? "pass" : "fail");

      const erred = finalCells.some((c) => c.type === "stderr");
      setStatus(erred && !allPass ? "error" : "ready");
      setStatusMessage(
        allPass ? "All tests passed" : `${passed}/${displayed.length} passed`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setOutputs([
        { id: 1, type: "stderr", content: message, elapsed: "" },
      ]);
      setStatus("error");
      setStatusMessage(message);
      setTestResults((prev) =>
        prev.map((t) => ({
          ...t,
          state: "fail",
          detail: t.detail ?? "Runtime error before test could execute.",
        })),
      );
      setBannerState("fail");
    }
  }, [adapter.id, canCheck, execute, hasInit, tests, trimmedInit]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // ─── Reset ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
    setOutputs([]);
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
      // Non-fatal: clipboard permission may be unavailable in this
      // context. Mirrors `<CodeBlock>`'s silent fallback.
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
      aria-label={`${adapter.runtimeInfo.language} coding challenge: ${title}`}
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

      {/* ── PyBlock-style topbar ── */}
      <div className={styles.topbar}>
        <span className={styles.blockId}>
          <Box size={13} aria-hidden /> {blockId}
        </span>
        <span className={styles.topbarDivider} aria-hidden />
        <span className={styles.runtimeLabel}>
          <LanguageGlyph adapter={adapter} />
          {adapter.runtimeInfo.language} {adapter.runtimeInfo.version}
        </span>
        <span
          className={styles.statusDot}
          data-status={status}
          title={statusMessage || status}
          aria-label={statusMessage || status}
        />
      </div>

      {/* ── Init code (collapsed by default) ── */}
      {hasInit && (
        <div className={styles.initWrap}>
          <button
            type="button"
            className={styles.initToggle}
            aria-expanded={initExpanded}
            aria-controls={initPanelId}
            onClick={() => setInitExpanded((v) => !v)}
          >
            <span
              className={`${styles.initCaret} ${
                initExpanded ? styles.initCaretOpen : ""
              }`}
              aria-hidden
            >
              ▶
            </span>
            <span className={styles.initLabel}>
              Initialization code ({adapter.runtimeInfo.language})
            </span>
            <span className={styles.initMeta}>
              {initLineCount} line{initLineCount === 1 ? "" : "s"} · read-only
            </span>
          </button>
          {initExpanded && (
            <div
              id={initPanelId}
              className={styles.initEditor}
              ref={initEditorHostRef}
              aria-label="Initialization code (read-only)"
            />
          )}
        </div>
      )}

      {/* ── Editor ── */}
      <div
        className={styles.editor}
        ref={editorHostRef}
        aria-label={`${adapter.runtimeInfo.language} solution editor`}
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

      {/* ── Output panel ── */}
      {(outputs.length > 0 || isBusy) && (
        <div className={styles.outputPanel} aria-live="polite">
          <div className={styles.outputHeader}>
            <div
              className={styles.accentBar}
              data-error={outputs.some((c) => c.type === "stderr")}
            />
            <span className={styles.outputLabel}>Output</span>
            {elapsed && <span className={styles.outputTime}>{elapsed}</span>}
          </div>
          {outputs.length === 0 ? (
            <div className={styles.outputEmpty}>Running…</div>
          ) : (
            <div className={styles.outputBody}>
              {outputs.map((cell) => (
                <OutputCellView key={cell.id} cell={cell} />
              ))}
            </div>
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
    </div>
  );
}

/** Minimal output cell renderer — text cells use mono-spaced pre-wrap,
 *  HTML cells (DataFrames) get the table styles defined in the
 *  module, image / plot cells fall through to inline rendering. This
 *  is a trimmed copy of `<CodeBlock>`'s `OutputCellView` adjusted for
 *  the lighter challenge-card chrome. */
function OutputCellView({ cell }: { cell: OutputCell }) {
  if (cell.type === "html") {
    return (
      <div
        className={styles.outCellHtml}
        // Same trust assumption as the playground / code block: HTML
        // cells originate from code the user typed in this very widget.
        dangerouslySetInnerHTML={{ __html: cell.content }}
      />
    );
  }
  if (cell.type === "image") {
    return (
      <div className={styles.outCellImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${cell.content}`}
          alt=""
          style={{ maxWidth: "100%" }}
        />
      </div>
    );
  }
  if (cell.type === "stderr") {
    return <div className={styles.outCellStderr}>{cell.content}</div>;
  }
  return <div className={styles.outCellStdout}>{cell.content}</div>;
}
