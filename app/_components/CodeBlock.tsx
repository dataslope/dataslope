"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import { ChevronDown, ChevronUp, File, Info, Lock, Play, RotateCcw } from "lucide-react";
import { Popover } from "@base-ui/react/popover";
import { Toast } from "@base-ui/react/toast";
import {
  FormatIcon,
  PlayIcon,
  useCreepingBootFraction,
  useMidRunPreparing,
  type Status,
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
import { useAskAiSource } from "./ai/contextRegistry";
import { describeCodeBlock } from "./ai/widgetSnapshots";
import { aiInlineCompletion } from "./ai/inlineCompletion";
import { languageCompletion } from "./completion/languageCompletion";

import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PlotlyFigure,
} from "./types";
import {
  getSharedRuntime,
  isRuntimeReady,
  retainRuntime,
  RuntimeScope,
} from "./runtimeRegistry";
import { mergeInitAndEntry } from "./runtime/mergeInit";
import {
  datasetStageFilename,
  fetchDatasetBytes,
  type DatasetStageSpec,
} from "./runtime/remoteDatasets";
import { warmRuntimeOnRouteLand } from "./runtime/warmup";
import { PlotlyChart } from "./PlotlyChart";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import { usePrepopulatedOutput } from "./mdx/BlockOutputs";
import { usePrecompiledBundle } from "./mdx/ReactBundles";
import { blockOutputKey, workspaceOutputKey } from "@/lib/blockOutputKey";
import { previewStageStyle } from "./previewStage";
import {
  PREVIEW_IFRAME_CLASS,
  PREVIEW_SANDBOX,
  subscribeToPreviewConsole,
} from "./runtime/webPreview";
import styles from "./CodeBlock.module.css";
import challengeStyles from "./ChallengeCard.module.css";

/** One file in a multi-file `<CodeBlock>` workspace; mirrors the
 *  `ChallengeFile` shape from `ChallengeCard`. */
export interface CodeBlockFile {
  /** Workspace-relative filename, e.g. `"greeter.hpp"`. */
  filename: string;
  /** Optional read-only init code for THIS file, prepended verbatim on
   *  every Run and shown in a collapsed read-only panel above the editor.
   *  The prepend is purely textual, so init must be valid at the target
   *  language's top level. */
  initCode?: string;
  /** Starter content shown in the editor; Reset restores this exact text. */
  starterCode: string;
}

interface CodeBlockProps {
  /** Language adapter describing the runtime. Blocks sharing an adapter
   *  share one runtime, but each block executes against freshly-reset
   *  state. */
  adapter: LanguageAdapter;
  /** Marks a block whose lesson *is* the failure. Purely declarative, but
   *  the content sweeps assert it in both directions: the block must raise,
   *  and one that stops raising is a regression nothing else would catch.
   *  Surfaced as `data-expect-error` for the e2e sweeps. */
  expectError?: boolean;
  /** Workspace files (at least one). Code runs against `entryFilename` (or
   *  the first file); every other file is staged into the runtime's VFS via
   *  `prepareFileSystem` so multi-file imports/includes resolve. More than
   *  one file (or `showFileTabBar`) renders the tab bar. */
  files: CodeBlockFile[];
  /** When `files` has more than one entry, the filename whose content is
   *  passed to `runtime.run()` as the entry. Defaults to the first file. */
  entryFilename?: string;
  /** Remote dataset files staged into the runtime's working directory
   *  before every Run (paths in the dataslope/datasets repo, or full URLs;
   *  downloads are cached globally). Requires a runtime that implements
   *  `prepareFileSystem`. */
  datasets?: DatasetStageSpec[];
  /** Optional header label. Defaults to an auto-generated one. */
  label?: string;
  /** Force the file tab bar to render even for a single-file workspace. */
  showFileTabBar?: boolean;
  /** Extra importable module names to pre-install at warm-up, merged with
   *  the modules found by scanning the block's own code. Escape hatch for
   *  imports the scan can't see. Python only. */
  packages?: string[];
  /** Inject the pinned Tailwind in-browser compiler into the preview
   *  document on every Run. Preview adapters (web / react) only; see
   *  `TAILWIND_BROWSER_CDN` in runtime/cdn.ts. */
  tailwind?: boolean;
  /** Height of the live-preview stage (number → px), preview adapters only.
   *  Reserved from first paint so a Run never grows the card; set it lower
   *  than the 300px default for small-output blocks. */
  previewHeight?: number | string;
  /** Render the preview before the reader presses Run (needs the adapter's
   *  `composeStaticPreview`). Defaults to the adapter's
   *  `outputCapabilities.autoPreview` (on for web, off for react) — this
   *  prop exists to say *no*, not to turn the feature on. Forced off for
   *  `expectError` blocks so the failure isn't spoiled. */
  autoPreview?: boolean;
}

// Detect the active color scheme from the `dark`/`light` class next-themes
// puts on <html>, falling back to the OS preference. Deliberately does NOT
// read `data-theme`: the playground sets it and it can transiently persist
// during SPA navigation, giving /learn CodeBlocks the wrong theme.
function detectIsDark(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true;
}

// Subscribe to <html> class mutations to re-render on docs theme toggles;
// SSR snapshot defaults to dark.
function useIsDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof document === "undefined") return () => {};
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      const mql =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(prefers-color-scheme: dark)")
          : null;
      mql?.addEventListener?.("change", notify);
      return () => {
        observer.disconnect();
        mql?.removeEventListener?.("change", notify);
      };
    },
    () => detectIsDark(),
    () => true,
  );
}

function cmThemeNameFor(isDark: boolean): string {
  return isDark ? "github-dark" : "github-light";
}

// Clipboard glyph shared by the action bar and output-cell headers;
// stroke-only so it inherits the current text color.
function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-5A1.5 1.5 0 0 0 3 3.5v5A1.5 1.5 0 0 0 4.5 10H5" />
    </svg>
  );
}

// Renders all active toasts; must live inside the Toast.Provider supplied
// by the CodeBlock wrapper so Toast.useToastManager() works.
function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={styles.toastRoot}
    >
      <Toast.Content className={styles.toastContent}>
        <Toast.Title className={styles.toastTitle}>{toast.title}</Toast.Title>
        <Toast.Close className={styles.toastClose} aria-label="Dismiss">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

// Public export: wraps the inner component with a Toast.Provider.
export default function CodeBlock(props: CodeBlockProps) {
  return (
    <Toast.Provider timeout={2400}>
      <Toast.Portal>
        <Toast.Viewport className={styles.toastViewport}>
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
      <CodeBlockInner {...props} />
    </Toast.Provider>
  );
}

// Stable empty list so blocks without a `datasets` prop don't re-create
// hook dependencies on every render.
const NO_DATASETS: DatasetStageSpec[] = [];

function CodeBlockInner({
  adapter,
  files,
  entryFilename,
  datasets,
  showFileTabBar = false,
  packages,
  tailwind = false,
  expectError,
  previewHeight,
  autoPreview,
}: CodeBlockProps) {
  const blockId = useBlockId(adapter);

  const toastManager = Toast.useToastManager();

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  // Compartments reconfigured when the active file changes: line-number
  // offset (init line count) and language (mixed-language workspaces).
  const lineNumberCompRef = useRef<Compartment | null>(null);
  const languageCompRef = useRef<Compartment | null>(null);
  // Preview iframe slot; always in the DOM for preview-capable adapters so
  // the element exists by the time `runtime.run` needs it.
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const hasPreview = Boolean(adapter.outputCapabilities?.preview);
  const initEditorHostRef = useRef<HTMLDivElement | null>(null);
  const initEditorRef = useRef<EditorView | null>(null);
  const initThemeCompRef = useRef<Compartment | null>(null);
  const runtimeRef = useRef<LanguageRuntime | null>(null);
  // Outer card element + one-shot guard for the scroll-into-view warm-up.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const warmedRef = useRef(false);
  // Sequence number so output from a superseded run is dropped.
  const runSeqRef = useRef(0);
  // Latest run handler, keeps the mount-once CodeMirror keymap current.
  const runRef = useRef<() => void>(() => {});
  // Debounce handle for localStorage persistence (see editor mount).
  const persistSaveTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
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
  // ─── Prepopulated output ────────────────────────────────────────────
  // What this block printed at build time (scripts/build-block-outputs.mjs),
  // seeded into the same state a real run writes so downstream consumers
  // see ordinary cells; the first Run clears them. Keyed on the *entry*
  // file (mirroring `resolvedEntryFilename`, computed further down), else a
  // multi-file block would be keyed on a file the generator never executed.
  const entryFile =
    (entryFilename ? files?.find((f) => f.filename === entryFilename) : null) ??
    files?.[0];
  const outputKey = blockOutputKey(
    adapter.id,
    entryFile?.initCode,
    entryFile?.starterCode ?? "",
  );
  const prepopulated = usePrepopulatedOutput(outputKey);
  // Negative ids so prepopulated cells never collide with a run's own
  // (which count up from 1).
  const seedOutputs = useCallback(
    (): OutputCell[] =>
      prepopulated
        ? prepopulated.cells.map((cell, i) => ({ ...cell, id: -(i + 1), elapsed: "" }))
        : [],
    [prepopulated],
  );
  const [outputs, setOutputs] = useState<OutputCell[]>(seedOutputs);
  // True until the reader runs the block themselves, which is what the
  // "preview" label and its explanation hang off.
  const [showingPreview, setShowingPreview] = useState(prepopulated !== null);
  const [initExpanded, setInitExpanded] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const initPanelId = `${blockId}-init`;

  // ─── Multi-file workspace ───────────────────────────────────────────
  // Guard against an empty `files` array so the rest of the component can
  // assume at least one file.
  const workspaceFiles: CodeBlockFile[] = useMemo(() => {
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

  // ─── Auto-rendered preview ──────────────────────────────────────────
  // The page this block's *starter* renders, composed without a runtime
  // (`composeStaticPreview`) so it's in the server's HTML at first paint.
  // Deliberately the starter, not the restored buffer: the buffer is
  // restored after hydration, so composing from it would render twice and
  // shift between; Run replaces this frame with the reader's version.
  const autoPreviewEnabled =
    (autoPreview ?? adapter.outputCapabilities?.autoPreview ?? false) &&
    !expectError;
  // The frame's bridge token. It must be DERIVED, not random: the document
  // is composed on the server and again in the browser and React compares
  // the two. Content hash + blockId stays distinct between identical blocks
  // on one page. A derived token is guessable, acceptable only because this
  // frame carries no harness — it authenticates "which frame said this",
  // not "did the learner pass". Do not reuse for a harnessed document.
  const autoPreviewToken = `${outputKey}-${blockId.replace(/[^a-zA-Z0-9-]/g, "")}`;
  // Build-time bundle for adapters that can't compose from source alone:
  // `web` ignores it; `react` renders nothing without it (in-browser TSX
  // translation is the ~3 MB download this avoids). Keyed over the whole
  // workspace (`workspaceOutputKey`), not the entry alone — the bundle
  // bakes every file in, so an edit to any of them must miss here and
  // fall back to the empty panel until the workflow rebuilds.
  const bundleKey = workspaceOutputKey(
    adapter.id,
    workspaceFiles,
    resolvedEntryFilename,
  );
  const precompiled = usePrecompiledBundle(bundleKey);
  const autoPreviewDoc = useMemo(() => {
    if (!autoPreviewEnabled || !adapter.composeStaticPreview) return null;
    const sources = workspaceFiles.map((f) => {
      const init = f.initCode?.trimEnd() ?? "";
      return {
        filename: f.filename,
        source: init
          ? mergeInitAndEntry(adapter.id, init, f.starterCode)
          : f.starterCode,
      };
    });
    try {
      return adapter.composeStaticPreview(sources, {
        entryFilename: resolvedEntryFilename,
        token: autoPreviewToken,
        tailwind: tailwind || undefined,
        bundle: precompiled ?? undefined,
      });
    } catch {
      // Fall back to the empty slot; a throw here would take the lesson down.
      return null;
    }
  }, [
    adapter,
    autoPreviewEnabled,
    autoPreviewToken,
    precompiled,
    workspaceFiles,
    resolvedEntryFilename,
    tailwind,
  ]);
  // Retired by the first Run (see `run`), restored by Reset.
  const [showAutoPreview, setShowAutoPreview] = useState(true);
  const autoPreviewFrameRef = useRef<HTMLIFrameElement | null>(null);
  // Reserve output-panel space in the server's HTML so the auto-preview's
  // console cells don't grow the card ~96px on arrival. Gated on the source
  // mentioning `console.` — a deliberate heuristic: a false positive
  // reserves a little space for nothing, and a false negative would need a
  // block that reaches the console without naming it.
  const reservesOutput = useMemo(() => {
    if (!autoPreviewEnabled || !autoPreviewDoc) return false;
    return workspaceFiles.some(
      (f) => /\bconsole\s*\./.test(f.starterCode) || /\bconsole\s*\./.test(f.initCode ?? ""),
    );
  }, [autoPreviewEnabled, autoPreviewDoc, workspaceFiles]);

  // Forward the auto-rendered frame's console output into this block's
  // output panel. The frame usually finishes printing before this effect
  // exists; `subscribeToPreviewConsole` replays what it buffered and
  // dedupes against anything still arriving live.
  useEffect(() => {
    const frame = autoPreviewFrameRef.current;
    if (!frame || !showAutoPreview || !autoPreviewDoc) return;
    return subscribeToPreviewConsole({
      frame,
      token: autoPreviewToken,
      emit: (cell) =>
        setOutputs((prev) => {
          // Same stdout collapse the run path applies.
          const last = prev[prev.length - 1];
          if (cell.type === "stdout" && last && last.type === "stdout") {
            const merged: OutputCell = {
              ...last,
              content: `${last.content}\n${cell.content}`,
            };
            return [...prev.slice(0, -1), merged];
          }
          // Negative ids, distinguishable from a run's own (they count up
          // from 1).
          return [...prev, { id: -(prev.length + 1), elapsed: "", ...cell }];
        }),
    });
  }, [autoPreviewDoc, autoPreviewToken, showAutoPreview]);

  // Mirrored into a ref so the mount-once warm-up effect can prefetch
  // datasets without re-registering when MDX re-creates the prop array.
  const blockDatasets = datasets ?? NO_DATASETS;
  const datasetsRef = useRef(blockDatasets);
  useEffect(() => {
    datasetsRef.current = blockDatasets;
  }, [blockDatasets]);

  // Everything this block could execute, passed to `runtime.warmPackages`
  // so heavy optional packages only download for blocks whose code imports
  // them. A ref, so the warm-up observer doesn't re-register on prop
  // identity.
  const warmHintRef = useRef<{ sources: string[]; packages?: string[] }>({
    sources: [],
  });
  useEffect(() => {
    const sources: string[] = [];
    for (const file of files ?? []) {
      if (file.initCode) sources.push(file.initCode);
      sources.push(file.starterCode);
    }
    warmHintRef.current = { sources, packages };
  }, [files, packages]);

  // Per-file read-only init code (trimmed); the init drawer and the
  // editor's line-number offset both track the active tab's file.
  const initForFile = useCallback(
    (filename: string) => {
      const f = workspaceFiles.find((wf) => wf.filename === filename);
      return f?.initCode?.trimEnd() ?? "";
    },
    [workspaceFiles],
  );

  // Workspace fingerprint so editing the MDX retires saved attempts; the
  // filename is appended so each tab persists independently.
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
        "codeblock",
        `${adapter.id}|${workspaceFingerprint}|${filename}`,
      ),
    [adapter.id, workspaceFingerprint],
  );

  const persistActiveFile = useCallback(
    (filename: string, content: string) => {
      savePersistedCode(persistedKeyForFile(filename), content);
    },
    [persistedKeyForFile],
  );

  // Active filename + per-file buffer map; tab switches rewrite the doc.
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

  // SSR-safe (matches Playground) so the kbd hint matches hydration.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  const isDark = useIsDark();
  const cmThemeName = cmThemeNameFor(isDark);

  // ─── Editor mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;

    const themeComp = new Compartment();
    const languageComp = new Compartment();
    const lineNumberComp = new Compartment();

    // Line numbers continue after the active file's init code; a
    // reconfigure effect keeps the offset in sync on tab switches.
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
        // Indent width tracks the adapter's formatter so Tab matches Format.
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
        themeComp.of(themeFor(cmThemeNameFor(detectIsDark()))),
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
        // Debounce-persist the active file's buffer so reloads restore
        // in-progress code; the filename is read through the ref so the
        // mount-once listener stays correct after tab switches.
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const current = update.state.doc.toString();
          const activeName = activeFilenameRef.current;
          fileBuffersRef.current.set(activeName, current);
          if (persistSaveTimerRef.current !== null)
            window.clearTimeout(persistSaveTimerRef.current);
          persistSaveTimerRef.current = window.setTimeout(() => {
            persistSaveTimerRef.current = null;
            persistActiveFile(activeName, current);
          }, 400);
        }),
      ],
    });

    editorRef.current = view;
    themeCompRef.current = themeComp;
    lineNumberCompRef.current = lineNumberComp;
    languageCompRef.current = languageComp;

    // Lazy-load the language extension; the editor mounts immediately and
    // re-highlights once the module resolves.
    const initialMode =
      adapter.codeMirrorModeForFile?.(activeFilenameRef.current) ??
      adapter.codeMirrorMode;
    void loadLanguage(initialMode).then((ext) => {
      if (ext && editorRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });

    return () => {
      // Flush any pending debounced write before tearing down so the
      // last keystroke doesn't get lost on navigation away.
      if (persistSaveTimerRef.current !== null) {
        window.clearTimeout(persistSaveTimerRef.current);
        persistSaveTimerRef.current = null;
        const activeName = activeFilenameRef.current;
        persistActiveFile(activeName, view.state.doc.toString());
      }
      view.destroy();
      editorRef.current = null;
      themeCompRef.current = null;
      lineNumberCompRef.current = null;
      languageCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the CodeMirror theme whenever the docs color scheme flips.
  useEffect(() => {
    if (editorRef.current && themeCompRef.current) {
      editorRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(cmThemeName)),
      });
    }
    if (initEditorRef.current && initThemeCompRef.current) {
      initEditorRef.current.dispatch({
        effects: initThemeCompRef.current.reconfigure(themeFor(cmThemeName)),
      });
    }
  }, [cmThemeName]);

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

    const themeComp = new Compartment();
    const languageComp = new Compartment();

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
        themeComp.of(themeFor(cmThemeNameFor(detectIsDark()))),
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

  // ─── Multi-file tab switching ───────────────────────────────────────
  // Snapshot + persist the outgoing file's buffer, load the incoming one,
  // collapse the init drawer. Mirrors ChallengeCard.
  const previousActiveRef = useRef<string>(activeFilename);
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

  // Keep the gutter offset in sync with the active file's init line count.
  useEffect(() => {
    const view = editorRef.current;
    const comp = lineNumberCompRef.current;
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
    const comp = languageCompRef.current;
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

  // ─── Run / Reset / Format ──────────────────────────────────────────
  // Snapshot every file: the active file from the live editor (unsaved
  // edits propagate), the rest from the in-memory buffers Map.
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

  // Ask AI context: the block registers itself so the assistant can see the
  // code (with the user's live edits) and output of blocks on screen.
  useAskAiSource({
    kind: "code-block",
    label: `${adapter.runtimeInfo.language} code block: ${workspaceFiles
      .map((f) => f.filename)
      .join(", ")}`,
    elementRef: cardRef,
    getSnapshot: () => {
      const buffers = snapshotAllFiles();
      return {
        content: describeCodeBlock({
          files: workspaceFiles.map((f) => ({
            filename: f.filename,
            code: buffers.get(f.filename) ?? "",
            initCode: f.initCode,
          })),
          outputs: outputs
            .filter((c) => c.type === "stdout" || c.type === "stderr")
            .map((c) => c.content),
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

  const run = useCallback(async () => {
    const filesSnapshot = snapshotAllFiles();
    const entrySource = filesSnapshot.get(resolvedEntryFilename) ?? "";
    // Init is prepended verbatim and every adapter resets state at run()
    // start, so init executes in the same fresh scope as the user code.
    const code = effectiveSourceFor(resolvedEntryFilename, entrySource);
    const mySeq = ++runSeqRef.current;

    // Hand the preview slot back to the runtime before anything can await.
    // React owns the auto-rendered frame while the runtime owns the slot's
    // children imperatively; if React's removal lands after the runtime's
    // insertion it deletes the run's frame (or throws). `flushSync` is the
    // point, not an optimisation — a plain setState is a race.
    if (showAutoPreview && autoPreviewDoc) {
      flushSync(() => setShowAutoPreview(false));
    }

    // The reader is running it themselves now: drop the prepopulated cells
    // and the "preview" label.
    setOutputs([]);
    setShowingPreview(false);
    setBootCold(!isRuntimeReady(RuntimeScope.Fumadocs, adapter.id));
    setBootFraction(null);
    resetPrepare();
    setStatus("loading");
    setStatusMessage("Initialising runtime…");

    try {
      // Kick dataset downloads in parallel with the runtime boot. The no-op
      // catch keeps an early bail-out from surfacing an unhandled rejection;
      // awaiting the promise below still observes the real error.
      const datasetsPromise =
        blockDatasets.length > 0
          ? Promise.all(
              blockDatasets.map(async (spec) => ({
                filename: datasetStageFilename(spec),
                bytes: await fetchDatasetBytes(spec.path),
              })),
            )
          : null;
      datasetsPromise?.catch(() => {});

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
      if (runSeqRef.current !== mySeq) return;

      let datasetFiles: { filename: string; bytes: Uint8Array }[] = [];
      if (datasetsPromise) {
        if (!runtimeRef.current.prepareFileSystem) {
          throw new Error(
            `The ${adapter.runtimeInfo.language} runtime cannot stage dataset files (no virtual file system), remove the block's \`datasets\` prop.`,
          );
        }
        setStatusMessage("Downloading dataset files…");
        datasetFiles = await datasetsPromise;
        if (runSeqRef.current !== mySeq) return;
      }

      setStatus("running");
      setStatusMessage("Running…");

      // Stage remote datasets and (multi-file only) workspace files into
      // the runtime VFS so imports resolve. Single-file blocks without
      // datasets skip the call entirely (see ChallengeCard's `execute` for
      // why their source must not be pre-staged).
      if (
        (isMultiFile || datasetFiles.length > 0) &&
        runtimeRef.current.prepareFileSystem
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
                  ? code
                  : effectiveSourceFor(name, content),
              ),
            );
          }
        }
        try {
          await runtimeRef.current.prepareFileSystem(fileMap);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setOutputs((prev) => [
            ...prev,
            {
              id: prev.length + 1,
              type: "stderr",
              content: `Failed to stage workspace files: ${message}`,
              elapsed: "",
            },
          ]);
        }
      }

      let nextOutputId = 0;
      const startedAt = performance.now();
      try {
        await runtimeRef.current.run(
          code,
          (cell) => {
            if (runSeqRef.current !== mySeq) return;
            const elapsedMs = performance.now() - startedAt;
            const elapsed =
              elapsedMs < 1000
                ? `${elapsedMs.toFixed(0)}ms`
                : `${(elapsedMs / 1000).toFixed(2)}s`;
            setOutputs((prev) => {
              // Collapse consecutive stdout cells so one console.log per
              // cell doesn't stack a pile of one-line cells.
              const last = prev[prev.length - 1];
              if (
                cell.type === "stdout" &&
                last &&
                last.type === "stdout"
              ) {
                const merged: OutputCell = {
                  ...last,
                  content: last.content + "\n" + cell.content,
                  elapsed,
                };
                return [...prev.slice(0, -1), merged];
              }
              const fullCell: OutputCell = {
                id: ++nextOutputId,
                elapsed,
                ...cell,
              };
              return [...prev, fullCell];
            });
          },
          {
            entryFilename: isMultiFile ? resolvedEntryFilename : undefined,
            // Preview adapters render into the block-owned slot; each
            // run replaces the previous iframe (which is also the
            // teardown story for runaway scripts).
            previewHost: hasPreview ? previewHostRef.current : undefined,
            previewTailwind: hasPreview && tailwind ? true : undefined,
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
        // wave animation doesn't blink on sub-frame runs (throw path too).
        const wait = MIN_RUN_OVERLAY_MS - (performance.now() - startedAt);
        if (wait > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, wait));
        }
      }
      if (runSeqRef.current !== mySeq) return;
      setStatus("ready");
      setStatusMessage("Done");
    } catch (err) {
      if (runSeqRef.current !== mySeq) return;
      const message = err instanceof Error ? err.message : String(err);
      setOutputs((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          type: "stderr",
          content: message,
          elapsed: "",
        },
      ]);
      setStatus("error");
      setStatusMessage(message);
    }
  }, [
    adapter,
    autoPreviewDoc,
    blockDatasets,
    hasPreview,
    isMultiFile,
    resolvedEntryFilename,
    showAutoPreview,
    snapshotAllFiles,
    effectiveSourceFor,
    reportPrepare,
    resetPrepare,
    tailwind,
  ]);

  // Keep the mount-once keymap's closure current.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Pin this block's runtime while mounted so the per-scope LRU eviction
  // never tears it down under a block that could still Run against it.
  useEffect(
    () => retainRuntime(RuntimeScope.Fumadocs, adapter.id),
    [adapter.id],
  );

  // A block already showing its auto-rendered result has nothing to warm
  // for: speculatively fetching react's ~3 MB esbuild-wasm runtime for a
  // reader who may never press Run is the cost the precompiled bundle
  // exists to remove. Pressing Run still boots it on demand.
  const skipSpeculativeWarmup = autoPreviewDoc !== null;

  // Warm the shared runtime as soon as the page lands (idle-scheduled,
  // Save-Data-guarded, one boot at a time, see runtime/warmup.ts), so
  // the time a reader spends on the page's prose pays for the runtime
  // download instead of the first Run click.
  useEffect(() => {
    if (skipSpeculativeWarmup) return;
    warmRuntimeOnRouteLand(RuntimeScope.Fumadocs, adapter);
  }, [adapter, skipSpeculativeWarmup]);

  // Warm the shared runtime when the block first scrolls into view; the
  // fallback for Save-Data users (route-land warm-up skips them) and for
  // additional languages further down the page. Best-effort and deduped by
  // the registry; failures are swallowed so a real Run can retry.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || warmedRef.current || skipSpeculativeWarmup) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (warmedRef.current || !entries.some((e) => e.isIntersecting)) return;
        warmedRef.current = true;
        io.disconnect();
        void getSharedRuntime(RuntimeScope.Fumadocs, adapter)
          .then((rt) => {
            if (!runtimeRef.current) runtimeRef.current = rt;
            // Pre-install heavy optional packages only if this block's code
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
  }, [adapter, skipSpeculativeWarmup]);

  const reset = useCallback(() => {
    runSeqRef.current++;
    // Restore every buffer to its starter, wipe persisted copies, and push
    // the active file's starter into the editor.
    for (const f of workspaceFiles) {
      fileBuffersRef.current.set(f.filename, f.starterCode);
      clearPersistedCode(persistedKeyForFile(f.filename));
    }
    const view = editorRef.current;
    if (view) {
      const activeStarter =
        workspaceFiles.find((f) => f.filename === activeFilenameRef.current)
          ?.starterCode ?? "";
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: activeStarter },
      });
    }
    // The dispatch above re-fires the persist listener; cancel its
    // scheduled write AFTER dispatching so the localStorage entries stay
    // gone.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    // Reset restores the starter, so the prepopulated cells (exactly what
    // the starter prints) come back with it.
    setOutputs(seedOutputs());
    setShowingPreview(prepopulated !== null);
    // Tear down the live preview (removing the iframe kills its document
    // immediately); clearing the host before re-showing the auto-preview
    // keeps the two DOM owners from overlapping — the reverse of the Run
    // path's handover.
    previewHostRef.current?.replaceChildren();
    setShowAutoPreview(true);
    setStatus("idle");
    setStatusMessage("");
    startTransition(() => {
      toastManager.add({ title: "Reset to starter code." });
    });
  }, [
    workspaceFiles,
    persistedKeyForFile,
    toastManager,
    seedOutputs,
    prepopulated,
  ]);

  const MIN_FORMAT_MS = 300;
  const formatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    // Skip the spinner / round-trip entirely on empty buffers, same
    // short-circuit ChallengeCard's Format uses.
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
        startTransition(() => {
          toastManager.add({ title: "Already formatted, nothing to change." });
        });
      } else {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        startTransition(() => {
          toastManager.add({ title: "Code formatted." });
        });
      }
    } catch {
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      startTransition(() => {
        toastManager.add({
          title: "Couldn't format, code may have a syntax error.",
        });
      });
    } finally {
      setIsFormatting(false);
    }
  }, [adapter, toastManager]);

  // Copy the user-editable editor's contents (not the init block), with the
  // legacy `execCommand` fallback for contexts without the Clipboard API.
  const copyEditor = useCallback(async () => {
    const code = editorRef.current?.state.doc.toString() ?? "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      startTransition(() => {
        toastManager.add({ title: "Code copied to clipboard." });
      });
    } catch {
      // Clipboard failures are non-fatal (e.g. a denied permission), but
      // tell the user so the button doesn't appear to silently succeed.
      startTransition(() => {
        toastManager.add({
          title: "Couldn't copy, check clipboard permissions.",
        });
      });
    }
  }, [toastManager]);

  const isBusy = status === "loading" || status === "running";

  // Test-only capture seam for `scripts/capture-browser-outputs.mjs`, which
  // drives a real page with Playwright for browser-only languages and reads
  // the cells here rather than off the DOM (a plot cell's figure JSON is
  // already inside Plotly by the time it's markup). Nothing in production
  // creates this global.
  useEffect(() => {
    const sink = (window as unknown as { __blockCapture?: unknown[] })
      .__blockCapture;
    if (!sink || isBusy || outputs.length === 0 || showingPreview) return;
    sink.push({
      key: outputKey,
      adapter: adapter.id,
      cells: outputs.map((c) => ({
        type: c.type,
        content: c.content,
        ...(c.plot ? { plot: c.plot } : {}),
      })),
    });
  }, [outputs, isBusy, showingPreview, outputKey, adapter.id]);

  // Smoothed boot fraction for the wave progress bar (null → spinner only).
  const bootDisplayFraction = useCreepingBootFraction(
    bootFraction,
    status === "loading",
  );

  // Boot notice shows during a cold boot and during mid-run blocking waits
  // (which have no download/fraction, just the loader + message).
  const showBootNotice =
    status === "loading" || (status === "running" && midRunPreparing);

  // Header readouts. The last cell's elapsed is closest to the run's total;
  // only text is copyable (no base64 PNG / Plotly JSON blobs behind "Copy").
  const outputElapsed = outputs[outputs.length - 1]?.elapsed ?? "";
  const outputCopyText = outputs
    .filter((c) => c.type === "stdout" || c.type === "stderr")
    .map((c) => c.content)
    .join("\n");

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className={challengeStyles.cardShell}>
    <div
      ref={cardRef}
      className={`${challengeStyles.card} ${styles.outputScope}`}
      aria-label={`${adapter.runtimeInfo.language} executable code block`}
      data-testid="code-block"
      // Lets the e2e sweeps select only the blocks they can run instead of
      // re-running every Python block to reach the browser-only languages.
      data-adapter={adapter.id}
      data-expect-error={expectError ? "true" : undefined}
    >
      <div className={`${challengeStyles.header} ${challengeStyles.headerCompact}`}>
        <div className={challengeStyles.headerRow}>
          <div className={challengeStyles.badge}>
            <Play size={9} aria-hidden /> Code Block
          </div>
          <div className={challengeStyles.headerMeta}>
            <span className={challengeStyles.headerRuntimeLabel}>
              <LanguageGlyph adapter={adapter} />
              {adapter.runtimeInfo.language} {adapter.runtimeInfo.version}
            </span>
            <span
              className={challengeStyles.statusDot}
              data-status={status}
              title={statusMessage || status}
              aria-label={statusMessage || status}
            />
          </div>
        </div>
      </div>

      {/* ── File tab bar (multi-file, or single-file opt-in) ── */}
      {showTabs && (
        <div
          className={challengeStyles.fileTabBar}
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
                className={`${challengeStyles.fileTab} ${
                  isActive ? challengeStyles.fileTabActive : ""
                }`}
                onClick={() => setActiveFilename(f.filename)}
                title={
                  f.filename === resolvedEntryFilename
                    ? `${f.filename} (entry)`
                    : f.filename
                }
              >
                <File size={12} aria-hidden />
                {f.filename}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Init code (active file) ── */}
      {activeHasInit && (
        <div
          className={`${challengeStyles.initWrap}${
            showTabs ? "" : ` ${challengeStyles.topBorderLight}`
          }`}
        >
          {activeInitLineCount > 3 ? (
            <button
              type="button"
              className={challengeStyles.initToggle}
              aria-expanded={initExpanded}
              aria-controls={initPanelId}
              onClick={() => setInitExpanded((v) => !v)}
            >
              <span
                className={`${challengeStyles.initCaret} ${
                  initExpanded ? challengeStyles.initCaretOpen : ""
                }`}
                aria-hidden
              >
                ▶
              </span>
              <span className={challengeStyles.initLabel}>
                Initialization code ({adapter.runtimeInfo.language})
              </span>
              <span className={challengeStyles.initMeta}>
                {activeInitLineCount} line{activeInitLineCount === 1 ? "" : "s"} ·
                read-only
              </span>
            </button>
          ) : (
            // Short init isn't collapsible but still needs a label marking
            // it as read-only setup.
            <div className={challengeStyles.initHeaderStatic}>
              <Lock
                size={11}
                strokeWidth={2}
                aria-hidden
                className={challengeStyles.initLockIcon}
              />
              <span className={challengeStyles.initLabel}>
                Initialization code ({adapter.runtimeInfo.language})
              </span>
              <span className={challengeStyles.initMeta}>read-only</span>
            </div>
          )}
          <div
            className={`${challengeStyles.initEditorWrap} ${
              activeInitLineCount <= 3 || initExpanded
                ? challengeStyles.initEditorWrapOpen
                : challengeStyles.initEditorWrapCollapsed
            }`}
          >
            <div
              id={initPanelId}
              className={challengeStyles.initEditor}
              aria-label={`${adapter.runtimeInfo.language} initialization code (read-only)`}
              ref={initEditorHostRef}
            />
            {!initExpanded && activeInitLineCount > 3 && (
              <button
                type="button"
                className={challengeStyles.initFade}
                aria-label="Expand initialization code"
                title="Expand initialization code"
                onClick={() => setInitExpanded(true)}
              >
                <span className={challengeStyles.initFadeLabel}>
                  <ChevronDown size={13} strokeWidth={2} aria-hidden />
                  Click to expand
                </span>
              </button>
            )}
            {initExpanded && activeInitLineCount > 3 && (
              <button
                type="button"
                className={challengeStyles.initCollapseBtn}
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
        className={`${challengeStyles.editor}${
          !activeHasInit && !showTabs ? ` ${challengeStyles.topBorderLight}` : ""
        }`}
        ref={editorHostRef}
        aria-label={`${adapter.runtimeInfo.language} source code`}
      />

      <div
        className={challengeStyles.actionBar}
        role="toolbar"
        aria-label="Code block actions"
      >
        <div className={challengeStyles.btnGroupPrimary}>
          <button
            type="button"
            className={challengeStyles.runBtn}
            onClick={() => run()}
            disabled={isBusy}
            data-testid="codeblock-run"
            aria-label="Run code"
          >
            {isBusy ? (
              <svg
                viewBox="0 0 12 12"
                className={challengeStyles.runBtnSpinner}
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
            <span className={challengeStyles.runBtnLabel}>
              {status === "loading"
                ? "Loading…"
                : status === "running"
                  ? "Running…"
                  : "Run"}
            </span>
            {!isBusy && (
              <span
                className={challengeStyles.btnKbd}
                title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
              >
                <kbd className={challengeStyles.kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
                <span className={challengeStyles.kbdSep} aria-hidden>+</span>
                <kbd className={challengeStyles.kbd}>↵</kbd>
              </span>
            )}
          </button>
        </div>
        <div className={challengeStyles.btnGroupUtil}>
          {isBusy && statusMessage && (
            <span
              className={challengeStyles.actionBarStatus}
              data-status={status}
              title={statusMessage}
            >
              {statusMessage}
            </span>
          )}
          <button
            type="button"
            className={challengeStyles.utilBtn}
            onClick={reset}
            disabled={isBusy}
            title="Reset"
            aria-label="Reset"
          >
            <RotateCcw size={12} strokeWidth={2.4} aria-hidden />
            <span className={challengeStyles.utilBtnLabel}>Reset</span>
          </button>
          {adapter.formatCode && (
            <>
              <div className={challengeStyles.btnGroupUtilSep} aria-hidden />
              <button
                type="button"
                className={challengeStyles.utilBtn}
                onClick={() => void formatCode()}
                disabled={isBusy || isFormatting}
                title="Format code"
                aria-label="Format code"
              >
                {isFormatting ? (
                  <svg
                    viewBox="0 0 12 12"
                    className={challengeStyles.utilSpinner}
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
                  <FormatIcon />
                )}
                <span className={challengeStyles.utilBtnLabel}>Format</span>
              </button>
            </>
          )}
          <div className={challengeStyles.btnGroupUtilSep} aria-hidden />
          <button
            type="button"
            className={challengeStyles.copyBtn}
            title="Copy code"
            aria-label="Copy code"
            onClick={() => {
              void copyEditor();
            }}
          >
            <CopyIcon />
          </button>
        </div>
      </div>

      {hasPreview && (
        // Live page preview: always mounted so the slot exists before the
        // first run; the runtime swaps a sandboxed iframe in on every run.
        <div className={challengeStyles.previewPanel} data-testid="web-preview">
          <div className={challengeStyles.previewHeader}>
            <span className={challengeStyles.previewLabel}>Preview</span>
          </div>
          <div
            className={challengeStyles.previewSlot}
            style={previewStageStyle(previewHeight)}
            ref={previewHostRef}
          >
            {/* The auto-rendered starter, in the server's HTML so it paints
                with the page. React owns this frame until the first Run
                hands the slot to the runtime (see `run`). `srcDoc` so React
                escapes attributes; `loading="lazy"` so an unscrolled block
                costs nothing. */}
            {showAutoPreview && autoPreviewDoc && (
              <iframe
                ref={autoPreviewFrameRef}
                className={PREVIEW_IFRAME_CLASS}
                sandbox={PREVIEW_SANDBOX}
                title="Page preview"
                loading="lazy"
                srcDoc={autoPreviewDoc}
              />
            )}
          </div>
        </div>
      )}

      {(outputs.length > 0 || isBusy || reservesOutput) && (
        // Same output panel as the challenge card. `reservesOutput` keeps it
        // mounted from the server's HTML so the auto-preview's cells land in
        // a box that is already the right size.
        <div
          className={`${challengeStyles.outputPanel}${isBusy ? ` ${styles.outputRunning}` : ""}`}
          aria-live="polite"
        >
          {/* "Output" header hidden while the boot notice shows; it returns
              once user code actually runs. */}
          {!showBootNotice && (
            <div
              className={`${challengeStyles.outputHeader} ${challengeStyles.outputHeaderSpaced}`}
            >
              <div
                className={challengeStyles.accentBar}
                data-error={outputs.some((c) => c.type === "stderr")}
              />
              <span
                className={challengeStyles.outputLabel}
                data-error={outputs.some((c) => c.type === "stderr")}
              >
                {showingPreview ? "Output preview" : "Output"}
              </span>
              {/* Every prepopulated panel says "preview" (built at page
                  build time, may differ from a live run) — one label that is
                  always true beats a cleverer one that is sometimes wrong.
                  The popover carries the why. */}
              {showingPreview && (
                <Popover.Root>
                  <Popover.Trigger
                    className={styles.previewInfoBtn}
                    aria-label="About this output preview"
                  >
                    <Info size={12} strokeWidth={2.2} aria-hidden />
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      className={styles.previewInfoPositioner}
                    >
                      <Popover.Popup className={styles.previewInfoPopup}>
                        This output was produced by running the code above when
                        the page was built, so you can read the result without
                        running anything yourself. Press <strong>Run</strong> to
                        execute it in your browser, where you can edit the code
                        and watch the output change. Code that uses randomness
                        or the current time will print something different each
                        run.
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
              <span className={styles.outputHeaderRight}>
                {outputElapsed && (
                  <span className={challengeStyles.outputTime}>
                    {outputElapsed}
                  </span>
                )}
                {outputCopyText.length > 0 && (
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.outputCopyBtn}`}
                    title="Copy output to clipboard"
                    aria-label="Copy output to clipboard"
                    onClick={() =>
                      void copyToClipboard(outputCopyText).then((ok) => {
                        startTransition(() => {
                          toastManager.add({
                            title: ok
                              ? "Output copied to clipboard."
                              : "Couldn't copy, check clipboard permissions.",
                          });
                        });
                      })
                    }
                  >
                    <CopyIcon />
                  </button>
                )}
              </span>
            </div>
          )}
          {showBootNotice && (
            <div className={styles.bootNoticeWrap}>
              <RuntimeBootNotice
                language={adapter.runtimeInfo.language}
                statusMessage={midRunPreparing ? midRunMessage : statusMessage}
                cold={status === "loading" && bootCold}
                downloadMB={
                  status === "loading" ? adapter.coldDownloadMB : undefined
                }
                compiled={adapter.compiled}
                fraction={status === "loading" ? bootDisplayFraction : null}
                testId="codeblock-boot"
              />
            </div>
          )}
          {(outputs.length > 0 || reservesOutput) && (
            <div
              className={`${challengeStyles.outputBody}${
                reservesOutput ? ` ${styles.outputBodyReserved}` : ""
              }`}
            >
              {outputs.map((cell) => (
                <OutputSegment key={cell.id} cell={cell} />
              ))}
            </div>
          )}
          {/* Centered spinner instead of a "Running…" placeholder; suppressed
              while the boot notice carries its own loader. */}
          {isBusy && !showBootNotice && (
            <div className={challengeStyles.runSpinner} aria-hidden="true">
              <DiamondSpinner size={28} label="Running…" />
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

// Clipboard helper for the output-cell copy buttons; mirrors `copyEditor`'s
// fallback path. Resolves false on failure so the caller can surface it.
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * A prepopulated Plotly figure, fetched when it nears the viewport.
 * Deferring on visibility (not mount) keeps every chart on a lesson from
 * fetching at hydration; `PlotlyChart` then loads plotly.js itself, so a
 * chart the reader never reaches downloads nothing.
 */
function LazyPlotCell({ src }: { src: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [figure, setFigure] = useState<PlotlyFigure | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer (older browser, jsdom): fetch straight away.
      void fetch(src)
        .then((r) => r.json())
        .then(setFigure)
        .catch(() => {});
      return;
    }
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        void fetch(src)
          .then((r) => r.json())
          .then((fig) => {
            if (!cancelled) setFigure(fig as PlotlyFigure);
          })
          // A failed load leaves an empty slot.
          .catch(() => {});
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src]);

  return (
    <div
      ref={hostRef}
      className={challengeStyles.outCellPlot}
      data-cell-type="plot"
    >
      {figure ? <PlotlyChart figure={figure} /> : null}
    </div>
  );
}

function OutputSegment({ cell }: { cell: OutputCell }) {
  if (cell.type === "html") {
    // Same trust assumption as the playground: HTML cells come from code
    // the user typed in this very widget. `not-prose` keeps the docs'
    // prose typography from restyling the dataframe markup.
    return (
      <div
        className={`${challengeStyles.outCellHtml} not-prose`}
        data-cell-type="html"
        dangerouslySetInnerHTML={{ __html: cell.content }}
      />
    );
  }
  if (cell.type === "image") {
    // A run's own figure arrives as base64; a prepopulated one carries a
    // `src` and is fetched lazily.
    return (
      <div className={challengeStyles.outCellImage} data-cell-type="image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cell.src ?? `data:image/png;base64,${cell.content}`}
          alt="Chart generated by the code above"
          style={{ maxWidth: "100%" }}
          loading={cell.src ? "lazy" : undefined}
          decoding={cell.src ? "async" : undefined}
        />
      </div>
    );
  }
  if (cell.type === "plot") {
    // A run's own figure arrives parsed; a prepopulated one carries a `src`
    // and is fetched on scroll-in. Figure JSON is the heaviest thing these
    // panels hold, so it stays out of the page like the images do.
    if (cell.plot) {
      return (
        <div className={challengeStyles.outCellPlot} data-cell-type="plot">
          <PlotlyChart figure={cell.plot} />
        </div>
      );
    }
    if (cell.src) return <LazyPlotCell src={cell.src} />;
    return null;
  }
  return (
    <div
      className={
        cell.type === "stderr"
          ? challengeStyles.outCellStderr
          : challengeStyles.outCellStdout
      }
      data-cell-type={cell.type}
    >
      {cell.content}
    </div>
  );
}

