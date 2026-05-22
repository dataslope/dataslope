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
import { Box, RotateCcw } from "lucide-react";
import { Toast } from "@base-ui-components/react/toast";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "./languageIcons";
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
import { loadLanguage, themeFor } from "./cmExtensions";

import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PlotlyFigure,
} from "./types";
import { getSharedRuntime, RuntimeScope } from "./runtimeRegistry";
import {
  clearPersistedCode,
  loadPersistedCode,
  persistKey,
  savePersistedCode,
} from "./codePersistence";
import styles from "./CodeBlock.module.css";

type Status = "idle" | "loading" | "ready" | "running" | "error";

interface CodeBlockProps {
  /** Language adapter that describes the runtime to use. The same
   *  adapter instance can be passed to multiple `CodeBlock`s on the
   *  same page; they share one underlying runtime, but each block
   *  always executes against a freshly-reset state — variables defined
   *  in one block are never visible to another. */
  adapter: LanguageAdapter;
  /** Initial source the editor is populated with. The Reset button
   *  restores the editor to this value. */
  initialCode: string;
  /** Optional human-readable label shown in the header. Defaults to
   *  an auto-generated one like "PyBlock-49b7". */
  label?: string;
  /** Optional read-only initialization code prepended (verbatim) to the
   *  user-editable code on every Run. Rendered in a collapsed-by-default
   *  panel above the editor — handy for setting up imports or sample
   *  data without cluttering the snippet the learner is meant to focus
   *  on. The init code is not modifiable from the UI.
   *
   *  Caveat: the prepend is purely textual, so the init must be valid
   *  at the *top level* of the target language (e.g. `import` /
   *  `using` / `#include` directives, top-level statements, or — for
   *  languages without top-level statements like Java — a complete
   *  declaration that the user code can reference). Authors are
   *  responsible for syntactic compatibility; runtime errors caused by
   *  invalid init will surface as ordinary stderr cells. */
  initCode?: string;
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
// to pick up the wrong theme. Playgrounds use `data-pg-theme` instead.
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
// Light docs → IntelliJ IDEA, dark docs → Dracula.
function cmThemeNameFor(isDark: boolean): string {
  return isDark ? "dracula" : "idea";
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

// Solid Play triangle, sized to match the lucide `Play` icon used in the
// main playground's Run button.
function PlayIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
    </svg>
  );
}

// Brand-coloured glyph for the adapter's language. Uses the shared
// `languageIcons` registry so the playground header, the /playground
// index, and embedded code blocks all render the same icons + brand
// colours. Falls back to the adapter's two-character monogram so future
// adapters render reasonably without having to update the registry first.
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
  initialCode,
  label,
  initCode,
}: CodeBlockProps) {
  const blockId = useBlockId(adapter);
  const headerLabel = label ?? blockId;

  const toastManager = Toast.useToastManager();

  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const initEditorHostRef = useRef<HTMLDivElement | null>(null);
  const initEditorRef = useRef<EditorView | null>(null);
  const initThemeCompRef = useRef<Compartment | null>(null);
  const runtimeRef = useRef<LanguageRuntime | null>(null);
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
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [initExpanded, setInitExpanded] = useState(false);

  const initPanelId = `${blockId}-init`;
  const trimmedInit = initCode?.trimEnd() ?? "";
  const hasInit = trimmedInit.length > 0;
  const initLineCount = hasInit ? trimmedInit.split("\n").length : 0;

  // Stable localStorage key for the user's editor buffer. Hashing
  // `adapter.id + initialCode` means: same block across reloads → same
  // key (state restored); author edits `initialCode` in MDX → new key
  // (old buffer naturally retired, user sees the new starter).
  const persistedKey = useMemo(
    () => persistKey("codeblock", `${adapter.id}|${initialCode}`),
    [adapter.id, initialCode],
  );

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

    // When init code is present, the user-editable region's line numbers
    // continue from where the init block left off so the combined code
    // reads as a single contiguous program.
    const lineOffset = hasInit ? initLineCount : 0;

    // Restore the persisted buffer if one exists for this block. Fall
    // back to the MDX-provided starter when nothing is stored. This
    // runs inside the mount effect so SSR markup stays canonical and
    // the swap happens in the same paint as CodeMirror's initial draw.
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
        lineNumbersExt({
          formatNumber: lineOffset
            ? (n) => String(n + lineOffset)
            : undefined,
        }),
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
        themeComp.of(themeFor(cmThemeNameFor(detectIsDark()))),
        // Debounce-persist the editor buffer so reloads / navigation
        // restore the user's in-progress code. The 400ms delay coalesces
        // bursts of keystrokes into one localStorage write.
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
    themeCompRef.current = themeComp;

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
        savePersistedCode(persistedKey, view.state.doc.toString());
      }
      view.destroy();
      editorRef.current = null;
      themeCompRef.current = null;
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

  // Mount the read-only init editor lazily, the first time the panel is
  // expanded — keeps the cost zero for collapsed init blocks. The cleanup
  // mounts once when `hasInit` becomes true so the collapsed preview
  // can show the first few lines through the gradient fade. The
  // EditorView lives until the surrounding component unmounts.
  useEffect(() => {
    if (!hasInit) return;
    if (!initEditorHostRef.current || initEditorRef.current) return;

    const themeComp = new Compartment();
    const languageComp = new Compartment();

    const view = new EditorView({
      doc: trimmedInit,
      parent: initEditorHostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        EditorView.lineWrapping,
        languageComp.of([]),
        themeComp.of(themeFor(cmThemeNameFor(detectIsDark()))),
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

  // ─── Run / Reset ───────────────────────────────────────────────────────
  const run = useCallback(async () => {
    const userCode = editorRef.current?.state.doc.toString() ?? "";
    // Init code is prepended verbatim — every adapter resets state at the
    // start of run(), so init effectively executes inside the same fresh
    // scope as the user code. Authors are responsible for providing
    // syntactically-compatible init (e.g. top-level `using`/`#include`
    // for compiled languages).
    const code = hasInit ? `${trimmedInit}\n${userCode}` : userCode;
    const mySeq = ++runSeqRef.current;

    setOutputs([]);
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

      let nextOutputId = 0;
      const startedAt = performance.now();
      try {
        await runtimeRef.current.run(code, (cell) => {
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
        });
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
  }, [adapter, hasInit, trimmedInit]);

  // Keep the ref pointing at the latest handler so the editor's keymap
  // (registered once at mount) always invokes the current closure.
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const reset = useCallback(() => {
    runSeqRef.current++;
    const view = editorRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
    // The dispatch above re-fires the persist listener and schedules a
    // write of `initialCode`. Cancel it AFTER dispatching so the
    // localStorage entry stays gone instead of being recreated with
    // the starter contents.
    if (persistSaveTimerRef.current !== null) {
      window.clearTimeout(persistSaveTimerRef.current);
      persistSaveTimerRef.current = null;
    }
    clearPersistedCode(persistedKey);
    setOutputs([]);
    setStatus("idle");
    setStatusMessage("");
  }, [initialCode, persistedKey]);

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
      className={styles.codeBlock}
      data-cb-theme={isDark ? "dark" : "light"}
      aria-label={`${adapter.runtimeInfo.language} executable code block`}
    >
      <div className={styles.header}>
        <span className={styles.headerId}>
          <Box className={styles.headerIdIcon} aria-hidden />
          {headerLabel}
        </span>
        <span className={styles.headerLine} aria-hidden />
        <span className={styles.headerLang}>
          <LanguageGlyph adapter={adapter} />
          <span className={styles.headerLangText}>
            {adapter.runtimeInfo.language} {adapter.runtimeInfo.version}
          </span>
        </span>
        <span className={styles.headerSpacer} />
        <span
          className={styles.statusDot}
          data-status={status}
          title={statusMessage || status}
          aria-label={statusMessage || status}
        />
      </div>

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
          <div
            className={`${styles.initEditorWrap} ${
              initExpanded
                ? styles.initEditorWrapOpen
                : styles.initEditorWrapCollapsed
            }`}
          >
            <div
              id={initPanelId}
              className={styles.initEditor}
              aria-label={`${adapter.runtimeInfo.language} initialization code (read-only)`}
              ref={initEditorHostRef}
            />
            {!initExpanded && initLineCount > 3 && (
              <button
                type="button"
                className={styles.initFade}
                aria-label="Expand initialization code"
                title="Expand initialization code"
                onClick={() => setInitExpanded(true)}
              />
            )}
          </div>
        </div>
      )}

      <div
        className={styles.editor}
        ref={editorHostRef}
        aria-label={`${adapter.runtimeInfo.language} source code`}
      />

      <div
        className={styles.actionBar}
        role="toolbar"
        aria-label="Code block actions"
      >
        <div className={styles.btnGroupPrimary}>
          <button
            type="button"
            className={`${styles.runBtn}${isBusy ? ` ${styles.runBtnRunning}` : ""}`}
            onClick={() => run()}
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
          <button
            type="button"
            className={styles.iconBtn}
            title="Copy code to clipboard"
            aria-label="Copy code to clipboard"
            onClick={() => {
              void copyEditor();
            }}
          >
            <CopyIcon />
          </button>
          {statusMessage && (
            <>
              <div className={styles.btnGroupUtilSep} aria-hidden />
              <span className={styles.statusText} data-status={status}>
                {statusMessage}
              </span>
            </>
          )}
        </div>
      </div>

      {(outputs.length > 0 || isBusy) && (
        <div
          className={`${styles.output}${isBusy ? ` ${styles.outputRunning}` : ""}`}
          aria-live="polite"
        >
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
    <div className={wrapperClass}>
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

const PLOTLY_DARK_DEFAULTS = {
  paper_bgcolor: "#0f1117",
  plot_bgcolor: "#161b27",
  font: { color: "#e2e8f0", family: "Inter, system-ui, sans-serif" },
  xaxis: {
    gridcolor: "#2a3347",
    linecolor: "#2a3347",
    zerolinecolor: "#2a3347",
  },
  yaxis: {
    gridcolor: "#2a3347",
    linecolor: "#2a3347",
    zerolinecolor: "#2a3347",
  },
  margin: { l: 48, r: 24, t: 48, b: 48 },
};

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
      const layout = {
        ...PLOTLY_DARK_DEFAULTS,
        ...(figure.layout ?? {}),
      };
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
