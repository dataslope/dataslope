"use client";

/**
 * `ChallengeCard`, a language-agnostic executable coding-challenge
 * embeddable for the `/learn` pages. Mirrors `<CodeBlock>` (shared
 * per-adapter runtime via `getSharedRuntime`, same editor setup) and adds
 * instructions, a Check Answer flow that runs the language-specific harness
 * from `challengeHarness.ts`, and a test-results panel with a pass/fail
 * banner.
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
import { RotateCcw, Check, CheckCheck, ListChecks, ListX, X, ChevronDown, ChevronUp, Eye, File, FileInput, Info, Play, Terminal } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import {
  CopyIcon,
  PlayIcon,
  FormatIcon,
  renderInstructions,
  useChallengeToasts,
  ChallengeToastViewport,
  useCreepingBootFraction,
  useMidRunPreparing,
  useIsDark,
  cmThemeNameFor,
  TestResultsRail,
  type Status,
  type TestState,
  type DisplayedTest,
  detectIsMac,
  MIN_RUN_OVERLAY_MS,
  lineNumbersWithOffset,
  LanguageGlyph,
  useBlockId,
} from "./challengeShared";
import { RuntimeBootNotice } from "./RuntimeBootNotice";
import { DiamondSpinner } from "./mdx/loadingAnimations";
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
import { loadLanguage, themeFor, noActiveLine, redoKeymap } from "./cmExtensions";
import { aiInlineCompletion } from "./ai/inlineCompletion";
import { useAskAiSource } from "./ai/contextRegistry";
import { describeChallenge } from "./ai/widgetSnapshots";
import { languageCompletion } from "./completion/languageCompletion";
import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
} from "./types";
import {
  getSharedRuntime,
  isRuntimeReady,
  retainRuntime,
  RuntimeScope,
} from "./runtimeRegistry";
import {
  datasetStageFilename,
  fetchDatasetBytes,
  type DatasetStageSpec,
} from "./runtime/remoteDatasets";
import { warmRuntimeOnRouteLand } from "./runtime/warmup";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import {
  buildHarness,
  canRunTests,
  evaluateStdoutExpect,
  isNativeTest,
  isStdoutTest,
  parseHarnessOutput,
  stdoutExpectSummary,
  type ChallengeTest,
  type ParsedTestResult,
} from "./challengeHarness";
import { appendOutputCell } from "./outputCells";
import { mergeInitAndEntry } from "./runtime/mergeInit";
import { STDIN_FILENAME, normalizeStdin } from "./runtime/stdinFile";
import { PlotlyChart } from "./PlotlyChart";

import styles from "./ChallengeCard.module.css";
import codeBlockStyles from "./CodeBlock.module.css";
import { previewStageStyle } from "./previewStage";

/** One file in a challenge workspace (single-file authors pass a
 *  one-element `files` array). */
export interface ChallengeFile {
  /** Workspace-relative filename, e.g. `"Dog.java"`. */
  filename: string;
  /** Optional read-only init code for THIS file, prepended verbatim on
   *  every run and shown in a collapsed read-only panel above the editor. */
  initCode?: string;
  /** Starter content shown in the editor; Reset restores this exact text. */
  starterCode: string;
  /** Optional reference solution. Files that omit it are shown in the
   *  Solution modal with their `starterCode` (scaffold the learner does not
   *  need to modify). */
  solutionCode?: string;
}

/** Imperative driver exposed on `window.__dsChallenges[adapter::title]` for
 *  the Playwright solution sweep. Test-only surface, production code must
 *  not depend on it. */
export interface ChallengeTestHandle {
  adapterId: string;
  title: string;
  entryFilename: string;
  filenames: string[];
  setFileContent(filename: string, content: string): boolean;
  submit(): Promise<void>;
  getStatus(): Status;
  getBannerState(): "pass" | "fail" | null;
  getTestResults(): {
    id: string;
    name: string;
    state: TestState;
    detail: string | null;
  }[];
}

interface SolutionFile {
  filename: string;
  source: string;
  /** True when the file supplied a real `solutionCode` (false = scaffold
   *  echoed back from `starterCode`, labelled "(unchanged)" in the modal). */
  hasSolution: boolean;
  /** True when the displayed solution is identical to `starterCode`; the
   *  modal notes these tabs need no edits. */
  isUnchanged: boolean;
}

export interface ChallengeCardProps {
  /** Language adapter used to run the code and build the test harness. */
  adapter: LanguageAdapter;
  /** Challenge title shown in the header. */
  title: string;
  /** Optional uppercase badge label. Defaults to "Challenge". */
  badge?: string;
  /** Rendered above the editor. MDX/JSX, or a markdown string (paragraphs,
   *  bullets, **bold**, *italic*, `inline code`). */
  instructions: React.ReactNode | string;
  /** Workspace files (at least one). Tests run against `entryFilename` (or
   *  the first file); every other file is staged into the runtime's VFS via
   *  `prepareFileSystem` so multi-file imports/includes resolve. More than
   *  one file (or `showFileTabBar`) renders the tab bar. */
  files: ChallengeFile[];
  /** When `files` has more than one entry, the filename whose content is
   *  passed to `runtime.run()` as the entry. Defaults to the first file. */
  entryFilename?: string;
  /** Remote dataset files staged into the runtime's working directory
   *  before every Run / Check Answer (paths in the dataslope/datasets repo,
   *  or full URLs; downloads are cached globally). Requires a runtime that
   *  implements `prepareFileSystem`. */
  datasets?: DatasetStageSpec[];
  /** Force the file tab bar to render even for a single-file workspace. */
  showFileTabBar?: boolean;
  /**
   * Standard input for the learner's program, shown in an editable STDIN
   * panel under the editor and staged as `stdin.txt` on every run.
   *
   * Same contract as `CodeBlockProps.stdin`: presence is the switch, and it
   * needs `adapter.supportsStdin`. On a card it is also part of the
   * *question* — the tests grade output produced from this input, so the
   * reference solution and the recorded expectation are both written against
   * it. A learner who edits the panel is experimenting, and Reset puts the
   * graded input back.
   */
  stdin?: string;
  /** Tests run when "Check Answer" is pressed. Each test's `code` should
   *  `assert`/`throw`/`stop()` on failure and be silent on success. */
  tests: ChallengeTest[];
  /** Extra importable module names to pre-install at warm-up, merged with
   *  the modules found by scanning the card's own code. Escape hatch for
   *  imports the scan can't see. Python only. */
  packages?: string[];
  /** Inject the pinned Tailwind in-browser compiler into the preview
   *  document on every run. Preview adapters (web / react) only; see
   *  `TAILWIND_BROWSER_CDN` in runtime/cdn.ts. */
  tailwind?: boolean;
  /** Height of the live-preview stage (number → px), preview adapters only.
   *  Reserved from first paint so a Run never grows the card; set it lower
   *  than the 300px default for single-element answers. */
  previewHeight?: number | string;
}

// Line-comment prefix for the "init code runs first" notice prepended to
// displayed solutions; must parse as a no-op so the solution pastes back as
// valid source.
function lineCommentFor(codeMirrorMode: string): string {
  switch (codeMirrorMode) {
    case "python":
    case "r":
      return "#";
    case "sql":
      return "--";
    default:
      return "//";
  }
}

// Stable empty list so cards without a `datasets` prop don't re-create
// hook dependencies on every render.
const NO_DATASETS: DatasetStageSpec[] = [];

export default function ChallengeCard({
  adapter,
  title,
  badge = "Challenge",
  instructions,
  files,
  entryFilename,
  datasets,
  showFileTabBar = false,
  stdin,
  tests,
  packages,
  tailwind = false,
  previewHeight,
}: ChallengeCardProps) {
  const blockId = useBlockId(adapter);
  const initPanelId = `${blockId}-init`;

  // ─── STDIN ──────────────────────────────────────────────────────────
  // Mirrors `<CodeBlock>`: a panel only where the runtime can be fed, the
  // reader's edits in a ref because the CodeMirror doc is the source of
  // truth. See `CodeBlockProps.stdin`.
  const hasStdin = stdin !== undefined && adapter.supportsStdin === true;
  const starterStdin = hasStdin ? stdin : "";
  const stdinPanelId = `${blockId}-stdin`;
  const stdinEditorHostRef = useRef<HTMLDivElement | null>(null);
  const stdinEditorRef = useRef<EditorView | null>(null);
  const stdinThemeCompRef = useRef<Compartment | null>(null);
  const stdinBufferRef = useRef<string | null>(null);
  const stdinSaveTimerRef = useRef<number | null>(null);
  const [stdinExpanded, setStdinExpanded] = useState(starterStdin.length > 0);

  // Guard against an empty `files` array so the rest of the component can
  // assume at least one file.
  const workspaceFiles: ChallengeFile[] = useMemo(() => {
    if (files && files.length > 0) return files;
    const defaultName = `main.${adapter.defaultFileExtension || "txt"}`;
    return [{ filename: defaultName, starterCode: "" }];
  }, [files, adapter.defaultFileExtension]);

  const isMultiFile = workspaceFiles.length > 1;
  const showTabs = isMultiFile || showFileTabBar;
  const resolvedEntryFilename =
    (entryFilename && workspaceFiles.find((f) => f.filename === entryFilename)
      ? entryFilename
      : workspaceFiles[0].filename) ?? workspaceFiles[0].filename;

  // Mirrored into a ref so the mount-once warm-up effect can prefetch
  // datasets without re-registering when MDX re-creates the prop array.
  const cardDatasets = datasets ?? NO_DATASETS;
  const datasetsRef = useRef(cardDatasets);
  useEffect(() => {
    datasetsRef.current = cardDatasets;
  }, [cardDatasets]);

  // Everything this card could execute, passed to `runtime.warmPackages` so
  // heavy optional packages only download for cards whose code imports them.
  // A ref, so the warm-up observer doesn't re-register on prop identity.
  const warmHintRef = useRef<{ sources: string[]; packages?: string[] }>({
    sources: [],
  });
  useEffect(() => {
    const sources: string[] = [];
    for (const file of files ?? []) {
      if (file.initCode) sources.push(file.initCode);
      sources.push(file.starterCode);
      if (file.solutionCode) sources.push(file.solutionCode);
    }
    for (const test of tests) {
      if (isNativeTest(test)) sources.push(test.code);
    }
    warmHintRef.current = { sources, packages };
  }, [files, tests, packages]);

  // Per-file read-only init code (trimmed); the init drawer and the
  // editor's line-number offset both track the active tab's file.
  const initForFile = useCallback(
    (filename: string) => {
      const f = workspaceFiles.find((wf) => wf.filename === filename);
      return f?.initCode?.trimEnd() ?? "";
    },
    [workspaceFiles],
  );

  // ─── Solution files ─────────────────────────────────────────────────
  // Per-file solution view for the modal: files without `solutionCode` show
  // their starter. The modal opens iff at least one file has a solution.
  const solutionFiles: SolutionFile[] = useMemo(() => {
    return workspaceFiles.map((file) => {
      const source = file.solutionCode ?? file.starterCode;
      return {
        filename: file.filename,
        source,
        hasSolution: file.solutionCode !== undefined,
        isUnchanged: source === file.starterCode,
      };
    });
  }, [workspaceFiles]);
  const hasSolution = solutionFiles.some((f) => f.hasSolution);

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const initEditorHostRef = useRef<HTMLDivElement | null>(null);
  const initEditorRef = useRef<EditorView | null>(null);
  const solutionEditorHostRef = useRef<HTMLDivElement | null>(null);
  const solutionEditorRef = useRef<EditorView | null>(null);
  // Compartments, stored so effects can reconfigure theme / line-number
  // offset / language without remounting the editor.
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const initThemeCompRef = useRef<Compartment | null>(null);
  const solutionThemeCompRef = useRef<Compartment | null>(null);
  const mainLineNumberCompRef = useRef<Compartment | null>(null);
  const mainLanguageCompRef = useRef<Compartment | null>(null);
  // Preview iframe slot; always in the DOM for preview-capable adapters so
  // the element exists by the time `runtime.run` needs it.
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  // Debounce handle for the localStorage write mirroring the editor buffer.
  const persistSaveTimerRef = useRef<number | null>(null);

  // Per-file localStorage keys. The fingerprint includes every file's
  // init + starter so editing the MDX retires saved attempts against the
  // old prompt; the filename is appended so each tab persists independently.
  const workspaceFingerprint = useMemo(
    () =>
      workspaceFiles
        .map((f) => `${f.filename}:${f.initCode ?? ""}:${f.starterCode}`)
        .join("|"),
    [workspaceFiles],
  );
  const persistedKeyForFile = useCallback(
    (filename: string) =>
      persistKey(
        "challenge",
        `${adapter.id}|${title}|${workspaceFingerprint}|${filename}`,
      ),
    [adapter.id, title, workspaceFingerprint],
  );
  // `<stdin>` rather than `stdin.txt`, which a multi-file workspace could
  // legitimately declare as a real file and would then collide with.
  const persistedStdinKey = useMemo(
    () =>
      persistKey(
        "challenge",
        `${adapter.id}|${title}|${workspaceFingerprint}|<stdin>`,
      ),
    [adapter.id, title, workspaceFingerprint],
  );
  // Shared per-adapter runtime, scoped to the fumadocs surface (the
  // Playground uses a separate scope so its installed packages / staged VFS
  // files can't bleed into challenge results). Isolation between cards in
  // the same scope is the adapter's job: each `run()` wipes user globals.
  const runtimeRef = useRef<LanguageRuntime | null>(null);
  // Outer card element + one-shot guard for the scroll-into-view warm-up.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const warmedRef = useRef(false);
  const runSeqRef = useRef(0);
  // Latest run handler, keeps the mount-once CodeMirror keymap current.
  const runRef = useRef<() => void>(() => {});
  // Latest submit handler (Mod-Enter + split-button default). Falls back to
  // `run` for challenges without tests so the keystroke isn't dead.
  const submitRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  // Which action triggered the in-flight run, so the Submit pill shows
  // "Submitting…" vs "Running…" correctly.
  const [activeAction, setActiveAction] = useState<"submit" | "run" | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  // True while a *cold* runtime download is in flight, so the boot notice
  // only promises "first run only" when it really is.
  const [bootCold, setBootCold] = useState(false);
  // Latest stage-floor fraction reported by the adapter's boot (null
  // until the adapter reports one); smoothed for display below.
  const [bootFraction, setBootFraction] = useState<number | null>(null);
  // Mid-run blocking waits (e.g. Python's on-first-run package install)
  //, surfaces the boot notice during the wait. Callbacks are stable.
  const {
    preparing: midRunPreparing,
    message: midRunMessage,
    report: reportPrepare,
    reset: resetPrepare,
  } = useMidRunPreparing();
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [elapsed, setElapsed] = useState<string>("");
  const [initExpanded, setInitExpanded] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  // Active file inside the solution modal. Independent of the
  // workspace's active tab so opening the modal doesn't disturb where
  // the learner was editing.
  const [solutionActiveFilename, setSolutionActiveFilename] = useState<
    string | null
  >(null);
  const [testResults, setTestResults] = useState<DisplayedTest[]>([]);
  const [testListOpen, setTestListOpen] = useState(true);
  const [bannerState, setBannerState] = useState<"pass" | "fail" | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const toasts = useChallengeToasts();

  // Seed the STDIN buffer once, on the first render, the way the file
  // buffers below read their persisted copies. Nothing rendered on the
  // server depends on it (it reaches the DOM only when CodeMirror mounts,
  // in an effect), so reading storage here cannot desync hydration.
  if (stdinBufferRef.current === null) {
    stdinBufferRef.current = hasStdin
      ? (loadPersistedCode(persistedStdinKey) ?? starterStdin)
      : "";
  }

  // ─── Multi-file workspace state ─────────────────────────────────────
  // Each file has its own buffer + persisted copy; the single editor view
  // shows the active file, and tab switches rewrite the doc.
  const [activeFilename, setActiveFilename] = useState<string>(
    workspaceFiles[0].filename,
  );
  const fileBuffersRef = useRef<Map<string, string>>(
    new Map(
      workspaceFiles.map((f) => {
        const persisted = loadPersistedCode(persistedKeyForFile(f.filename));
        return [f.filename, persisted ?? f.starterCode];
      }),
    ),
  );
  const activeFilenameRef = useRef(activeFilename);
  useEffect(() => {
    activeFilenameRef.current = activeFilename;
  }, [activeFilename]);

  // Active file's init code (trimmed) + derived line metrics; the init
  // drawer and line-number offset reconfigure when the active tab changes.
  const activeTrimmedInit = initForFile(activeFilename);
  const activeHasInit = activeTrimmedInit.length > 0;
  const activeInitLineCount = activeHasInit
    ? activeTrimmedInit.split("\n").length
    : 0;

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
  }, [cmThemeName]);

  const canCheck = canRunTests(adapter.id, tests);

  // Persist a file's doc content to its localStorage key (debounced editor
  // listener + tab-switch / unmount flushes).
  const persistActiveFile = useCallback(
    (filename: string, content: string) => {
      savePersistedCode(persistedKeyForFile(filename), content);
    },
    [persistedKeyForFile],
  );

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();
    const lineNumberComp = new Compartment();
    // Initial gutter offset = the active file's init line count; a
    // reconfigure effect keeps it in sync on tab switches.
    const initial = initForFile(activeFilenameRef.current);
    const initialOffset = initial ? initial.split("\n").length : 0;

    const initialDoc =
      fileBuffersRef.current.get(activeFilenameRef.current) ?? "";

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
        lineNumberComp.of(lineNumbersWithOffset(initialOffset)),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        EditorState.tabSize.of(adapter.indentWidth),
        indentUnit.of(" ".repeat(adapter.indentWidth)),
        EditorView.lineWrapping,
        // Intellisense: runtime-backed + static completion sources,
        // trigger characters, and the completion keymap. The runtime
        // attaches lazily (warm-up or first Run); until then the static
        // sources answer. The active file's read-only init code is
        // prepended so whole-file analyzers see the names it defines.
        languageCompletion({
          adapterId: adapter.id,
          getRuntime: () => runtimeRef.current,
          getContextPrefix: () => initForFile(activeFilenameRef.current),
          getFilename: () => activeFilenameRef.current,
        }),
        keymap.of([
          {
            // Mirrors the split button's default: Submit (run + check).
            // Without tests the submit handler short-circuits to plain Run.
            key: "Mod-Enter",
            run: () => {
              submitRef.current();
              return true;
            },
          },
          {
            // Dropdown action: run without grading.
            key: "Mod-Shift-Enter",
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
        // AI ghost-text completion (pro members only, the extension gates
        // itself and stays inert for guests/free members). The active file's
        // read-only init code travels as extra prompt prefix so suggestions
        // can use the names it defines.
        aiInlineCompletion({
          language: adapter.id,
          filename: () => activeFilenameRef.current,
          contextPrefix: () => initForFile(activeFilenameRef.current),
        }),
        // Debounced persist of the user's buffer so reloads /
        // navigation away and back restore their in-progress attempt.
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const filename = activeFilenameRef.current;
          const content = update.state.doc.toString();
          fileBuffersRef.current.set(filename, content);
          if (persistSaveTimerRef.current !== null)
            window.clearTimeout(persistSaveTimerRef.current);
          persistSaveTimerRef.current = window.setTimeout(() => {
            persistSaveTimerRef.current = null;
            persistActiveFile(filename, content);
          }, 400);
        }),
      ],
    });
    editorRef.current = view;
    mainThemeCompRef.current = themeComp;
    mainLineNumberCompRef.current = lineNumberComp;
    mainLanguageCompRef.current = languageComp;

    // Mixed-language adapters (web) pick the mode from the active file's
    // extension; a per-file effect keeps it in sync.
    const initialMode =
      adapter.codeMirrorModeForFile?.(activeFilenameRef.current) ??
      adapter.codeMirrorMode;
    void loadLanguage(initialMode).then((ext) => {
      if (ext && editorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      // Flush any pending debounced save before tearing down, so the
      // very last keystroke isn't lost on route changes.
      if (persistSaveTimerRef.current !== null) {
        window.clearTimeout(persistSaveTimerRef.current);
        persistSaveTimerRef.current = null;
        const filename = activeFilenameRef.current;
        persistActiveFile(filename, view.state.doc.toString());
      }
      view.destroy();
      editorRef.current = null;
      mainThemeCompRef.current = null;
      mainLineNumberCompRef.current = null;
      mainLanguageCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab switch: flush + snapshot the outgoing file's buffer, load the
  // incoming file's buffer, and collapse the init drawer.
  const previousActiveRef = useRef(activeFilename);
  useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      previousActiveRef.current = activeFilename;
      return;
    }
    const previousFilename = previousActiveRef.current;
    if (previousFilename === activeFilename) return;
    const outgoingContent = view.state.doc.toString();
    fileBuffersRef.current.set(previousFilename, outgoingContent);
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    persistActiveFile(previousFilename, outgoingContent);
    const incoming = fileBuffersRef.current.get(activeFilename) ?? "";
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: incoming },
    });
    setInitExpanded(false);
    previousActiveRef.current = activeFilename;
  }, [activeFilename, persistActiveFile]);

  // Keep the gutter offset in sync with the active file's init line count
  // (the editable region continues numbering after the read-only init).
  useEffect(() => {
    const view = editorRef.current;
    const comp = mainLineNumberCompRef.current;
    if (!view || !comp) return;
    view.dispatch({
      effects: comp.reconfigure(lineNumbersWithOffset(activeInitLineCount)),
    });
  }, [activeInitLineCount]);

  // Per-file syntax highlighting for adapters whose workspaces mix
  // languages (web: .html/.css/.js). No-op for single-language adapters.
  useEffect(() => {
    if (!adapter.codeMirrorModeForFile) return;
    const view = editorRef.current;
    const comp = mainLanguageCompRef.current;
    if (!view || !comp) return;
    const mode =
      adapter.codeMirrorModeForFile(activeFilename) ?? adapter.codeMirrorMode;
    let cancelled = false;
    void loadLanguage(mode).then((ext) => {
      if (cancelled || !ext) return;
      if (editorRef.current !== view) return;
      view.dispatch({ effects: comp.reconfigure(ext) });
    });
    return () => {
      cancelled = true;
    };
  }, [adapter, activeFilename]);

  // Sync the CodeMirror theme across all active editors when the docs
  // color scheme toggles (Fumadocs dark/light toggle or OS preference).
  useEffect(() => {
    const reconfigure = (view: EditorView | null, comp: Compartment | null) => {
      if (view && comp) {
        view.dispatch({ effects: comp.reconfigure(themeFor(cmThemeName)) });
      }
    };
    reconfigure(editorRef.current, mainThemeCompRef.current);
    reconfigure(initEditorRef.current, initThemeCompRef.current);
    reconfigure(solutionEditorRef.current, solutionThemeCompRef.current);
    reconfigure(stdinEditorRef.current, stdinThemeCompRef.current);
  }, [cmThemeName]);

  // Which file the modal displays: the user's explicit click, else the
  // first file with a real solution. Derived rather than stored so no
  // effect is needed to keep it in sync with `solutionFiles`.
  const activeSolutionFile = useMemo(() => {
    if (solutionFiles.length === 0) return null;
    if (solutionActiveFilename) {
      const match = solutionFiles.find(
        (f) => f.filename === solutionActiveFilename,
      );
      if (match) return match;
    }
    return solutionFiles.find((f) => f.hasSolution) ?? solutionFiles[0];
  }, [solutionFiles, solutionActiveFilename]);

  // Modal text for the active file; when it has init code, prepend a
  // comment header noting the read-only setup that runs first.
  const activeSolutionSource = useMemo(() => {
    if (!activeSolutionFile) return "";
    const fileInit = initForFile(activeSolutionFile.filename);
    if (!fileInit) return activeSolutionFile.source;
    const prefix = lineCommentFor(adapter.codeMirrorMode);
    const header = `${prefix} Initialization code (read-only) runs before this file. Solution begins below.\n\n`;
    return header + activeSolutionFile.source;
  }, [activeSolutionFile, initForFile, adapter.codeMirrorMode]);

  // Mount / re-mount the read-only solution editor when the modal opens or
  // the active file changes. `readOnly` (not `editable.of(false)`) blocks
  // insertions while keeping caret movement, selection, and Mod-A working.
  useEffect(() => {
    if (!solutionOpen || !activeSolutionFile) return;
    if (!solutionEditorHostRef.current) return;
    // Tear down a prior view so switching tabs rebuilds with the new doc.
    if (solutionEditorRef.current) {
      solutionEditorRef.current.destroy();
      solutionEditorRef.current = null;
    }
    const languageComp = new Compartment();
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: activeSolutionSource,
      parent: solutionEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(adapter.indentWidth),
        indentUnit.of(" ".repeat(adapter.indentWidth)),
        EditorView.lineWrapping,
        keymap.of(defaultKeymap),
        languageComp.of([]),
        themeComp.of(themeFor(cmThemeNameRef.current)),
        noActiveLine,
      ],
    });
    solutionEditorRef.current = view;
    solutionThemeCompRef.current = themeComp;
    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
      if (ext && solutionEditorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      view.destroy();
      if (solutionEditorRef.current === view) {
        solutionEditorRef.current = null;
        solutionThemeCompRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionOpen, activeSolutionFile, activeSolutionSource]);

  // Mount / re-mount the read-only init editor for the active file's init
  // code (tab switches rebuild it; kept mounted while collapsed so the
  // first lines show through the gradient fade).
  useEffect(() => {
    if (!activeHasInit) return;
    if (!initEditorHostRef.current) return;
    // Tear down a prior view so switching files rebuilds with the new doc.
    if (initEditorRef.current) {
      initEditorRef.current.destroy();
      initEditorRef.current = null;
    }
    const languageComp = new Compartment();
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: activeTrimmedInit,
      parent: initEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(adapter.indentWidth),
        indentUnit.of(" ".repeat(adapter.indentWidth)),
        EditorView.lineWrapping,
        languageComp.of([]),
        themeComp.of(themeFor(cmThemeNameRef.current)),
        noActiveLine,
      ],
    });
    initEditorRef.current = view;
    initThemeCompRef.current = themeComp;
    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
      if (ext && initEditorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });
    return () => {
      view.destroy();
      if (initEditorRef.current === view) {
        initEditorRef.current = null;
        initThemeCompRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHasInit, activeTrimmedInit]);

  // Mount the STDIN editor. Mount-once (the doc is seeded from the ref and
  // Reset dispatches into the live view), kept mounted while collapsed so
  // the height transition has something to reveal. Mirrors `<CodeBlock>`.
  useEffect(() => {
    if (!hasStdin) return;
    if (!stdinEditorHostRef.current || stdinEditorRef.current) return;

    const themeComp = new Compartment();
    const view = new EditorView({
      doc: stdinBufferRef.current ?? "",
      parent: stdinEditorHostRef.current,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        lineNumbersExt(),
        EditorView.lineWrapping,
        // No language, no bracket closing, no completion: this is data the
        // program parses, not code.
        keymap.of([...defaultKeymap, ...historyKeymap, ...redoKeymap]),
        themeComp.of(themeFor(cmThemeNameRef.current)),
        noActiveLine,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const current = update.state.doc.toString();
          stdinBufferRef.current = current;
          if (stdinSaveTimerRef.current !== null)
            window.clearTimeout(stdinSaveTimerRef.current);
          stdinSaveTimerRef.current = window.setTimeout(() => {
            stdinSaveTimerRef.current = null;
            savePersistedCode(persistedStdinKey, current);
          }, 400);
        }),
      ],
    });

    stdinEditorRef.current = view;
    stdinThemeCompRef.current = themeComp;

    return () => {
      if (stdinSaveTimerRef.current !== null) {
        window.clearTimeout(stdinSaveTimerRef.current);
        stdinSaveTimerRef.current = null;
        savePersistedCode(persistedStdinKey, view.state.doc.toString());
      }
      view.destroy();
      stdinEditorRef.current = null;
      stdinThemeCompRef.current = null;
    };
  }, [hasStdin, persistedStdinKey]);

  // ─── Execution helpers ─────────────────────────────────────────────

  /** Snapshot every file's current content. Reads the active file from
   *  the live editor (so unsaved edits propagate) and the rest from the
   *  in-memory buffers Map. */
  const snapshotAllFiles = useCallback((): Map<string, string> => {
    const out = new Map<string, string>();
    const view = editorRef.current;
    const active = activeFilenameRef.current;
    for (const f of workspaceFiles) {
      if (view && f.filename === active) {
        out.set(f.filename, view.state.doc.toString());
      } else {
        out.set(f.filename, fileBuffersRef.current.get(f.filename) ?? "");
      }
    }
    return out;
  }, [workspaceFiles]);

  // Ask AI context: the card registers itself so the assistant can see the
  // challenge the user is looking at, instructions, their current code,
  // output, and test results. Snapshots are pulled only at send time.
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
      const buffers = snapshotAllFiles();
      return {
        content: describeChallenge({
          instructions: instructionsText,
          files: workspaceFiles.map((f) => ({
            filename: f.filename,
            code: buffers.get(f.filename) ?? "",
            initCode: f.initCode,
          })),
          outputs: outputs
            .filter((c) => c.type === "stdout" || c.type === "stderr" || c.type === "log")
            .map((c) => c.content),
          tests: testResults,
          banner: bannerState,
        }),
      };
    },
  });

  // Build a file's effective source for a run: its read-only init code
  // (if any) prepended to the editable buffer, via the adapter-aware
  // merge so e.g. PHP's leading `<?php` isn't duplicated.
  const effectiveSourceFor = useCallback(
    (filename: string, buffer: string) => {
      const init = initForFile(filename);
      return init ? mergeInitAndEntry(adapter.id, init, buffer) : buffer;
    },
    [adapter.id, initForFile],
  );

  /** Execute the entry source against the shared runtime, staging workspace
   *  files into the VFS first so multi-file imports resolve. The caller
   *  precomputes the entry source (init/harness prepends) and post-processes
   *  stdout (`__DSTEST__:…` sentinel filtering) itself. */
  const execute = useCallback(
    async (
      entrySource: string,
      filesSnapshot: Map<string, string>,
      // The caller's run sequence; owning the increment there lets it guard
      // its own post-await state updates too.
      mySeq: number,
    ): Promise<{ cells: OutputCell[]; elapsedMs: number }> => {
      setOutputs([]);
      setBootCold(!isRuntimeReady(RuntimeScope.Fumadocs, adapter.id));
      setBootFraction(null);
      resetPrepare();
      setStatus("loading");
      setStatusMessage("Initializing runtime…");

      // Kick dataset downloads in parallel with the runtime boot. The no-op
      // catch keeps an early bail-out from surfacing an unhandled rejection;
      // awaiting the promise below still observes the real error.
      const datasetsPromise =
        cardDatasets.length > 0
          ? Promise.all(
              cardDatasets.map(async (spec) => ({
                filename: datasetStageFilename(spec),
                bytes: await fetchDatasetBytes(spec.path),
              })),
            )
          : null;
      datasetsPromise?.catch(() => {});

      // Re-use the shared per-adapter runtime (see runtimeRegistry.ts); the
      // adapter's `run()` wipes user globals so cards stay isolated.
      if (!runtimeRef.current) {
        // The registry replays the in-flight boot's current stage to this
        // callback, so a Run click mid-boot shows live progress.
        runtimeRef.current = await getSharedRuntime(
          RuntimeScope.Fumadocs,
          adapter,
          (msg, fraction) => {
            if (runSeqRef.current !== mySeq) return;
            setStatusMessage(msg);
            if (fraction !== undefined) setBootFraction(fraction);
          },
        );
      }
      const runtime = runtimeRef.current;
      if (runSeqRef.current !== mySeq)
        return { cells: [], elapsedMs: 0 };

      let datasetFiles: { filename: string; bytes: Uint8Array }[] = [];
      if (datasetsPromise) {
        if (!runtime.prepareFileSystem) {
          throw new Error(
            `The ${adapter.runtimeInfo.language} runtime cannot stage dataset files (no virtual file system), remove the card's \`datasets\` prop.`,
          );
        }
        setStatusMessage("Downloading dataset files…");
        datasetFiles = await datasetsPromise;
        if (runSeqRef.current !== mySeq)
          return { cells: [], elapsedMs: 0 };
      }

      setStatus("running");
      setStatusMessage("Running…");

      const startedAt = performance.now();
      let nextOutputId = 0;
      // Reassigned per emitted cell: `appendOutputCell` returns a new list
      // rather than mutating, so the two lesson surfaces share one rule.
      let cells: OutputCell[] = [];

      // Stage remote datasets and (multi-file only) workspace files into the
      // runtime VFS so imports resolve. Single-file cards must NOT pre-stage
      // their source: some runtimes (CheerpJ/Java, .NET/C#) compile the
      // staged file set and, with no `entryFilename`, then can't locate
      // `main`. Staging only dataset files is safe (non-source is ignored).
      //
      // A stdin-capable adapter always stages, with nothing to stage if that
      // is all there is. The staged file set lives on the runtime, and every
      // card and block of one language shares it, so this call is also how a
      // card *without* a STDIN panel drops the input a block above it left
      // behind, rather than grading the learner against it.
      if (
        (isMultiFile ||
          datasetFiles.length > 0 ||
          adapter.supportsStdin === true) &&
        runtime.prepareFileSystem
      ) {
        const fileMap = new Map<string, Uint8Array>();
        // Dataset bytes first, so a (misauthored) workspace file with
        // the same name deterministically wins.
        for (const f of datasetFiles) fileMap.set(f.filename, f.bytes);
        const encoder = new TextEncoder();
        if (isMultiFile) {
          for (const [name, content] of filesSnapshot) {
            fileMap.set(
              name,
              encoder.encode(
                name === resolvedEntryFilename
                  ? entrySource
                  : effectiveSourceFor(name, content),
              ),
            );
          }
        }
        // Last, so it wins over a same-named dataset or workspace file: the
        // panel is what the learner can see and edit, so it is what runs.
        if (hasStdin) {
          fileMap.set(
            STDIN_FILENAME,
            encoder.encode(normalizeStdin(stdinBufferRef.current ?? "")),
          );
        }
        try {
          await runtime.prepareFileSystem(fileMap);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          cells.push({
            id: ++nextOutputId,
            type: "stderr",
            content: `Failed to stage workspace files: ${message}`,
            elapsed: "",
          });
        }
      }

      try {
        await runtime.run(
          entrySource,
          (cell, seq, append) => {
            if (runSeqRef.current !== mySeq) return;
            const elapsedMs = performance.now() - startedAt;
            const fmt =
              elapsedMs < 1000
                ? `${elapsedMs.toFixed(0)}ms`
                : `${(elapsedMs / 1000).toFixed(2)}s`;
            cells = appendOutputCell(cells, cell, {
              seq,
              append,
              elapsed: fmt,
              nextId: () => ++nextOutputId,
            });
          },
          {
            entryFilename: isMultiFile ? resolvedEntryFilename : undefined,
            // Preview adapters render into the card-owned slot; each
            // run replaces the previous iframe (which is also the
            // teardown story for runaway scripts).
            previewHost: adapter.outputCapabilities?.preview
              ? previewHostRef.current
              : undefined,
            previewTailwind:
              adapter.outputCapabilities?.preview && tailwind
                ? true
                : undefined,
            // Mid-run waits (e.g. Python's first-run package install) show
            // the boot notice instead of a bare "Running…".
            onStatus: (message, preparing) => {
              if (runSeqRef.current !== mySeq) return;
              setStatusMessage(message);
              reportPrepare(message, preparing);
            },
          },
        );
      } finally {
        // Hold the running overlay for at least MIN_RUN_OVERLAY_MS so the
        // wave animation doesn't blink on sub-frame runs; `finally` covers
        // the throw path too, and the exception still propagates.
        const wait = MIN_RUN_OVERLAY_MS - (performance.now() - startedAt);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
        }
      }

      const elapsedMs = performance.now() - startedAt;
      return { cells, elapsedMs };
    },
    [
      adapter,
      cardDatasets,
      isMultiFile,
      resolvedEntryFilename,
      effectiveSourceFor,
      reportPrepare,
      resetPrepare,
      tailwind,
    ],
  );

  const formatElapsed = (ms: number) =>
    ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

  // ─── Run (no tests) ────────────────────────────────────────────────
  const run = useCallback(async () => {
    const mySeq = ++runSeqRef.current;
    setActiveAction("run");
    // Not a graded attempt: clear stale test results and banner.
    setTestResults([]);
    setBannerState(null);
    const snapshot = snapshotAllFiles();
    const entryCode = snapshot.get(resolvedEntryFilename) ?? "";
    const combined = effectiveSourceFor(resolvedEntryFilename, entryCode);
    try {
      const { cells, elapsedMs } = await execute(combined, snapshot, mySeq);
      if (runSeqRef.current !== mySeq) return;
      setOutputs(cells);
      setElapsed(formatElapsed(elapsedMs));
      const erred = cells.some((c) => c.type === "stderr");
      setStatus(erred ? "error" : "ready");
      setStatusMessage(erred ? "Errored" : "Done");
    } catch (err) {
      if (runSeqRef.current !== mySeq) return;
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
    } finally {
      // Only the latest run owns the busy spinner; a superseded run
      // clearing it would re-enable Run/Submit mid-flight.
      if (runSeqRef.current === mySeq) setActiveAction(null);
    }
  }, [execute, resolvedEntryFilename, snapshotAllFiles, effectiveSourceFor]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    const mySeq = ++runSeqRef.current;
    setActiveAction("submit");
    const snapshot = snapshotAllFiles();
    const entryCode = snapshot.get(resolvedEntryFilename) ?? "";
    const userPart = effectiveSourceFor(resolvedEntryFilename, entryCode);
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
      const { cells, elapsedMs } = await execute(combined, snapshot, mySeq);
      if (runSeqRef.current !== mySeq) return;

      // Split stdout into user-visible text + parsed harness results
      // (non-stdout cells pass through untouched); also collect raw
      // stdout/stderr for the stdout-based expectations.
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
      if (runSeqRef.current !== mySeq) return;
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
    } finally {
      // Only the latest submission owns the busy spinner (see `run`).
      if (runSeqRef.current === mySeq) setActiveAction(null);
    }
  }, [
    adapter.id,
    canCheck,
    execute,
    resolvedEntryFilename,
    snapshotAllFiles,
    effectiveSourceFor,
    tests,
  ]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Pin this card's runtime while mounted so the per-scope LRU eviction
  // never tears it down under a card that could still Run against it.
  useEffect(
    () => retainRuntime(RuntimeScope.Fumadocs, adapter.id),
    [adapter.id],
  );

  // Warm the shared runtime as soon as the page lands (idle-scheduled,
  // Save-Data-guarded, one boot at a time, see runtime/warmup.ts), so
  // the time a reader spends on the page's prose pays for the runtime
  // download instead of the first Run/Submit click.
  useEffect(() => {
    warmRuntimeOnRouteLand(RuntimeScope.Fumadocs, adapter);
  }, [adapter]);

  // Warm the shared runtime when the card first scrolls into view; the
  // fallback for Save-Data users (route-land warm-up skips them) and for
  // additional languages further down the page. Best-effort and deduped by
  // the registry; failures are swallowed so a real Run can retry.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || warmedRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (warmedRef.current || !entries.some((e) => e.isIntersecting)) return;
        warmedRef.current = true;
        io.disconnect();
        void getSharedRuntime(RuntimeScope.Fumadocs, adapter)
          .then((rt) => {
            if (!runtimeRef.current) runtimeRef.current = rt;
            // Pre-install heavy optional packages only if this card's code
            // needs them (see LanguageRuntime.warmPackages). Fire-and-forget.
            const hint = warmHintRef.current;
            rt.warmPackages?.(hint.sources, { packages: hint.packages });
          })
          .catch(() => {
            warmedRef.current = false;
          });
        // Prefetch datasets alongside the runtime; best-effort, the Run
        // path re-requests (and reports) failures.
        for (const spec of datasetsRef.current) {
          void fetchDatasetBytes(spec.path).catch(() => {});
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(card);
    return () => io.disconnect();
  }, [adapter]);

  // Keep the test driver's submit hook pointing at the latest `check`.
  useEffect(() => {
    checkRef.current = check;
  }, [check]);

  // Default action (and Mod-Enter) is Submit when tests exist, else Run.
  useEffect(() => {
    submitRef.current = canCheck ? () => void check() : () => void run();
  }, [canCheck, check, run]);

  // ─── Reset ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    runSeqRef.current++;
    // Restore every buffer to its starter, drop saved copies, and reload
    // the active doc.
    for (const f of workspaceFiles) {
      fileBuffersRef.current.set(f.filename, f.starterCode);
      clearPersistedCode(persistedKeyForFile(f.filename));
    }
    const view = editorRef.current;
    if (view) {
      const active = activeFilenameRef.current;
      const incoming = fileBuffersRef.current.get(active) ?? "";
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: incoming },
      });
    }
    // Reset means the whole authored card, graded input included.
    if (hasStdin) {
      stdinBufferRef.current = starterStdin;
      clearPersistedCode(persistedStdinKey);
      const stdinView = stdinEditorRef.current;
      stdinView?.dispatch({
        changes: {
          from: 0,
          to: stdinView.state.doc.length,
          insert: starterStdin,
        },
      });
    }
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    if (stdinSaveTimerRef.current !== null) {
      window.clearTimeout(stdinSaveTimerRef.current);
      stdinSaveTimerRef.current = null;
    }
    setOutputs([]);
    // Reset also tears down the live preview, removing the iframe
    // kills its document (scripts, timers, listeners) immediately.
    previewHostRef.current?.replaceChildren();
    setElapsed("");
    setStatus("idle");
    setStatusMessage("");
    setTestResults([]);
    setBannerState(null);
    // A run superseded by this reset skips its own spinner cleanup
    // (its `finally` is sequence-guarded), so clear it here.
    setActiveAction(null);
    toasts.show("Reset to starter code.");
  }, [
    persistedKeyForFile,
    toasts,
    workspaceFiles,
    hasStdin,
    starterStdin,
    persistedStdinKey,
  ]);

  // ─── Apply solution ────────────────────────────────────────────────
  // Load every solved file's reference solution into the buffers (scaffold
  // files are left untouched); if the active tab is scaffold, hop to the
  // first solved file so the applied code lands on screen.
  const applySolutionToEditor = useCallback(() => {
    const solvable = solutionFiles.filter((f) => f.hasSolution);
    if (solvable.length === 0) return;
    const view = editorRef.current;
    const active = activeFilenameRef.current;

    for (const f of solvable) {
      fileBuffersRef.current.set(f.filename, f.source);
      persistActiveFile(f.filename, f.source);
      if (view && f.filename === active) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: f.source },
        });
      }
    }

    // Scaffold tab active: switch to the first solved file. The tab-switch
    // effect snapshots the scaffold out and loads the solution buffer in.
    if (!solvable.some((f) => f.filename === active)) {
      setActiveFilename(solvable[0].filename);
    }

    setSolutionOpen(false);
    toasts.show(
      solvable.length === 1
        ? `Solution loaded into ${solvable[0].filename}.`
        : "Solution loaded into your editor.",
    );
  }, [solutionFiles, persistActiveFile, toasts]);

  // ─── Test hook ─────────────────────────────────────────────────────
  // Imperative driver on `window.__dsChallenges` for the Playwright
  // solution sweep (e2e/challenge-solutions.spec.ts), keyed by the stable
  // (adapter.id, title) tuple.
  const checkRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const testResultsRef = useRef(testResults);
  const bannerStateRef = useRef(bannerState);
  const statusRef = useRef<Status>(status);
  useEffect(() => {
    testResultsRef.current = testResults;
  }, [testResults]);
  useEffect(() => {
    bannerStateRef.current = bannerState;
  }, [bannerState]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const registry = (window as unknown as {
      __dsChallenges?: Record<string, ChallengeTestHandle>;
    }).__dsChallenges ?? {};
    const key = `${adapter.id}::${title}`;
    const handle: ChallengeTestHandle = {
      adapterId: adapter.id,
      title,
      entryFilename: resolvedEntryFilename,
      filenames: workspaceFiles.map((f) => f.filename),
      setFileContent(filename, content) {
        if (!fileBuffersRef.current.has(filename)) return false;
        fileBuffersRef.current.set(filename, content);
        if (activeFilenameRef.current === filename) {
          const view = editorRef.current;
          if (view) {
            view.dispatch({
              changes: {
                from: 0,
                to: view.state.doc.length,
                insert: content,
              },
            });
          }
        } else {
          // Persist so a later tab-switch picks up the new buffer.
          try {
            window.localStorage.setItem(
              persistedKeyForFile(filename),
              content,
            );
          } catch {
            /* quota / private mode, ignore, in-memory buffer still updated */
          }
        }
        return true;
      },
      submit() {
        return checkRef.current();
      },
      getStatus() {
        return statusRef.current;
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
    (window as unknown as {
      __dsChallenges: Record<string, ChallengeTestHandle>;
    }).__dsChallenges = { ...registry, [key]: handle };
    return () => {
      const current = (window as unknown as {
        __dsChallenges?: Record<string, ChallengeTestHandle>;
      }).__dsChallenges;
      if (current && current[key] === handle) {
        const next = { ...current };
        delete next[key];
        (window as unknown as {
          __dsChallenges: Record<string, ChallengeTestHandle>;
        }).__dsChallenges = next;
      }
    };
  }, [
    adapter.id,
    title,
    resolvedEntryFilename,
    workspaceFiles,
    persistedKeyForFile,
  ]);

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
      toasts.show("Couldn't copy code, clipboard blocked.", "warn");
    }
  }, [toasts]);

  const MIN_FORMAT_MS = 300;

  const formatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    const startedAt = performance.now();
    try {
      // Pass the active filename so mixed-language workspaces (web:
      // .html/.css/.js) format with the right dialect.
      const formatted = await adapter.formatCode(
        code,
        activeFilenameRef.current,
      );
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      if (formatted === code) {
        toasts.show("Already formatted, nothing to change.");
      } else {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        toasts.show("Code formatted.");
      }
    } catch {
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      toasts.show("Couldn't format, code may have a syntax error.", "warn");
    } finally {
      setIsFormatting(false);
    }
  }, [adapter, toasts]);

  const isBusy = status === "loading" || status === "running";

  // Smoothed boot fraction for the wave progress bar (null → spinner only).
  const bootDisplayFraction = useCreepingBootFraction(
    bootFraction,
    status === "loading",
  );

  // Show the boot notice during a cold boot (status "loading") and during
  // a mid-run blocking wait (e.g. installing packages mid-run, while
  // status is "running"). The mid-run case has no runtime download and no
  // determinate fraction, just the loader + the wait message.
  const showBootNotice =
    status === "loading" || (status === "running" && midRunPreparing);

  // Code (or a readable summary of a declarative stdout expectation) per
  // test id, surfaced by the test-details popover in the results rail.
  const testCodeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tests) {
      if (isNativeTest(t)) m.set(t.id, t.code);
      else if (isStdoutTest(t)) m.set(t.id, stdoutExpectSummary(t.expect));
    }
    return m;
  }, [tests]);
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

  // Test-only solution payload stamped onto the card (JSON list of
  // { filename, source }, solved files only) for the Playwright runner.
  const solutionTestPayload = useMemo(() => {
    const real = solutionFiles.filter((f) => f.hasSolution);
    if (real.length === 0) return null;
    return JSON.stringify(
      real.map((f) => ({ filename: f.filename, source: f.source })),
    );
  }, [solutionFiles]);

  return (
    <div className={styles.cardShell}>
    <div
      ref={cardRef}
      className={styles.card}
      aria-label={`${adapter.runtimeInfo.language} coding challenge: ${title}`}
      data-testid="challenge-card"
      data-adapter-id={adapter.id}
      data-challenge-title={title}
      data-entry-filename={resolvedEntryFilename}
      data-solution-files={solutionTestPayload ?? undefined}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.badge}>
            <Terminal size={9} aria-hidden /> {badge}
          </div>
          <div className={styles.headerMeta}>
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
      </div>

      {/* ── Instructions ── */}
      <div className={styles.instructions}>
        {/* data-askai-instructions lets the Ask AI snapshot read the rendered
            instructions text when `instructions` is JSX rather than a string. */}
        <div className={styles.instructionsBody} data-askai-instructions>
          {renderInstructions(instructions)}
        </div>
      </div>

      {/* ── File tab bar (multi-file, or single-file opt-in) ── */}
      {showTabs && (
        <div
          className={styles.fileTabBar}
          role="tablist"
          aria-label="Workspace files"
        >
          {workspaceFiles.map((f) => {
            const isActive = f.filename === activeFilename;
            return (
              <button
                key={f.filename}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.fileTab} ${
                  isActive ? styles.fileTabActive : ""
                }`}
                onClick={() => setActiveFilename(f.filename)}
                title={
                  f.filename === resolvedEntryFilename
                    ? `${f.filename} (entry)`
                    : f.filename
                }
                data-testid="challenge-file-tab"
                data-filename={f.filename}
              >
                <File size={12} aria-hidden />
                {f.filename}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Init code (active file) ──
            ≤3 lines: always expanded, no toggle. >3 lines: collapsed by
            default behind a gradient fade with expand/collapse toggles. */}
      {activeHasInit && (
        <div
          className={`${styles.initWrap}${
            showTabs ? "" : ` ${styles.topBorderLight}`
          }`}
        >
          {activeInitLineCount > 3 && (
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
                {activeInitLineCount} line{activeInitLineCount === 1 ? "" : "s"} ·
                read-only
              </span>
            </button>
          )}
          <div
            className={`${styles.initEditorWrap} ${
              activeInitLineCount <= 3 || initExpanded
                ? styles.initEditorWrapOpen
                : styles.initEditorWrapCollapsed
            }`}
          >
            <div
              id={initPanelId}
              className={styles.initEditor}
              ref={initEditorHostRef}
              aria-label="Initialization code (read-only)"
            />
            {!initExpanded && activeInitLineCount > 3 && (
              <button
                type="button"
                className={styles.initFade}
                aria-label="Expand initialization code"
                title="Expand initialization code"
                onClick={() => setInitExpanded(true)}
              >
                <span className={styles.initFadeLabel}>
                  <ChevronDown size={13} strokeWidth={2} aria-hidden />
                  Click to expand
                </span>
              </button>
            )}
            {initExpanded && activeInitLineCount > 3 && (
              <button
                type="button"
                className={styles.initCollapseBtn}
                aria-label="Collapse initialization code"
                onClick={() => setInitExpanded(false)}
              >
                <ChevronUp size={13} strokeWidth={2} aria-hidden />
                Click to collapse
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Editor ── light top border only when nothing above supplies a
            divider. */}
      <div
        className={`${styles.editor}${
          !activeHasInit && !showTabs ? ` ${styles.topBorderLight}` : ""
        }`}
        ref={editorHostRef}
        aria-label={`${adapter.runtimeInfo.language} solution editor`}
      />

      {/* ── STDIN ── the input the tests grade against. */}
      {hasStdin && (
        <div className={styles.stdinWrap}>
          <button
            type="button"
            className={styles.stdinToggle}
            aria-expanded={stdinExpanded}
            aria-controls={stdinPanelId}
            onClick={() => setStdinExpanded((v) => !v)}
          >
            <span
              className={`${styles.initCaret} ${
                stdinExpanded ? styles.initCaretOpen : ""
              }`}
              aria-hidden
            >
              ▶
            </span>
            <span className={styles.stdinLabel}>STDIN</span>
            <span className={styles.stdinHint}>
              What the program reads. Reset restores it.
            </span>
          </button>
          <div
            id={stdinPanelId}
            className={`${styles.stdinEditorWrap} ${
              stdinExpanded
                ? styles.stdinEditorWrapOpen
                : styles.stdinEditorWrapCollapsed
            }`}
            // A collapsed panel is not merely invisible: without this a
            // screen reader still reads the editor out and Tab still lands
            // the cursor in a box nobody can see.
            inert={!stdinExpanded}
          >
            <div
              className={styles.stdinEditor}
              aria-label="Standard input"
              ref={stdinEditorHostRef}
            />
          </div>
        </div>
      )}

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
                data-testid="challenge-submit"
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
                          <span
                            className={styles.kbdSep}
                            aria-hidden
                          >
                            +
                          </span>
                          <kbd className={styles.kbd}>⇧</kbd>
                          <span
                            className={styles.kbdSep}
                            aria-hidden
                          >
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
            // Challenges without tests get a plain Run pill, no dropdown.
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
          {/* Runtime status text ("Loading Pyodide", …) so a first-run WASM
              fetch isn't just a spinning button. */}
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
          {hasSolution && (
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
          {adapter.formatCode && (
            <>
              <div className={styles.btnGroupUtilSep} aria-hidden />
              <button
                type="button"
                className={styles.utilBtn}
                onClick={() => void formatCode()}
                disabled={isBusy || isFormatting}
                title="Format code"
                aria-label="Format code"
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
        <ChallengeToastViewport
          toasts={toasts.toasts}
          onDismiss={toasts.dismiss}
          className={styles.toastViewport}
          itemClassName={styles.toast}
        />
      </div>

      {/* ── Live page preview (web / react adapters) ── */}
      {adapter.outputCapabilities?.preview && (
        <div className={styles.previewPanel} data-testid="web-preview">
          <div className={styles.previewHeader}>
            <span className={styles.previewLabel}>Preview</span>
          </div>
          <div
            className={styles.previewSlot}
            style={previewStageStyle(previewHeight)}
            ref={previewHostRef}
          />
        </div>
      )}

      {/* ── Output panel ── */}
      {(outputs.length > 0 || isBusy) && (
        <div
          className={`${styles.outputPanel}${isBusy ? ` ${styles.outputRunning}` : ""}`}
          aria-live="polite"
        >
          {/* "Output" header hidden while the boot notice shows; it returns
              once user code actually runs. */}
          {!showBootNotice && (
            <div className={styles.outputHeader}>
              <div
                className={styles.accentBar}
                data-error={outputs.some((c) => c.type === "stderr")}
              />
              <span
                className={styles.outputLabel}
                data-error={outputs.some((c) => c.type === "stderr")}
              >
                Output
              </span>
              {elapsed && (
                <span className={styles.outputTime}>{elapsed}</span>
              )}
            </div>
          )}
          {showBootNotice && (
            // Same boot affordance as `<CodeBlock>` (see RuntimeBootNotice);
            // also shown for mid-run blocking waits, without size/fraction.
            <div className={codeBlockStyles.bootNoticeWrap}>
              <RuntimeBootNotice
                language={adapter.runtimeInfo.language}
                statusMessage={midRunPreparing ? midRunMessage : statusMessage}
                cold={status === "loading" && bootCold}
                downloadMB={
                  status === "loading" ? adapter.coldDownloadMB : undefined
                }
                compiled={adapter.compiled}
                fraction={status === "loading" ? bootDisplayFraction : null}
                testId="challenge-boot"
              />
            </div>
          )}
          {outputs.length > 0 && (
            <div className={styles.outputBody}>
              {outputs.map((cell) => (
                <OutputCellView key={cell.id} cell={cell} />
              ))}
            </div>
          )}
          {/* Centered spinner instead of a "Running…" placeholder; suppressed
              while the boot notice carries its own loader. */}
          {isBusy && !showBootNotice && (
            <div className={styles.runSpinner} aria-hidden="true">
              <DiamondSpinner size={28} label="Running…" />
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
                code: testCodeById.get(t.id),
              }))}
            />
          )}
        </div>
      )}

      {/* ── Banner ── */}
      {bannerState && (
        <div
          className={styles.banner}
          data-state={bannerState}
          data-testid="challenge-banner"
        >
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
      {solutionOpen && hasSolution && activeSolutionFile && (
        <SolutionModal
          onClose={() => setSolutionOpen(false)}
          editorHostRef={solutionEditorHostRef}
          source={activeSolutionSource}
          files={solutionFiles}
          activeFilename={activeSolutionFile.filename}
          onSelectFile={setSolutionActiveFilename}
          onApplySolution={applySolutionToEditor}
          showTabs={isMultiFile}
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
  files,
  activeFilename,
  onSelectFile,
  onApplySolution,
  showTabs,
}: {
  onClose: () => void;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
  source: string;
  files: SolutionFile[];
  activeFilename: string;
  onSelectFile: (filename: string) => void;
  onApplySolution: () => void;
  showTabs: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

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

  // Copy the active file's raw solution, not the synthetic "init runs
  // first" header prepended for display.
  const activeRaw = useMemo(
    () => files.find((f) => f.filename === activeFilename)?.source ?? source,
    [files, activeFilename, source],
  );
  // Solution identical to starter → "no edits needed" note (multi-file).
  const activeIsUnchanged = useMemo(
    () => files.find((f) => f.filename === activeFilename)?.isUnchanged ?? false,
    [files, activeFilename],
  );
  const handleCopy = useCallback(async () => {
    try {
      if (!navigator.clipboard?.writeText) return;
      await navigator.clipboard.writeText(activeRaw);
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
  }, [activeRaw]);

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
            <Terminal size={9} aria-hidden />
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
              aria-label={`Copy ${activeFilename}`}
              title={`Copy ${activeFilename}`}
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
        {showTabs && (
          <div
            className={styles.modalTabBar}
            role="tablist"
            aria-label="Solution files"
          >
            {files.map((f) => {
              const isActive = f.filename === activeFilename;
              return (
                <button
                  key={f.filename}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={
                    isActive
                      ? `${styles.modalTab} ${styles.modalTabActive}`
                      : styles.modalTab
                  }
                  onClick={() => onSelectFile(f.filename)}
                  title={
                    f.hasSolution
                      ? f.filename
                      : `${f.filename} (unchanged from starter)`
                  }
                >
                  <File size={12} aria-hidden />
                  {f.filename}
                  {!f.hasSolution && (
                    <span className={styles.modalTabHint} aria-hidden>
                      ·
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {showTabs && activeIsUnchanged && (
          <div className={styles.solutionUnchangedNote} role="note">
            <Info size={13} strokeWidth={2} aria-hidden />
            <span>
              This file is unchanged from the starter code, no edits are
              needed here.
            </span>
          </div>
        )}
        <div
          ref={editorHostRef}
          className={styles.modalEditor}
          aria-label="Solution editor (read-only)"
        />
        {/* Action bar pinned below the read-only editor. Borderless
            utility buttons mirror the card's own `.utilBtn`. */}
        <div className={styles.solutionActionBar}>
          <button
            type="button"
            className={styles.utilBtn}
            onClick={() => void handleCopy()}
            title={`Copy ${activeFilename} to clipboard`}
          >
            {copied ? (
              <Check size={13} strokeWidth={2.4} aria-hidden />
            ) : (
              <CopyIcon />
            )}
            <span>
              {copied ? (
                "Copied!"
              ) : (
                <>
                  Copy{" "}
                  <code className={styles.solutionActionFileName}>
                    {activeFilename}
                  </code>
                </>
              )}
            </span>
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

/** Output cell renderer, a trimmed copy of `<CodeBlock>`'s for the lighter
 *  challenge-card chrome. Any new cell type added to `OutputCellType` needs
 *  a branch here AND in `<CodeBlock>`'s `OutputSegment` — a missing branch
 *  falls through to the text fallback silently (a plot cell's `content` is
 *  raw figure JSON). */
function OutputCellView({ cell }: { cell: OutputCell }) {
  if (cell.type === "html") {
    return (
      <div
        // `not-prose` keeps the docs' prose typography from restyling the
        // dataframe markup inside MDX content.
        className={`${styles.outCellHtml} not-prose`}
        // Same trust assumption as the playground: HTML cells come from
        // code the user typed in this very widget.
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
          alt="Chart generated by the code above"
          style={{ maxWidth: "100%" }}
        />
      </div>
    );
  }
  if (cell.type === "plot" && cell.plot) {
    return (
      <div className={styles.outCellPlot} data-cell-type="plot">
        <PlotlyChart figure={cell.plot} />
      </div>
    );
  }
  if (cell.type === "stderr") {
    return <div className={styles.outCellStderr}>{cell.content}</div>;
  }
  // A plot cell that arrived without a parsed figure has nothing to draw, and
  // its `content` is the figure JSON, which is worse than useless on screen.
  if (cell.type === "plot") {
    return (
      <div className={styles.outCellStderr} data-cell-type="plot">
        A chart was produced but could not be rendered.
      </div>
    );
  }
  return <div className={styles.outCellStdout}>{cell.content}</div>;
}
