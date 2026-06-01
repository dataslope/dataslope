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
import { RotateCcw, Check, X, ChevronDown, ChevronUp, Eye, File, Play, Terminal } from "lucide-react";
import { Menu } from "@base-ui-components/react/menu";
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
import { loadLanguage, themeFor, noActiveLine } from "./cmExtensions";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
} from "./types";
import { getSharedRuntime, RuntimeScope } from "./runtimeRegistry";
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
  type ChallengeTest,
  type ParsedTestResult,
} from "./challengeHarness";
import styles from "./ChallengeCard.module.css";

type Status = "idle" | "loading" | "ready" | "running" | "error";
type TestState = "pending" | "pass" | "fail";

interface DisplayedTest {
  id: string;
  name: string;
  description?: string;
  state: TestState;
  detail: string | null;
}

/** One file in a multi-file challenge workspace. Authors who only need
 *  a single editable file should pass `initialCode` instead — `files`
 *  is for cases where the learner edits more than one file (e.g. a
 *  Java challenge with both `Main.java` and `Dog.java`). */
export interface ChallengeFile {
  /** Workspace-relative filename, e.g. `"Dog.java"`. */
  filename: string;
  /** Starter content shown in the editor for this file. Reset restores
   *  this exact text. */
  initialContent: string;
  /** Optional reference solution for this file. When at least one file
   *  in a multi-file challenge supplies `solutionContent`, the
   *  Solution modal renders the same file tab bar (non-sortable,
   *  non-closeable) so the learner can flip between files; files that
   *  omit `solutionContent` are shown with their `initialContent` (the
   *  scaffold the learner does not need to modify). */
  solutionContent?: string;
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
  /** True when the author supplied a real solution for this file
   *  (single-file `solutionCode`, or multi-file `solutionContent`).
   *  False when we are echoing back the file's `initialContent`
   *  because the file is part of the scaffold the learner is not
   *  expected to modify. The modal labels these "(unchanged)" so
   *  the learner can tell the file apart from one they should edit. */
  hasSolution: boolean;
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
  /** Optional initialization code prepended verbatim to the user's
   *  code on every run. Rendered in a collapsed-by-default read-only
   *  panel above the editor, mirroring `<CodeBlock>`'s `initCode`. */
  initCode?: string;
  /** Starting source loaded into the editor. The Reset button restores
   *  this exact text. Ignored when `files` is supplied. */
  initialCode?: string;
  /** Multi-file workspace. When set, takes precedence over
   *  `initialCode`. A non-sortable, non-closeable tab bar appears above
   *  the editor so the learner can switch between files. Tests still
   *  run against `entryFilename` (or the first file when omitted) —
   *  every other file is staged into the runtime's virtual file system
   *  via `prepareFileSystem` so multi-file `import`s / `include`s /
   *  cross-class references resolve. */
  files?: ChallengeFile[];
  /** When `files` is set, the filename whose content is passed to
   *  `runtime.run()` as the entry. Defaults to the first file. */
  entryFilename?: string;
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

export default function ChallengeCard({
  adapter,
  title,
  badge = "Challenge",
  instructions,
  initCode,
  initialCode,
  files,
  entryFilename,
  solutionCode,
  tests,
}: ChallengeCardProps) {
  const blockId = useBlockId(adapter);
  const trimmedInit = initCode?.trimEnd() ?? "";
  const hasInit = trimmedInit.length > 0;
  const initLineCount = hasInit ? trimmedInit.split("\n").length : 0;
  const initPanelId = `${blockId}-init`;

  // Normalize prop shape into a list of files. Single-file authors pass
  // `initialCode`; multi-file authors pass `files`. We always work with
  // the array internally so the rest of the component is uniform.
  const workspaceFiles: ChallengeFile[] = useMemo(() => {
    if (files && files.length > 0) return files;
    const defaultName = `main.${adapter.defaultFileExtension || "txt"}`;
    return [{ filename: defaultName, initialContent: initialCode ?? "" }];
  }, [files, initialCode, adapter.defaultFileExtension]);

  const isMultiFile = workspaceFiles.length > 1;
  const resolvedEntryFilename =
    (entryFilename && workspaceFiles.find((f) => f.filename === entryFilename)
      ? entryFilename
      : workspaceFiles[0].filename) ?? workspaceFiles[0].filename;

  // ─── Solution files ─────────────────────────────────────────────────
  // Build the per-file solution view the modal renders. For single-file
  // challenges the legacy `solutionCode` prop becomes the synthetic
  // entry file's solution. For multi-file challenges, every file
  // appears in the tab bar — files that supplied `solutionContent`
  // show that text; files that did not are shown with their
  // `initialContent` (the scaffold the learner is not expected to
  // change). The modal opens iff at least one file actually has a
  // solution.
  const solutionFiles: SolutionFile[] = useMemo(() => {
    const out: SolutionFile[] = [];
    for (const file of workspaceFiles) {
      const explicit = file.solutionContent;
      if (isMultiFile) {
        out.push({
          filename: file.filename,
          source: explicit ?? file.initialContent,
          hasSolution: explicit !== undefined,
        });
      } else if (solutionCode !== undefined) {
        out.push({
          filename: file.filename,
          source: solutionCode,
          hasSolution: true,
        });
      }
    }
    return out;
  }, [workspaceFiles, isMultiFile, solutionCode]);
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
  // Debounce handle for the localStorage write that mirrors the editor
  // buffer. See `persistedKey` below.
  const persistSaveTimerRef = useRef<number | null>(null);

  // Stable per-file localStorage keys. The workspace fingerprint
  // includes every starter so editing the MDX retires saved attempts
  // against the old prompt; the filename is appended per file so each
  // tab persists independently.
  const workspaceFingerprint = useMemo(
    () =>
      workspaceFiles.map((f) => `${f.filename}:${f.initialContent}`).join("|"),
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
  // Legacy single-file key retained so existing challenges don't lose
  // their saved buffers when this multi-file support shipped.
  const persistedKey = useMemo(
    () =>
      persistKey("challenge", `${adapter.id}|${title}|${initialCode ?? ""}`),
    [adapter.id, title, initialCode],
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
        if (isMultiFile) {
          const persisted = loadPersistedCode(persistedKeyForFile(f.filename));
          return [f.filename, persisted ?? f.initialContent];
        }
        // Single-file mode honours the legacy persistedKey so existing
        // saved attempts survive.
        const persisted = loadPersistedCode(persistedKey);
        return [f.filename, persisted ?? f.initialContent];
      }),
    ),
  );
  const activeFilenameRef = useRef(activeFilename);
  useEffect(() => {
    activeFilenameRef.current = activeFilename;
  }, [activeFilename]);

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

  const canCheck = canRunTests(adapter.id, tests);

  // Persist the active file's current doc content to its localStorage
  // key. Used by both the debounced editor listener and tab-switch /
  // unmount flushes.
  const persistActiveFile = useCallback(
    (filename: string, content: string) => {
      const key = isMultiFile
        ? persistedKeyForFile(filename)
        : persistedKey;
      savePersistedCode(key, content);
    },
    [isMultiFile, persistedKey, persistedKeyForFile],
  );

  // ─── Editor mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;
    const themeComp = new Compartment();
    const languageComp = new Compartment();
    const lineOffset = hasInit ? initLineCount : 0;

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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab switch: flush any pending debounced save for the previously
  // active file, snapshot the current editor doc into the file
  // buffers Map, and load the newly-active file's buffer.
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
    previousActiveRef.current = activeFilename;
  }, [activeFilename, persistActiveFile]);

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
  // has a real `solutionContent` so the modal lands on something the
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
    if (!hasInit) return activeSolutionFile.source;
    const prefix = lineCommentFor(adapter.codeMirrorMode);
    const header = `${prefix} Initialization code (read-only) runs before this file. Solution begins below.\n\n`;
    return header + activeSolutionFile.source;
  }, [activeSolutionFile, hasInit, adapter.codeMirrorMode]);

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
        EditorState.tabSize.of(4),
        indentUnit.of("    "),
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

  // Mount the read-only init editor once whenever `hasInit` becomes
  // true. We keep the editor mounted even in the collapsed state so
  // the learner can see the first few lines of context through the
  // gradient fade — clicking the fade or the toggle expands the
  // panel to the full height.
  useEffect(() => {
    if (!hasInit) return;
    if (!initEditorHostRef.current || initEditorRef.current) return;
    const languageComp = new Compartment();
    const themeComp = new Compartment();
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
      initEditorRef.current = null;
      initThemeCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInit]);

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
    ): Promise<{ cells: OutputCell[]; elapsedMs: number }> => {
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

      // Multi-file workspaces: stage every file into the runtime VFS so
      // imports resolve. The entry file's bytes mirror what we pass to
      // `run()` below, including any init prelude / harness suffix the
      // caller bolted on. Adapters that don't support multi-file omit
      // `prepareFileSystem` entirely — the call is a no-op there.
      if (runtime.prepareFileSystem) {
        const fileMap = new Map<string, Uint8Array>();
        const encoder = new TextEncoder();
        for (const [name, content] of filesSnapshot) {
          fileMap.set(
            name,
            encoder.encode(
              name === resolvedEntryFilename ? entrySource : content,
            ),
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
          isMultiFile ? { entryFilename: resolvedEntryFilename } : undefined,
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
    [adapter, isMultiFile, resolvedEntryFilename],
  );

  const formatElapsed = (ms: number) =>
    ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;

  // ─── Run (no tests) ────────────────────────────────────────────────
  const run = useCallback(async () => {
    setActiveAction("run");
    const snapshot = snapshotAllFiles();
    const entryCode = snapshot.get(resolvedEntryFilename) ?? "";
    const combined = hasInit ? `${trimmedInit}\n${entryCode}` : entryCode;
    try {
      const { cells, elapsedMs } = await execute(combined, snapshot);
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
    } finally {
      setActiveAction(null);
    }
  }, [execute, hasInit, resolvedEntryFilename, snapshotAllFiles, trimmedInit]);

  // ─── Check Answer (run + tests) ─────────────────────────────────────
  const check = useCallback(async () => {
    if (!canCheck) return;
    setActiveAction("submit");
    const snapshot = snapshotAllFiles();
    const entryCode = snapshot.get(resolvedEntryFilename) ?? "";
    const userPart = hasInit ? `${trimmedInit}\n${entryCode}` : entryCode;
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
      const { cells, elapsedMs } = await execute(combined, snapshot);

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
    } finally {
      setActiveAction(null);
    }
  }, [
    adapter.id,
    canCheck,
    execute,
    hasInit,
    resolvedEntryFilename,
    snapshotAllFiles,
    tests,
    trimmedInit,
  ]);

  // Keep the keymap closure pointing at the latest `run` handler.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

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
      fileBuffersRef.current.set(f.filename, f.initialContent);
      const key = isMultiFile
        ? persistedKeyForFile(f.filename)
        : persistedKey;
      clearPersistedCode(key);
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
    toasts.show("Reset to starter code.");
  }, [
    isMultiFile,
    persistedKey,
    persistedKeyForFile,
    toasts,
    workspaceFiles,
  ]);

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
          const persisted = isMultiFile
            ? persistedKeyForFile(filename)
            : persistedKey;
          try {
            window.localStorage.setItem(persisted, content);
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
    isMultiFile,
    persistedKey,
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
    <div
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

      {/* ── Init code ──
            When ≤3 lines: always shown expanded, no toggle header.
            When >3 lines: collapsed by default with a gradient fade
            overlay and "Click to expand" prompt; the toggle header
            lets the user also collapse it again after expanding. */}
      {hasInit && (
        <div className={styles.initWrap}>
          {initLineCount > 3 && (
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
          )}
          <div
            className={`${styles.initEditorWrap} ${
              initLineCount <= 3 || initExpanded
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
            {!initExpanded && initLineCount > 3 && (
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
            {initExpanded && initLineCount > 3 && (
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

      {/* ── File tab bar (multi-file workspaces only) ── */}
      {isMultiFile && (
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

      {/* ── Editor ── */}
      <div
        className={styles.editor}
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
                    {t.description && <div className={styles.testItemDesc}>{t.description}</div>}
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
        <div
          className={styles.banner}
          data-state={bannerState}
          data-testid="challenge-banner"
        >
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
      {solutionOpen && hasSolution && activeSolutionFile && (
        <SolutionModal
          onClose={() => setSolutionOpen(false)}
          editorHostRef={solutionEditorHostRef}
          source={activeSolutionSource}
          files={solutionFiles}
          activeFilename={activeSolutionFile.filename}
          onSelectFile={setSolutionActiveFilename}
          showTabs={isMultiFile}
        />
      )}

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
  showTabs,
}: {
  onClose: () => void;
  editorHostRef: React.RefObject<HTMLDivElement | null>;
  source: string;
  files: SolutionFile[];
  activeFilename: string;
  onSelectFile: (filename: string) => void;
  showTabs: boolean;
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
      className={styles.modalBackdrop}
    >
      <div
        className={`${styles.card} ${styles.modalCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.badge}>
            <Terminal size={9} aria-hidden /> Solution
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
        <div
          ref={editorHostRef}
          className={styles.modalEditor}
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
