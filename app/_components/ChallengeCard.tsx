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
import { createPortal } from "react-dom";
import { RotateCcw, Check, CheckCheck, ListChecks, ListX, X, ChevronDown, ChevronUp, Eye, File, FileInput, Info, Play, Terminal, Timer } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
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
} from "./challengeShared";
import { RuntimeBootNotice } from "./RuntimeBootNotice";
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
import { languageCompletion } from "./completion/languageCompletion";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
} from "./types";
import { getSharedRuntime, isRuntimeReady, RuntimeScope } from "./runtimeRegistry";
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
import { mergeInitAndEntry } from "./runtime/mergeInit";
import styles from "./ChallengeCard.module.css";
// Boot-notice styles are shared with `<CodeBlock>` (which already
// shares this card's styles for its chrome — the reuse runs both ways).
import codeBlockStyles from "./CodeBlock.module.css";

type Status = "idle" | "loading" | "ready" | "running" | "error";
type TestState = "pending" | "pass" | "fail";

interface DisplayedTest {
  id: string;
  name: string;
  description?: string;
  state: TestState;
  detail: string | null;
}

/** One file in a challenge workspace. Every challenge passes at least
 *  one file (single-file authors pass a one-element `files` array). A
 *  file carries its own read-only initialization code, the editable
 *  starter shown in the editor, and an optional reference solution. */
export interface ChallengeFile {
  /** Workspace-relative filename, e.g. `"Dog.java"`. */
  filename: string;
  /** Optional read-only initialization code for THIS file, prepended
   *  verbatim to the file's code on every run. Rendered in a
   *  collapsed-by-default read-only panel above the editor whenever this
   *  file is the active tab, mirroring `<CodeBlock>`'s init drawer. */
  initCode?: string;
  /** Starter content shown in the editor for this file. Reset restores
   *  this exact text. */
  starterCode: string;
  /** Optional reference solution for this file. When at least one file
   *  in the workspace supplies `solutionCode`, the Solution modal
   *  renders the file tab bar (non-sortable, non-closeable) so the
   *  learner can flip between files; files that omit `solutionCode` are
   *  shown with their `starterCode` (the scaffold the learner does not
   *  need to modify). */
  solutionCode?: string;
}

/** Imperative driver exposed on `window.__dsChallenges[adapter::title]`
 *  so the Playwright solution sweep can load a card's reference
 *  solution and trigger the test run without driving every keystroke
 *  through the DOM. Production code must not depend on this — it is
 *  a test surface and may change shape across releases. */
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
  /** True when the file supplied a real `solutionCode`. False when we
   *  are echoing back the file's `starterCode` because the file is part
   *  of the scaffold the learner is not expected to modify. The modal
   *  labels these "(unchanged)" so the learner can tell the file apart
   *  from one they should edit. */
  hasSolution: boolean;
  /** True when the displayed solution is byte-for-byte identical to the
   *  file's `starterCode` — either because the file supplied no
   *  `solutionCode` (scaffold) or because its `solutionCode` matches the
   *  starter. In a multi-file workspace the modal surfaces a subtle note
   *  for these files so the learner knows the tab needs no edits. */
  isUnchanged: boolean;
}

export interface ChallengeCardProps {
  /** Language adapter used for both running the code and building the
   *  test harness. Pass the same instance as a CodeBlock would. */
  adapter: LanguageAdapter;
  /** Challenge title shown in the header. */
  title: string;
  /** Optional uppercase badge label. Defaults to "Challenge". */
  badge?: string;
  /** Rendered above the editor. Pass MDX content / React elements, or a
   *  markdown string for terser authoring. Strings support paragraphs,
   *  bullet lists, **bold**, *italic*, and `inline code`. */
  instructions: React.ReactNode | string;
  /** Workspace files. Every challenge supplies at least one file; each
   *  file carries its own `initCode` (read-only setup), `starterCode`
   *  (the editable starter), and optional `solutionCode`. With more than
   *  one file — or with `showFileTabBar` — a non-sortable, non-closeable
   *  tab bar appears above the editor so the learner can switch between
   *  files. Tests run against `entryFilename` (or the first file when
   *  omitted); every other file is staged into the runtime's virtual
   *  file system via `prepareFileSystem` so multi-file `import`s /
   *  `include`s / cross-class references resolve. */
  files: ChallengeFile[];
  /** When `files` has more than one entry, the filename whose content is
   *  passed to `runtime.run()` as the entry. Defaults to the first file. */
  entryFilename?: string;
  /** Remote dataset files staged into the runtime's working directory
   *  before every Run / Check Answer, so init/starter/solution code
   *  reads them like local files (e.g. `pd.read_csv("penguins.csv")`).
   *  Each entry names a path in the dataslope/datasets repo (or a full
   *  URL); the bytes are fetched through the globally cached dataset
   *  path — memoised in-session and persisted via the browser's Cache
   *  API — so every card, block, page, and visit that references the
   *  same file shares one download. Requires an adapter whose runtime
   *  implements `prepareFileSystem` (Python, R, JavaScript, TypeScript,
   *  PHP, …). */
  datasets?: DatasetStageSpec[];
  /** Force the file tab bar to render even for a single-file workspace.
   *  Multi-file workspaces always show it; this opts a one-file card in. */
  showFileTabBar?: boolean;
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

// Pick a line-comment prefix for the language. Used only to prepend a
// human-readable "init code runs first" notice at the top of solution
// files — the comment must parse as a no-op in the target language so
// the displayed solution still pastes back as valid source.
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

// Build a line-numbers extension whose gutter starts after `offset`
// lines, so the editable region's numbering continues from where a
// file's read-only init code left off. Stored in a compartment so the
// offset can be reconfigured when the active file (hence its init)
// changes, without remounting the editor.
function lineNumbersWithOffset(offset: number) {
  return lineNumbersExt({
    formatNumber: offset ? (n) => String(n + offset) : undefined,
  });
}

// The challenge card adapts its CodeMirror theme to the surrounding
// docs: dark docs → material-darker, light docs → IntelliJ IDEA.
// The active theme name is derived from `useIsDark()` at render time
// and reconfigured via compartments whenever the docs theme toggles.

// Minimum time (ms) the "running" overlay is held visible after a run
// completes. Matches the playground's MIN_ANIMATION_MS so a fast run
// (e.g. a few-line JS challenge that finishes in 20ms) doesn't blink
// the wave animation in and back out within a single frame.
const MIN_RUN_OVERLAY_MS = 300;

// Sine-wave running overlay — mirrors `<CodeBlock>`'s RunOverlay so the
// challenge card shows the same blue-wave hint while running/submitting.
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

function LanguageGlyph({ adapter }: { adapter: LanguageAdapter }) {
  const Icon = LANGUAGE_ICONS[adapter.id];
  const factor = LANGUAGE_ICON_SIZE_FACTOR[adapter.id] ?? 1;
  if (!Icon) return <span aria-hidden>{adapter.logoText}</span>;
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
  tests,
}: ChallengeCardProps) {
  const blockId = useBlockId(adapter);
  const initPanelId = `${blockId}-init`;

  // Normalize into a non-empty list of files. Authors always pass
  // `files`; guard against an empty array so the rest of the component
  // can assume at least one file is present.
  const workspaceFiles: ChallengeFile[] = useMemo(() => {
    if (files && files.length > 0) return files;
    const defaultName = `main.${adapter.defaultFileExtension || "txt"}`;
    return [{ filename: defaultName, starterCode: "" }];
  }, [files, adapter.defaultFileExtension]);

  const isMultiFile = workspaceFiles.length > 1;
  // The tab bar renders for multi-file workspaces, or when a single-file
  // card explicitly opts in via `showFileTabBar`.
  const showTabs = isMultiFile || showFileTabBar;
  const resolvedEntryFilename =
    (entryFilename && workspaceFiles.find((f) => f.filename === entryFilename)
      ? entryFilename
      : workspaceFiles[0].filename) ?? workspaceFiles[0].filename;

  // Remote datasets staged before every run (see the `datasets` prop).
  // Mirrored into a ref so the mount-once warm-up effect can prefetch
  // them without re-registering its IntersectionObserver when MDX
  // re-creates the prop array.
  const cardDatasets = datasets ?? NO_DATASETS;
  const datasetsRef = useRef(cardDatasets);
  useEffect(() => {
    datasetsRef.current = cardDatasets;
  }, [cardDatasets]);

  // Per-file read-only init code (trimmed). Init now belongs to a file,
  // so the init drawer + the editor's line-number offset both track
  // whichever file is the active tab.
  const initForFile = useCallback(
    (filename: string) => {
      const f = workspaceFiles.find((wf) => wf.filename === filename);
      return f?.initCode?.trimEnd() ?? "";
    },
    [workspaceFiles],
  );

  // ─── Solution files ─────────────────────────────────────────────────
  // Build the per-file solution view the modal renders. Every file
  // appears; files that supplied `solutionCode` show that text, while
  // files that did not are shown with their `starterCode` (the scaffold
  // the learner is not expected to change). The modal opens iff at least
  // one file actually has a solution.
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
  // Theme compartments — stored so the dark/light sync effect can
  // reconfigure the CM theme without remounting the editor.
  const mainThemeCompRef = useRef<Compartment | null>(null);
  const initThemeCompRef = useRef<Compartment | null>(null);
  const solutionThemeCompRef = useRef<Compartment | null>(null);
  // Line-number compartment for the main editor — reconfigured when the
  // active file changes so the gutter offset tracks that file's init
  // line count (the editable region continues numbering after the init).
  const mainLineNumberCompRef = useRef<Compartment | null>(null);
  // Debounce handle for the localStorage write that mirrors the editor
  // buffer. See `persistedKeyForFile` below.
  const persistSaveTimerRef = useRef<number | null>(null);

  // Stable per-file localStorage keys. The workspace fingerprint
  // includes every file's init + starter so editing the MDX retires
  // saved attempts against the old prompt; the filename is appended per
  // file so each tab persists independently.
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
  // Outer card element + one-shot guard so the shared runtime can be warmed
  // when the card first scrolls into view (see the warm-up effect below).
  const cardRef = useRef<HTMLDivElement | null>(null);
  const warmedRef = useRef(false);
  const runSeqRef = useRef(0);
  // Latest run handler — keeps the CodeMirror keymap closure
  // (registered once at mount) wired to the current function.
  const runRef = useRef<() => void>(() => {});
  // Latest submit handler. Bound to Mod-Enter from the editor's
  // keymap and to the split-button's default click. Falls back to
  // `run` for challenges that don't supply tests, so Mod-Enter
  // always does *something* sensible.
  const submitRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  // Tracks which action triggered the in-flight run so the Submit
  // pill can show the correct "Submitting…" vs "Running…" label
  // (the dropdown's "Run without Submitting" item should *not* read
  // as "Submitting…" while it's executing).
  const [activeAction, setActiveAction] = useState<"submit" | "run" | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string>("");
  // True while a *cold* runtime download is in flight, so the boot
  // notice only promises "first run only" when it really is the first
  // run. Mirrors `<CodeBlock>`.
  const [bootCold, setBootCold] = useState(false);
  // Latest stage-floor fraction reported by the adapter's boot (null
  // until the adapter reports one); smoothed for display below.
  const [bootFraction, setBootFraction] = useState<number | null>(null);
  // Mid-run blocking waits (e.g. Python's on-first-run package install)
  // — surfaces the boot notice during the wait. Callbacks are stable.
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

  // ─── Multi-file workspace state ─────────────────────────────────────
  // Each file has its own buffer + persisted copy. The single editor
  // view shows the active file; swapping tabs rewrites the doc with the
  // saved buffer for the newly-active file.
  const [activeFilename, setActiveFilename] = useState<string>(
    workspaceFiles[0].filename,
  );
  // Initialise once from props + persisted localStorage. Subsequent
  // edits drive this via the editor's update listener; tab switches
  // read it to repopulate the doc.
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

  // Active file's init code (trimmed) + derived line metrics. Init now
  // belongs to a file, so the read-only init drawer and the editor's
  // line-number offset both re-render / reconfigure when the active tab
  // changes.
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

  // Persist the active file's current doc content to its localStorage
  // key. Used by both the debounced editor listener and tab-switch /
  // unmount flushes.
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
    // Initial gutter offset = the active file's init line count. The
    // reconfigure effect below keeps it in sync as the active tab (and
    // therefore its init code) changes.
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
            // Default keyboard action mirrors the split button's
            // default button: Submit (i.e. run + check tests). For
            // challenges with no tests (`canCheck` false), the
            // submit handler short-circuits to run + display output
            // without ever flipping the pass/fail banner.
            key: "Mod-Enter",
            run: () => {
              submitRef.current();
              return true;
            },
          },
          {
            // Dropdown action: run the code without grading it.
            // Matches the dropdown menu item visible from the
            // chevron on the Submit button.
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

    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab switch: flush any pending debounced save for the previously
  // active file, snapshot the current editor doc into the file
  // buffers Map, load the newly-active file's buffer, and reset the
  // init drawer to collapsed (each file's init starts collapsed).
  const previousActiveRef = useRef(activeFilename);
  useEffect(() => {
    const view = editorRef.current;
    if (!view) {
      previousActiveRef.current = activeFilename;
      return;
    }
    const previousFilename = previousActiveRef.current;
    if (previousFilename === activeFilename) return;
    // Snapshot the outgoing file's buffer and flush its persisted copy.
    const outgoingContent = view.state.doc.toString();
    fileBuffersRef.current.set(previousFilename, outgoingContent);
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    persistActiveFile(previousFilename, outgoingContent);
    // Load the incoming file's buffer into the editor.
    const incoming = fileBuffersRef.current.get(activeFilename) ?? "";
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: incoming },
    });
    setInitExpanded(false);
    previousActiveRef.current = activeFilename;
  }, [activeFilename, persistActiveFile]);

  // Keep the editor's line-number gutter offset in sync with the active
  // file's init line count (the editable region numbers continue after
  // the read-only init). Runs on mount (after the view exists) and on
  // every tab switch.
  useEffect(() => {
    const view = editorRef.current;
    const comp = mainLineNumberCompRef.current;
    if (!view || !comp) return;
    view.dispatch({
      effects: comp.reconfigure(lineNumbersWithOffset(activeInitLineCount)),
    });
  }, [activeInitLineCount]);

  // Sync the CodeMirror theme across all active editors when the docs
  // colour scheme toggles (Fumadocs dark/light toggle or OS preference).
  useEffect(() => {
    const reconfigure = (view: EditorView | null, comp: Compartment | null) => {
      if (view && comp) {
        view.dispatch({ effects: comp.reconfigure(themeFor(cmThemeName)) });
      }
    };
    reconfigure(editorRef.current, mainThemeCompRef.current);
    reconfigure(initEditorRef.current, initThemeCompRef.current);
    reconfigure(solutionEditorRef.current, solutionThemeCompRef.current);
  }, [cmThemeName]);

  // Resolve which file the modal should display. Prefer the user's
  // explicit click; otherwise default to the first file that actually
  // has a real `solutionCode` so the modal lands on something the
  // learner is supposed to read. Derived rather than stored so we
  // don't need a `useEffect` to keep the selection in sync with
  // `solutionFiles` (which would trigger react-hooks/set-state-in-effect).
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

  // What text the modal actually displays for the active file. When
  // `initCode` is set we prepend a single-line comment header so the
  // learner knows there's read-only setup that runs before this code.
  const activeSolutionSource = useMemo(() => {
    if (!activeSolutionFile) return "";
    const fileInit = initForFile(activeSolutionFile.filename);
    if (!fileInit) return activeSolutionFile.source;
    const prefix = lineCommentFor(adapter.codeMirrorMode);
    const header = `${prefix} Initialization code (read-only) runs before this file. Solution begins below.\n\n`;
    return header + activeSolutionFile.source;
  }, [activeSolutionFile, initForFile, adapter.codeMirrorMode]);

  // Mount / re-mount the read-only solution editor whenever the modal
  // opens or the active solution file changes. We keep the doc
  // editable at the contenteditable level (relying on `readOnly` to
  // block insertions) so the user can click into the editor, move the
  // caret, and select text — including Mod-A select-all, which is
  // wired explicitly below since `editable.of(false)` would otherwise
  // drop keyboard focus and disable the default keymap.
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

  // Mount / re-mount the read-only init editor for the active file's
  // init code. Init now belongs to a file, so switching tabs rebuilds
  // this editor with the new file's init (or tears it down when the
  // active file has none). We keep it mounted even while collapsed so
  // the learner can see the first few lines through the gradient fade —
  // clicking the fade or the toggle expands it to full height.
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

  /** Execute the entry file's code against the shared runtime. Before
   *  invoking `run()`, stage every workspace file into the runtime's
   *  virtual file system (so multi-file `import`s / `include`s /
   *  cross-class references resolve) via `prepareFileSystem`. The
   *  caller passes a precomputed entry source so it can prepend the
   *  init/harness blocks without us having to know about either.
   *
   *  Sentinel-line filtering for the test harness is handled by the
   *  caller (so plain Run can stream raw output, but Check can post-
   *  process the stdout to peel off `__DSTEST__:…` lines). */
  const execute = useCallback(
    async (
      entrySource: string,
      filesSnapshot: Map<string, string>,
      // The caller's run sequence (from `++runSeqRef.current`). Owning
      // the increment in the caller lets it guard its own post-await
      // state updates too — a newer run/check/reset supersedes both
      // this execution's streaming updates and the caller's final ones.
      mySeq: number,
    ): Promise<{ cells: OutputCell[]; elapsedMs: number }> => {
      setOutputs([]);
      setBootCold(!isRuntimeReady(RuntimeScope.Fumadocs, adapter.id));
      setBootFraction(null);
      resetPrepare();
      setStatus("loading");
      setStatusMessage("Initializing runtime…");

      // Kick dataset downloads in parallel with the runtime boot so a
      // cold first Run overlaps the two waits. Usually instant: the
      // bytes are memoised in-session and persisted in the Cache API.
      // The no-op catch keeps an early bail-out (superseded run, boot
      // failure) from surfacing an unhandled rejection; awaiting the
      // promise below still observes the real error.
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

      // Re-use the shared per-adapter runtime — see runtimeRegistry.ts.
      // Once Pyodide / WebR / CheerpJ has loaded for any block on this
      // page, every other `<CodeBlock>` and `<ChallengeCard>` for the
      // same language attaches to that same worker instead of spinning
      // up its own. The adapter's `run()` wipes user globals before
      // every execution, so cards still can't observe each other's
      // variable state.
      if (!runtimeRef.current) {
        // The registry subscribes this callback to the in-flight boot
        // even when a silent warm-up started it, replaying the current
        // stage — so a Run click mid-boot shows live progress.
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
            `The ${adapter.runtimeInfo.language} runtime cannot stage dataset files (no virtual file system) — remove the card's \`datasets\` prop.`,
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
      const cells: OutputCell[] = [];

      // Stage files into the runtime VFS: the card's remote datasets
      // (so init/starter code can read them like local files) and — for
      // multi-file workspaces — every workspace file, so imports
      // resolve. The entry file's bytes mirror what we pass to `run()`
      // below, including any init prelude / harness suffix the caller
      // bolted on.
      //
      // Single-file cards pass their source straight to `run()` and must
      // NOT pre-stage it: some runtimes (CheerpJ/Java, .NET/C#) compile the
      // staged file set when the VFS is populated, and with no
      // `entryFilename` (single-file) they then can't locate `main`, so the
      // program produces no output. This mirrors <CodeBlock>, which only
      // stages for multi-file workspaces. (Staging only *dataset* files is
      // safe: those runtimes ignore non-source files.)
      if (
        (isMultiFile || datasetFiles.length > 0) &&
        runtime.prepareFileSystem
      ) {
        const fileMap = new Map<string, Uint8Array>();
        // Dataset bytes first, so a (misauthored) workspace file with
        // the same name deterministically wins.
        for (const f of datasetFiles) fileMap.set(f.filename, f.bytes);
        if (isMultiFile) {
          const encoder = new TextEncoder();
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
          (cell) => {
            if (runSeqRef.current !== mySeq) return;
            const elapsedMs = performance.now() - startedAt;
            const fmt =
              elapsedMs < 1000
                ? `${elapsedMs.toFixed(0)}ms`
                : `${(elapsedMs / 1000).toFixed(2)}s`;
            // Collapse consecutive stdout cells into a single block
            // (matches the JS/TS/PHP playground behaviour where one
            // console.log per cell would otherwise produce a noisy
            // stack of one-line cells).
            const last = cells[cells.length - 1];
            if (
              cell.type === "stdout" &&
              last &&
              last.type === "stdout"
            ) {
              cells[cells.length - 1] = {
                ...last,
                content: last.content + "\n" + cell.content,
                elapsed: fmt,
              };
            } else {
              const full: OutputCell = {
                id: ++nextOutputId,
                elapsed: fmt,
                ...cell,
              };
              cells.push(full);
            }
          },
          {
            entryFilename: isMultiFile ? resolvedEntryFilename : undefined,
            // Mid-run waits (e.g. Python's deferred package set on the
            // first run, or an on-demand `import`) show the boot notice
            // for the duration instead of a bare "Running…" while
            // megabytes download.
            onStatus: (message, preparing) => {
              if (runSeqRef.current !== mySeq) return;
              setStatusMessage(message);
              reportPrepare(message, preparing);
            },
          },
        );
      } finally {
        // Hold the running overlay for at least MIN_RUN_OVERLAY_MS so
        // the wave animation doesn't blink in/out on sub-frame runs.
        // The `finally` covers the throw path so error states also
        // get the same minimum visible duration; the thrown exception
        // still propagates to the caller's catch.
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
    ],
  );

  const formatElapsed = (ms: number) =>
    ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

  // ─── Run (no tests) ────────────────────────────────────────────────
  const run = useCallback(async () => {
    const mySeq = ++runSeqRef.current;
    setActiveAction("run");
    // Running without submitting isn't a graded attempt, so clear any prior
    // test results and pass/fail banner instead of leaving stale state behind.
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
      // Only the latest run owns the busy spinner — a superseded run
      // clearing it would re-enable Run/Submit mid-flight for its
      // successor.
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

  // Warm the shared runtime as soon as the page lands (idle-scheduled,
  // Save-Data-guarded, one boot at a time — see runtime/warmup.ts), so
  // the time a reader spends on the page's prose pays for the runtime
  // download instead of the first Run/Submit click.
  useEffect(() => {
    warmRuntimeOnRouteLand(RuntimeScope.Fumadocs, adapter);
  }, [adapter]);

  // Warm the shared runtime when the card first scrolls into view, so the
  // learner's first Run/Submit reuses an already-initialised runtime instead
  // of triggering a cold download on click. Kept as the fallback for
  // Save-Data users (the route-land warm-up skips them) and for additional
  // languages further down the page. Best-effort and deduped across all
  // cards/blocks of the same language by the registry; failures are swallowed
  // so an actual Run can retry and surface the real error.
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
          })
          .catch(() => {
            warmedRef.current = false;
          });
        // Prefetch the card's datasets alongside the runtime, so a cold
        // Run/Submit finds both the engine and the data already local.
        // Also best-effort: the Run path re-requests (and reports)
        // failures.
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

  // The split button's default action (and Mod-Enter) is "Submit"
  // when the challenge actually has tests; otherwise it falls back
  // to a plain Run so the keystroke isn't a dead key.
  useEffect(() => {
    submitRef.current = canCheck ? () => void check() : () => void run();
  }, [canCheck, check, run]);

  // ─── Reset ─────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    runSeqRef.current++;
    // Restore every file's buffer to its MDX starter, drop the active
    // file's saved copy from localStorage so the next mount picks up
    // the starter cleanly, and reload the active doc into the editor.
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
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    setOutputs([]);
    setElapsed("");
    setStatus("idle");
    setStatusMessage("");
    setTestResults([]);
    setBannerState(null);
    // A run superseded by this reset skips its own spinner cleanup
    // (its `finally` is sequence-guarded), so clear it here.
    setActiveAction(null);
    toasts.show("Reset to starter code.");
  }, [persistedKeyForFile, toasts, workspaceFiles]);

  // ─── Apply solution ────────────────────────────────────────────────
  // Load every file's reference solution into the learner's editor (the
  // "Load Solution into Editor" button in the solution modal). Files
  // without their own solution are scaffold the learner isn't meant to
  // change, so they're left untouched. The active file is written
  // straight into the live editor; if it has no solution of its own we
  // hop to the first file that does, so the applied code lands on screen
  // instead of silently in a background buffer.
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

    // If the active tab is a scaffold file (no solution of its own),
    // switch to the first solved file. The tab-switch effect snapshots
    // the unchanged scaffold out and loads the freshly-set solution
    // buffer in — no clobbering, since we never wrote the scaffold's
    // buffer above.
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
  // Expose an imperative driver on `window.__dsChallenges` so the
  // Playwright solution sweep (e2e/challenge-solutions.spec.ts) can
  // load a card's reference solution into its buffers and run the
  // tests without round-tripping every keystroke through the DOM.
  // The registry key is a (adapter.id, title) tuple — stable across
  // page reloads, so the test can lock onto a card via the same
  // identifier the data attributes expose.
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
            /* quota / private mode — ignore, in-memory buffer still updated */
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
      toasts.show("Couldn't copy code — clipboard blocked.", "warn");
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
      const formatted = await adapter.formatCode(code);
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      if (formatted === code) {
        toasts.show("Already formatted — nothing to change.");
      } else {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        toasts.show("Code formatted.");
      }
    } catch {
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      toasts.show("Couldn't format — code may have a syntax error.", "warn");
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
  // determinate fraction — just the loader + the wait message.
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

  // Test-only solution payload. Stamped onto the card as a JSON-encoded
  // list of { filename, source } pairs so the Playwright solution
  // runner (e2e/challenge-solutions.spec.ts) can drive each card
  // without us having to parse MDX outside of next. Only files with
  // an actual solution are included — scaffold files the learner is
  // not expected to modify are omitted.
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
        <div className={styles.instructionsBody}>
          {renderInstructions(instructions)}
        </div>
      </div>

      {/* ── File tab bar ──
            Shown for multi-file workspaces, or when a single-file card
            opts in via `showFileTabBar`. The init drawer (which now
            belongs to the active file) renders below it. */}
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
            The init drawer belongs to the active file and renders below
            the file tab bar. When ≤3 lines: always shown expanded, no
            toggle header. When >3 lines: collapsed by default with a
            gradient fade overlay and "Click to expand" prompt; the toggle
            header lets the user collapse it again. The light top border
            is added only when no file tab bar sits above it. */}
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

      {/* ── Editor ──
            Gets a light top border only when nothing above it (file tab
            bar or the active file's init drawer) already supplies a
            divider. */}
      <div
        className={`${styles.editor}${
          !activeHasInit && !showTabs ? ` ${styles.topBorderLight}` : ""
        }`}
        ref={editorHostRef}
        aria-label={`${adapter.runtimeInfo.language} solution editor`}
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
            // Challenges without tests still get a plain Run pill —
            // no menu, no dropdown — since there's nothing to
            // submit. The keymap above falls back to `run` for the
            // same reason.
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
          {/* Runtime status / loading message — mirrors the executable
              code block's status text. While the runtime is fetching
              its WASM toolchain on first run, this surfaces "Loading
              Pyodide", "Loading browsercc clang toolchain (this can
              take a moment)…" etc. instead of leaving the user
              staring at a spinning button with no context. */}
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

      {/* ── Output panel ── */}
      {(outputs.length > 0 || isBusy) && (
        <div
          className={`${styles.outputPanel}${isBusy ? ` ${styles.outputRunning}` : ""}`}
          aria-live="polite"
        >
          {/* The "Output" header is hidden while the boot notice (loading
              animation) is showing — there's no output yet, just setup.
              It returns the moment user code actually runs. */}
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
                <span className={styles.outputTime}>
                  <Timer size={12} aria-hidden="true" />
                  {elapsed}
                </span>
              )}
            </div>
          )}
          {showBootNotice && (
            // Same boot affordance as `<CodeBlock>`: the brand
            // assemble-and-quarter-turn loader, staged copy with the
            // cold-download size, and a determinate bar once the adapter
            // reports stage fractions (see RuntimeBootNotice). Also shown
            // for mid-run blocking waits (package install) — no runtime
            // download or fraction in that case.
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
          {/* No "Running…" placeholder while output is empty — the blue
              wave overlay already signals the run is in progress. */}
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

  // Copy the active file's raw solution — not the synthetic
  // "init runs first" comment header that the read-only editor prepends
  // for display when the file carries its own init code.
  const activeRaw = useMemo(
    () => files.find((f) => f.filename === activeFilename)?.source ?? source,
    [files, activeFilename, source],
  );
  // Whether the active file's solution is identical to its starter — used
  // to surface a subtle "no edits needed" note in multi-file workspaces.
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
      /* clipboard blocked — leave the label unchanged */
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
              One valid answer — there may be others.
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
              This file is unchanged from the starter code — no edits are
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
  // that ancestor — see app/_components/ChallengeCard.module.css (.modalBackdrop).
  return typeof document === "undefined"
    ? modal
    : createPortal(modal, document.body);
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
        // `not-prose` keeps the docs' prose typography (enlarged Inter,
        // table margins) from restyling the dataframe markup when the
        // card sits inside MDX content.
        className={`${styles.outCellHtml} not-prose`}
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
