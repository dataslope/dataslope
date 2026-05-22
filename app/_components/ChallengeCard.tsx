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
import { Box, RotateCcw, Check, X, ChevronDown, Clock, Eye } from "lucide-react";
import {
  CopyIcon,
  PlayIcon,
  FormatIcon,
  renderInstructions,
  useChallengeToasts,
  ChallengeToastViewport,
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
import { getSharedRuntime, RuntimeScope } from "./runtimeRegistry";
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
  /** Rendered above the editor. Pass MDX content / React elements, or a
   *  markdown string for terser authoring. Strings support paragraphs,
   *  bullet lists, **bold**, *italic*, and `inline code`. */
  instructions: React.ReactNode | string;
  /** Optional initialization code prepended verbatim to the user's
   *  code on every run. Rendered in a collapsed-by-default read-only
   *  panel above the editor, mirroring `<CodeBlock>`'s `initCode`. */
  initCode?: string;
  /** Starting source loaded into the editor. The Reset button restores
   *  this exact text. */
  initialCode: string;
  /** Canonical reference solution. When provided, a "Show Solution"
   *  button appears in the toolbar that opens a read-only modal. */
  solutionCode?: string;
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
  initCode,
  initialCode,
  solutionCode,
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
  const solutionEditorHostRef = useRef<HTMLDivElement | null>(null);
  const solutionEditorRef = useRef<EditorView | null>(null);
  // Shared per-adapter runtime, scoped to the fumadocs surface: every
  // `<CodeBlock>` / `<ChallengeCard>` rendered on the /learn route
  // (across pages, within the same SPA session) reuses one runtime
  // instance via `getSharedRuntime(RuntimeScope.Fumadocs, …)`. The
  // `<Playground>` lives in a separate scope, so its installed
  // packages / staged VFS files cannot bleed into challenge results.
  // State isolation between cards in the same scope is the adapter's
  // responsibility — each `run()` wipes user globals before evaluating
  // the next snippet.
  const runtimeRef = useRef<LanguageRuntime | null>(null);
  const runSeqRef = useRef(0);
  // Latest run handler — keeps the CodeMirror keymap closure
  // (registered once at mount) wired to the current function.
  const runRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [elapsed, setElapsed] = useState<string>("");
  const [initExpanded, setInitExpanded] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);
  const toasts = useChallengeToasts();

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

  // Mount the read-only solution editor lazily when the modal opens.
  useEffect(() => {
    if (!solutionOpen || !solutionCode) return;
    if (!solutionEditorHostRef.current || solutionEditorRef.current) return;
    const languageComp = new Compartment();
    const view = new EditorView({
      doc: solutionCode,
      parent: solutionEditorHostRef.current,
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
    solutionEditorRef.current = view;
    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
      if (ext && solutionEditorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      view.destroy();
      solutionEditorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionOpen]);

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

      // Re-use the shared per-adapter runtime — see runtimeRegistry.ts.
      // Once Pyodide / WebR / CheerpJ has loaded for any block on this
      // page, every other `<CodeBlock>` and `<ChallengeCard>` for the
      // same language attaches to that same worker instead of spinning
      // up its own. The adapter's `run()` wipes user globals before
      // every execution, so cards still can't observe each other's
      // variable state.
      if (!runtimeRef.current) {
        runtimeRef.current = await getSharedRuntime(
          RuntimeScope.Fumadocs,
          adapter,
          (msg) => {
            if (runSeqRef.current === mySeq) setStatusMessage(msg);
          },
        );
      }
      const runtime = runtimeRef.current;
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
    toasts.show("Reset to starter code.");
  }, [initialCode, toasts]);

  const copyCode = useCallback(async () => {
    const code = editorRef.current?.state.doc.toString() ?? "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        toasts.show("Code copied to clipboard.");
      } else {
        toasts.show("Clipboard unavailable in this browser.", "warn");
      }
    } catch {
      toasts.show("Couldn't copy code — clipboard blocked.", "warn");
    }
  }, [toasts]);

  const formatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    try {
      const formatted = await adapter.formatCode(code);
      if (formatted === code) {
        toasts.show("Already formatted — nothing to change.");
        return;
      }
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
      toasts.show("Code formatted.");
    } catch {
      toasts.show("Couldn't format — code may have a syntax error.", "warn");
    }
  }, [adapter, toasts]);

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
        <div className={styles.headerRow}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} /> {badge}
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.headerBlockId}>
              <Box size={12} aria-hidden /> {blockId}
            </span>
            <span className={styles.headerDivider} aria-hidden />
            <span className={styles.headerRuntimeLabel}>
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
        {(estimatedTime || category) && (
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
        )}
      </div>

      {/* ── Instructions ── */}
      <div className={styles.instructions}>
        <div className={styles.instructionsBody}>
          {renderInstructions(instructions)}
        </div>
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
        <div className={styles.btnGroupPrimary}>
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
          {canCheck && (
            <button
              type="button"
              className={styles.checkBtn}
              onClick={() => void check()}
              disabled={isBusy}
            >
              <Check size={12} strokeWidth={2.5} aria-hidden />
              <span>Submit</span>
              <span className={styles.btnKbd} title="Shift + Enter">
                <kbd className={styles.kbd}>⇧</kbd>
                <span className={styles.kbdSep} aria-hidden>+</span>
                <kbd className={styles.kbd}>↵</kbd>
              </span>
            </button>
          )}
        </div>
        <div className={styles.btnGroupUtil}>
          <button
            type="button"
            className={styles.utilBtn}
            onClick={reset}
            disabled={isBusy}
          >
            <RotateCcw size={12} strokeWidth={2.4} aria-hidden />
            Reset
          </button>
          {solutionCode && (
            <>
              <div className={styles.btnGroupUtilSep} aria-hidden />
              <button
                type="button"
                className={styles.utilBtn}
                onClick={() => setSolutionOpen(true)}
                disabled={isBusy}
              >
                <Eye size={12} strokeWidth={2} aria-hidden />
                Solution
              </button>
            </>
          )}
          {adapter.formatCode && (
            <>
              <div className={styles.btnGroupUtilSep} aria-hidden />
              <button
                type="button"
                className={styles.utilBtn}
                onClick={() => void formatCode()}
                disabled={isBusy}
                title="Format code"
              >
                <FormatIcon />
                Format
              </button>
            </>
          )}
          <div className={styles.btnGroupUtilSep} aria-hidden />
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => void copyCode()}
            title="Copy code"
            aria-label="Copy code"
          >
            <CopyIcon />
          </button>
        </div>
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

      {/* ── Solution modal ── */}
      {solutionOpen && solutionCode && (
        <SolutionModal
          onClose={() => setSolutionOpen(false)}
          editorHostRef={solutionEditorHostRef}
          source={solutionCode}
        />
      )}

      <ChallengeToastViewport
        toasts={toasts.toasts}
        onDismiss={toasts.dismiss}
        className={styles.toastViewport}
        itemClassName={styles.toast}
      />
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
            onClick={() => void copySolution()}
            aria-label="Copy solution"
            title="Copy solution"
            className={styles.copyBtn}
            style={{ marginLeft: "auto" }}
          >
            <CopyIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={styles.copyBtn}
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
