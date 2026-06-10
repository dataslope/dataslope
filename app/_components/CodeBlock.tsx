"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronDown, ChevronUp, File, Lock, Play, RotateCcw } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
import { FormatIcon, PlayIcon } from "./challengeShared";
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

import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PlotlyFigure,
} from "./types";
import { getSharedRuntime, isRuntimeReady, RuntimeScope } from "./runtimeRegistry";
import { mergeInitAndEntry } from "./runtime/mergeInit";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import styles from "./CodeBlock.module.css";
import challengeStyles from "./ChallengeCard.module.css";

type Status = "idle" | "loading" | "ready" | "running" | "error";

/** One file in a multi-file `<CodeBlock>` workspace. Mirrors the
 *  `ChallengeFile` shape from `ChallengeCard` so authors can use the
 *  same mental model — the layout / styles are identical too. */
export interface CodeBlockFile {
  /** Workspace-relative filename, e.g. `"greeter.hpp"`. */
  filename: string;
  /** Optional read-only initialization code for THIS file, prepended
   *  verbatim to the file's code on every Run. Rendered in a
   *  collapsed-by-default read-only panel above the editor when this file
   *  is the active tab — handy for imports or sample data without
   *  cluttering the snippet the learner edits.
   *
   *  Caveat: the prepend is purely textual, so init must be valid at the
   *  *top level* of the target language (e.g. `import` / `using` /
   *  `#include` directives, top-level statements, or — for languages
   *  without top-level statements like Java — a complete declaration the
   *  user code can reference). */
  initCode?: string;
  /** Starter content shown in the editor for this file. Reset restores
   *  this exact text. */
  starterCode: string;
}

interface CodeBlockProps {
  /** Language adapter that describes the runtime to use. The same
   *  adapter instance can be passed to multiple `CodeBlock`s on the
   *  same page; they share one underlying runtime, but each block
   *  always executes against a freshly-reset state — variables defined
   *  in one block are never visible to another. */
  adapter: LanguageAdapter;
  /** Workspace files. Every block supplies at least one file; each file
   *  carries its own `initCode` (read-only setup prepended on Run) and
   *  `starterCode` (the editable starter). With more than one file — or
   *  with `showFileTabBar` — a non-sortable, non-closeable tab bar
   *  appears above the editor so the learner can switch between files.
   *  Code runs against `entryFilename` (or the first file when omitted);
   *  every other file is staged into the runtime's virtual file system
   *  via `prepareFileSystem` so multi-file `import`s / `include`s /
   *  cross-class references resolve. */
  files: CodeBlockFile[];
  /** When `files` has more than one entry, the filename whose content is
   *  passed to `runtime.run()` as the entry. Defaults to the first file. */
  entryFilename?: string;
  /** Optional human-readable label shown in the header. Defaults to
   *  an auto-generated one like "PyBlock-49b7". */
  label?: string;
  /** Force the file tab bar to render even for a single-file workspace.
   *  Multi-file workspaces always show it; this opts a one-file block in. */
  showFileTabBar?: boolean;
}

// Match the convention of the existing playground for shortcut hints.
function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPod/.test(platform) || /Macintosh/.test(ua);
}

// Detect the active colour scheme on `<html>`. Fumadocs uses next-themes
// with `attribute: "class"`, so light/dark is reflected as the `dark`
// class (or absence thereof) on the document root. We fall back to the
// OS-level preference in case the page is rendered outside fumadocs.
// Note: we intentionally do NOT read `data-theme` here because the
// playground sets that attribute for its own light/dark switching and
// it can transiently persist during SPA navigation (between playground
// unmount cleanup and learn page mount), causing CodeBlocks on /learn
// to pick up the wrong theme. Playgrounds use `data-playground-theme` instead.
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

// Subscribe to <html> class mutations so we can re-render when the user
// toggles the docs theme. Pairs with `useSyncExternalStore` to stay
// SSR-safe (snapshot defaults to `true` / dark on the server).
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

// Map the document's colour scheme to the matching CodeMirror theme name.
// Light docs → GitHub Light, dark docs → GitHub Dark.
function cmThemeNameFor(isDark: boolean): string {
  return isDark ? "github-dark" : "github-light";
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

// Small clipboard / "copy to clipboard" glyph reused by the action bar
// and the output-cell headers. Stroke-only so it inherits the current
// text colour and reads as part of the surrounding chrome.
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

// Glyph for the adapter's language. Uses the shared `languageIcons`
// registry so the embedded code blocks render the same icons as the
// rest of the app. The colour is intentionally NOT the brand colour
// here: code blocks share the challenge card's `.headerRuntimeLabel`
// chrome, so the glyph inherits that label's two-tone (light/dark)
// icon colour to stay visually consistent with the challenge cards.
// Falls back to the adapter's two-character monogram so future
// adapters render reasonably without having to update the registry first.
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

// Stable short id derived from React's useId so the SSR markup
// matches the client. We squash the colon-separated id down to a
// short hex-like suffix and prefix it with the adapter logo text
// (e.g. "PyBlock-49b7").
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

// ToastList renders all active toasts into the viewport.  It must be
// rendered inside a Toast.Provider context (supplied by the CodeBlock
// wrapper below) so that Toast.useToastManager() works.
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

// Minimum time (ms) the "running" overlay is held visible after a run
// completes. Mirrors the playground's MIN_ANIMATION_MS so a fast
// snippet (a few-line JS expression that finishes in 20ms) doesn't
// blink the wave animation in and back out within a single frame.
const MIN_RUN_OVERLAY_MS = 300;

// Sine-wave running overlay — anchored to the bottom of the code block
// and shorter (28 px) than the full playground variant (44 px).
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
        {/* Two overlapping smooth sine-curves animated horizontally.
            Each path is wider than the viewBox so it scrolls seamlessly. */}
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

// Public export — wraps the inner component with a Toast.Provider so
// that Toast.useToastManager() works inside CodeBlockInner.
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

function CodeBlockInner({
  adapter,
  files,
  entryFilename,
  showFileTabBar = false,
}: CodeBlockProps) {
  const blockId = useBlockId(adapter);

  const toastManager = Toast.useToastManager();

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  // Line-number compartment — reconfigured when the active file changes
  // so the gutter offset tracks that file's init line count.
  const lineNumberCompRef = useRef<Compartment | null>(null);
  const initEditorHostRef = useRef<HTMLDivElement | null>(null);
  const initEditorRef = useRef<EditorView | null>(null);
  const initThemeCompRef = useRef<Compartment | null>(null);
  const runtimeRef = useRef<LanguageRuntime | null>(null);
  // Outer card element — observed so the shared runtime can be warmed when
  // the block first scrolls into view (so the learner's first Run isn't a
  // cold download). `warmedRef` guards against re-warming on re-intersect.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const warmedRef = useRef(false);
  // Sequence number lets us drop output from a previous run if the
  // user clicks Run again while one is in flight.
  const runSeqRef = useRef(0);
  // Stable ref to the latest run() so the CodeMirror keymap closure
  // (created once at mount) always invokes the current handler.
  const runRef = useRef<() => void>(() => {});
  // Debounce handle for localStorage persistence (see editor mount).
  const persistSaveTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  // True while a *cold* runtime download is in flight (vs a warm runtime
  // already initialised), so the boot notice only promises "first run only"
  // when it really is the first run.
  const [bootCold, setBootCold] = useState(false);
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [initExpanded, setInitExpanded] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);

  const initPanelId = `${blockId}-init`;

  // ─── Multi-file workspace ───────────────────────────────────────────
  // Normalise into a non-empty list of files. Authors always pass
  // `files`; guard against an empty array so the rest of the component
  // can assume at least one file is present.
  const workspaceFiles: CodeBlockFile[] = useMemo(() => {
    if (files && files.length > 0) return files;
    const defaultName = `main.${adapter.defaultFileExtension || "txt"}`;
    return [{ filename: defaultName, starterCode: "" }];
  }, [files, adapter.defaultFileExtension]);
  const isMultiFile = workspaceFiles.length > 1;
  // The tab bar renders for multi-file workspaces, or when a single-file
  // block explicitly opts in via `showFileTabBar`.
  const showTabs = isMultiFile || showFileTabBar;
  const resolvedEntryFilename =
    (entryFilename && workspaceFiles.find((f) => f.filename === entryFilename)
      ? entryFilename
      : workspaceFiles[0].filename) ?? workspaceFiles[0].filename;

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

  // Per-file workspace fingerprint so editing the MDX retires saved
  // attempts against the previous starter. The filename is appended per
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

  // Active filename + per-file buffer map. The single editor view shows
  // the active file; swapping tabs rewrites the doc with the saved
  // buffer for the newly-active file.
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

  // Active file's init code (trimmed) + derived line metrics. Init now
  // belongs to a file, so the read-only init drawer and the editor's
  // line-number offset both re-render / reconfigure when the active tab
  // changes.
  const activeTrimmedInit = initForFile(activeFilename);
  const activeHasInit = activeTrimmedInit.length > 0;
  const activeInitLineCount = activeHasInit
    ? activeTrimmedInit.split("\n").length
    : 0;

  // Use the same SSR-safe pattern as Playground so the keyboard
  // shortcut hint matches what the freshly hydrated page would show.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );

  // Track the active docs colour scheme so the CodeMirror theme can flip
  // between IntelliJ IDEA (light) and Dracula (dark) when the user
  // toggles the docs theme.
  const isDark = useIsDark();
  const cmThemeName = cmThemeNameFor(isDark);

  // ─── Editor mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorHostRef.current || editorRef.current) return;

    const themeComp = new Compartment();
    const languageComp = new Compartment();
    const lineNumberComp = new Compartment();

    // When the active file has init code, the user-editable region's line
    // numbers continue from where that init left off so the combined code
    // reads as a single contiguous program. The reconfigure effect below
    // keeps the offset in sync as the active tab changes.
    const initial = initForFile(activeFilenameRef.current);
    const initialOffset = initial ? initial.split("\n").length : 0;

    // Initial doc = active file's buffer (already includes any restored
    // persisted content from the workspace bootstrap above).
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
        // Indent width tracks the adapter's formatter (see
        // LanguageAdapter.indentWidth) so Tab inserts what the
        // "Format code" button would produce.
        EditorState.tabSize.of(adapter.indentWidth),
        indentUnit.of(" ".repeat(adapter.indentWidth)),
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
        themeComp.of(themeFor(cmThemeNameFor(detectIsDark()))),
        noActiveLine,
        // Debounce-persist the *active* file's buffer so reloads /
        // navigation restore in-progress code. We always look up the
        // active filename through the ref so the listener — registered
        // once at mount — stays correct after tab switches.
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

    // Lazy-load the language extension so the editor mounts immediately
    // and re-highlights once the language module resolves.
    void loadLanguage(adapter.codeMirrorMode).then((ext) => {
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the CodeMirror theme whenever the docs colour scheme flips.
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

  // Mount / re-mount the read-only init editor for the active file's
  // init code. Init now belongs to a file, so switching tabs rebuilds
  // this editor with the new file's init (or tears it down when the
  // active file has none). We keep it mounted even while collapsed so
  // the collapsed preview can show the first few lines through the
  // gradient fade.
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
  // When the active tab changes, snapshot the outgoing file's buffer
  // (so unsaved edits aren't lost), persist it, load the incoming file's
  // saved buffer into the single editor view, and collapse the init
  // drawer for the newly-active file. Mirrors ChallengeCard's pattern.
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

  // Keep the editor's line-number gutter offset in sync with the active
  // file's init line count. Runs on mount (after the view exists) and on
  // every tab switch.
  useEffect(() => {
    const view = editorRef.current;
    const comp = lineNumberCompRef.current;
    if (!view || !comp) return;
    view.dispatch({
      effects: comp.reconfigure(lineNumbersWithOffset(activeInitLineCount)),
    });
  }, [activeInitLineCount]);

  // ─── Run / Reset / Format ──────────────────────────────────────────
  // Snapshot every file's current content. Reads the active file from
  // the live editor (so unsaved edits propagate) and the rest from the
  // in-memory buffers Map.
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

  const run = useCallback(async () => {
    const filesSnapshot = snapshotAllFiles();
    const entrySource = filesSnapshot.get(resolvedEntryFilename) ?? "";
    // Each file's init code is prepended verbatim to its buffer — every
    // adapter resets state at the start of run(), so init effectively
    // executes inside the same fresh scope as the user code. Authors are
    // responsible for providing syntactically-compatible init (e.g.
    // top-level `using`/`#include` for compiled languages).
    const code = effectiveSourceFor(resolvedEntryFilename, entrySource);
    const mySeq = ++runSeqRef.current;

    setOutputs([]);
    setBootCold(!isRuntimeReady(RuntimeScope.Fumadocs, adapter.id));
    setStatus("loading");
    setStatusMessage("Initialising runtime…");

    try {
      if (!runtimeRef.current) {
        runtimeRef.current = await getSharedRuntime(
          RuntimeScope.Fumadocs,
          adapter,
          (msg) => {
            if (runSeqRef.current === mySeq) setStatusMessage(msg);
          },
        );
      }
      if (runSeqRef.current !== mySeq) return;

      setStatus("running");
      setStatusMessage("Running…");

      // Multi-file workspaces: stage every file into the runtime VFS so
      // imports / #includes / cross-class references resolve. The entry
      // file's bytes mirror what we pass to `run()` below.
      if (isMultiFile && runtimeRef.current.prepareFileSystem) {
        const fileMap = new Map<string, Uint8Array>();
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
              // Collapse consecutive stdout cells into a single block
              // (matches the JS/TS/PHP playground behaviour where one
              // console.log per cell would otherwise produce a noisy
              // stack of one-line cells).
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
          isMultiFile ? { entryFilename: resolvedEntryFilename } : undefined,
        );
      } finally {
        // Hold the running overlay for at least MIN_RUN_OVERLAY_MS so
        // the wave animation doesn't blink in/out on sub-frame runs.
        // Covers the throw path too so error states get the same
        // minimum visible duration.
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
    isMultiFile,
    resolvedEntryFilename,
    snapshotAllFiles,
    effectiveSourceFor,
  ]);

  // Keep the ref pointing at the latest handler so the editor's keymap
  // (registered once at mount) always invokes the current closure.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Warm the shared runtime when the block first scrolls into view, so the
  // learner's first Run reuses an already-initialised runtime instead of
  // triggering a cold (~10 s for Pyodide) download on click. Best-effort:
  // the registry dedupes warm-ups across blocks of the same language, and
  // any failure here is swallowed so an actual Run can retry and report it.
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
            // Warm-up is best-effort; let a later Run retry and surface errors.
            warmedRef.current = false;
          });
      },
      { rootMargin: "200px" },
    );
    io.observe(card);
    return () => io.disconnect();
  }, [adapter]);

  const reset = useCallback(() => {
    runSeqRef.current++;
    // Restore every file's buffer to its starter and wipe persisted
    // copies. Then push the active file's starter into the editor so
    // the user sees the reset immediately.
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
    // The dispatch above re-fires the persist listener and schedules a
    // write of the starter contents. Cancel it AFTER dispatching so
    // the localStorage entries stay gone.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    setOutputs([]);
    setStatus("idle");
    setStatusMessage("");
    startTransition(() => {
      toastManager.add({ title: "Reset to starter code." });
    });
  }, [
    workspaceFiles,
    persistedKeyForFile,
    toastManager,
  ]);

  const MIN_FORMAT_MS = 300;
  const formatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    // Skip the spinner / round-trip entirely on empty buffers — same
    // short-circuit ChallengeCard's Format uses.
    if (!code.trim()) return;
    setIsFormatting(true);
    const startedAt = performance.now();
    try {
      const formatted = await adapter.formatCode(code);
      const wait = MIN_FORMAT_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
      if (formatted === code) {
        startTransition(() => {
          toastManager.add({ title: "Already formatted — nothing to change." });
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
          title: "Couldn't format — code may have a syntax error.",
        });
      });
    } finally {
      setIsFormatting(false);
    }
  }, [adapter, toastManager]);

  // Copy the current contents of the user-editable editor (not the init
  // block) to the clipboard. Mirrors the Playground's editor copy
  // affordance, including the legacy `execCommand` fallback for browsers
  // / contexts where the async Clipboard API is unavailable.
  // On success or failure, fires a toast identical to the playground's.
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
      // Clipboard failures are non-fatal — silently ignore so a missing
      // permission doesn't surface as a runtime error in the page.
    }
  }, [toastManager]);

  const isBusy = status === "loading" || status === "running";

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className={`${challengeStyles.card} ${styles.outputScope}`}
      aria-label={`${adapter.runtimeInfo.language} executable code block`}
      data-testid="code-block"
    >
      <div className={challengeStyles.header}>
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

      {/* ── File tab bar ──
            Shown for multi-file workspaces, or when a single-file block
            opts in via `showFileTabBar`. The init drawer (which now
            belongs to the active file) renders below it. */}
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

      {/* ── Init code (active file) ──
            The init drawer belongs to the active file and renders below
            the file tab bar. A light top border is added only when no
            file tab bar sits above it to supply the divider. */}
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
            // Short init code isn't collapsible, but it still needs a
            // label so the learner knows the first block is read-only
            // setup code rather than part of the editable snippet.
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

      {/* ── Editor ──
            Gets a light top border only when nothing above it (file tab
            bar or the active file's init drawer) already supplies a
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

      {(outputs.length > 0 || isBusy) && (
        <div
          className={`${styles.output}${isBusy ? ` ${styles.outputRunning}` : ""}`}
          aria-live="polite"
        >
          {status === "loading" && (
            <div className={styles.bootNotice} data-testid="codeblock-boot">

              <svg
                viewBox="0 0 24 24"
                className={styles.bootSpinner}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span className={styles.bootNoticeText}>
                <span className={styles.bootNoticeTitle}>
                  {statusMessage ||
                    `Setting up the ${adapter.runtimeInfo.language} runtime…`}
                </span>
                {bootCold && (
                  <span className={styles.bootNoticeHint}>
                    Downloading the {adapter.runtimeInfo.language} runtime — this
                    happens once; later runs are instant.
                  </span>
                )}
              </span>
            </div>
          )}
          {outputs.map((cell) => (
            <OutputCellView
              key={cell.id}
              cell={cell}
              onCopy={(content) => {
                void copyToClipboard(content);
              }}
            />
          ))}
          <RunOverlay active={isBusy} />
        </div>
      )}
    </div>
  );
}

// Shared clipboard helper used by the per-output-cell copy buttons.
// Mirrors the editor's `copyEditor` fallback path so both code paths
// behave identically across browsers.
async function copyToClipboard(text: string): Promise<void> {
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
    }
  } catch {
    // Non-fatal — see CodeBlock.copyEditor for rationale.
  }
}

// Cell-type → playground-style header label. Keeping these in sync with
// `Playground.tsx`'s `typeLabel` map ensures a code block's outputs read
// identically to the playground's outputs.
const CELL_TYPE_LABEL: Record<OutputCell["type"], string> = {
  stdout: "OUTPUT",
  stderr: "ERROR",
  html: "DATAFRAME",
  image: "FIGURE",
  plot: "CHART",
};

function OutputCellView({
  cell,
  onCopy,
}: {
  cell: OutputCell;
  onCopy: (content: string) => void;
}) {
  // Renders text (stdout/stderr), HTML (e.g. dataframes from Python/R),
  // base64 PNG images (e.g. matplotlib figures), and Plotly figures —
  // matching what the main playground supports so a code block dropped
  // into a learning page can show the same dynamic outputs as the
  // playground itself.
  const wrapperClass = (() => {
    switch (cell.type) {
      case "stderr":
        return `${styles.outCell} ${styles.outCellStderr}`;
      case "html":
        return `${styles.outCell} ${styles.outCellHtml}`;
      case "image":
        return `${styles.outCell} ${styles.outCellImage}`;
      case "plot":
        return `${styles.outCell} ${styles.outCellPlot}`;
      default:
        return `${styles.outCell} ${styles.outCellStdout}`;
    }
  })();
  const headerLabel = CELL_TYPE_LABEL[cell.type];
  // Only text-ish cells are sensibly copyable. Skipping image/plot
  // cells avoids exposing the raw base64 PNG / Plotly JSON blob behind
  // a misleading "Copy" affordance — same rule the playground uses.
  const isCopyable =
    cell.type === "stdout" || cell.type === "stderr" || cell.type === "html";

  return (
    <div className={wrapperClass} data-cell-type={cell.type}>
      <div className={styles.outCellHeader}>
        <span className={styles.outCellType}>{headerLabel}</span>
        {cell.elapsed && (
          <span className={styles.outCellTime}>{cell.elapsed}</span>
        )}
        {isCopyable && (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.outCellCopy}`}
            title="Copy output to clipboard"
            aria-label="Copy output to clipboard"
            onClick={() => onCopy(cell.content)}
          >
            <CopyIcon />
          </button>
        )}
      </div>
      <div className={styles.outCellBody}>
        {cell.type === "html" ? (
          // Same trust assumption as the main playground: HTML cells are
          // produced by the embedded runtime executing code the user
          // themselves typed in this very widget.
          <div
            className={styles.dataframeWrap}
            dangerouslySetInnerHTML={{ __html: cell.content }}
          />
        ) : cell.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${cell.content}`}
            alt=""
            style={{ maxWidth: "100%" }}
          />
        ) : cell.type === "plot" && cell.plot ? (
          <PlotlyChart figure={cell.plot} />
        ) : (
          cell.content
        )}
      </div>
    </div>
  );
}

/** Minimal Plotly surface used for chart cells. Mirrors `Playground`'s
 *  `PlotlyChart`/`PlotlyAPI` so both consumers render charts the same
 *  way; kept in sync by hand because extracting a shared module would
 *  require bumping `Playground.tsx`'s import surface for no behavioural
 *  benefit. */
interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}

const PLOTLY_MARGIN = { l: 48, r: 24, t: 48, b: 48 };

function PlotlyChart({ figure }: { figure: PlotlyFigure }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    void (async () => {
      // Plotly is heavy and only needed when a chart actually renders —
      // lazy-import the npm package on demand.
      const mod = await import("plotly.js-dist-min");
      if (cancelled || !ref.current) return;
      const Plotly = (mod.default ?? mod) as unknown as PlotlyAPI;
      // The Python runtime bakes the theme-appropriate template (plotly_dark in
      // dark mode, plotly in light mode) into figure.layout.template, so we only
      // set a default margin here and otherwise render the figure as-is.
      const layout = { margin: PLOTLY_MARGIN, ...(figure.layout ?? {}) };
      void Plotly.newPlot(el, figure.data, layout, {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d"],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [figure]);
  return <div ref={ref} style={{ width: "100%" }} />;
}
