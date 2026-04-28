"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  SiPython,
  SiR,
  SiJavascript,
  SiTypescript,
  SiPhp,
  SiC,
  SiCplusplus,
  SiOpenjdk,
  SiSharp,
} from "react-icons/si";
// CodeMirror core + the dracula theme — same default the main
// playground uses, so a code block embedded inside a learning page
// reads as "the playground, in miniature".
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/idea.css";

import type {
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PlotlyFigure,
} from "./types";
import type { CodeMirrorAPI, CodeMirrorEditor } from "./runtime/globals";
import { getSharedRuntime } from "./runtimeRegistry";
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

// Promise that resolves once CodeMirror v5 + the modes used by the
// supported language adapters have finished loading. Cached at module
// scope so a page with many code blocks pays the import cost once.
let cmLoadPromise: Promise<CodeMirrorAPI> | null = null;
function loadCodeMirror(): Promise<CodeMirrorAPI> {
  if (cmLoadPromise) return cmLoadPromise;
  cmLoadPromise = (async () => {
    const codeMirrorMod = await import("codemirror");
    await Promise.all([
      import("codemirror/mode/python/python"),
      import("codemirror/mode/r/r"),
      import("codemirror/mode/javascript/javascript"),
      import("codemirror/mode/xml/xml"),
      import("codemirror/mode/css/css"),
      import("codemirror/mode/clike/clike"),
      import("codemirror/mode/htmlmixed/htmlmixed"),
      import("codemirror/mode/php/php"),
      import("codemirror/addon/edit/closebrackets"),
      import("codemirror/addon/edit/matchbrackets"),
    ]);
    return (codeMirrorMod.default ??
      (codeMirrorMod as unknown)) as CodeMirrorAPI;
  })().catch((err) => {
    // Don't cache failure — a later mount can retry.
    cmLoadPromise = null;
    throw err;
  });
  return cmLoadPromise;
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
function detectIsDark(): boolean {
  if (typeof document === "undefined") return true;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  if (root.dataset.theme === "dark") return true;
  if (root.dataset.theme === "light") return false;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return true;
}

// Subscribe to <html> class / data-theme mutations so we can re-render
// when the user toggles the docs theme. Pairs with `useSyncExternalStore`
// to stay SSR-safe (snapshot defaults to `true` / dark on the server).
function useIsDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof document === "undefined") return () => {};
      const observer = new MutationObserver(notify);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"],
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
function cmThemeFor(isDark: boolean): string {
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

// Brand-coloured glyph for the adapter's language. Falls back to a
// neutral monogram so future adapters render reasonably without
// having to update this map first.
function LanguageGlyph({ adapter }: { adapter: LanguageAdapter }) {
  switch (adapter.id) {
    case "python":
      return <SiPython style={{ color: "#3776AB" }} aria-hidden />;
    case "r":
      return <SiR style={{ color: "#276DC3" }} aria-hidden />;
    case "javascript":
      return <SiJavascript style={{ color: "#E0B400" }} aria-hidden />;
    case "typescript":
      return <SiTypescript style={{ color: "#3178C6" }} aria-hidden />;
    case "php":
      return <SiPhp style={{ color: "#777BB4" }} aria-hidden />;
    case "c":
      return <SiC style={{ color: "#A8B9CC" }} aria-hidden />;
    case "cpp":
      return <SiCplusplus style={{ color: "#00599C" }} aria-hidden />;
    case "java":
      return <SiOpenjdk style={{ color: "#ED8B00" }} aria-hidden />;
    case "csharp":
      return <SiSharp style={{ color: "#9B4F96" }} aria-hidden />;
    default:
      return <span aria-hidden>{adapter.logoText}</span>;
  }
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

export default function CodeBlock({
  adapter,
  initialCode,
  label,
  initCode,
}: CodeBlockProps) {
  const blockId = useBlockId(adapter);
  const headerLabel = label ?? blockId;

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<CodeMirrorEditor | null>(null);
  const initTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const initEditorRef = useRef<CodeMirrorEditor | null>(null);
  const runtimeRef = useRef<LanguageRuntime | null>(null);
  // Sequence number lets us drop output from a previous run if the
  // user clicks Run again while one is in flight.
  const runSeqRef = useRef(0);
  // Stable ref to the latest run() so the CodeMirror keymap closure
  // (created once at mount) always invokes the current handler.
  const runRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const [initExpanded, setInitExpanded] = useState(false);

  const initPanelId = `${blockId}-init`;
  const trimmedInit = initCode?.trimEnd() ?? "";
  const hasInit = trimmedInit.length > 0;
  const initLineCount = hasInit ? trimmedInit.split("\n").length : 0;

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
  const cmTheme = cmThemeFor(isDark);

  // ─── Editor mount ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadCodeMirror()
      .then((CM) => {
        if (cancelled || !textareaRef.current || editorRef.current) return;
        const editor = CM.fromTextArea(textareaRef.current, {
          mode: adapter.codeMirrorMode,
          theme: cmThemeFor(detectIsDark()),
          lineNumbers: true,
          // When init code is present, the user-editable region's line
          // numbers continue from where the init block left off so the
          // combined code reads as a single contiguous program.
          firstLineNumber: hasInit ? initLineCount + 1 : 1,
          indentUnit: 2,
          tabSize: 2,
          indentWithTabs: false,
          autoCloseBrackets: true,
          matchBrackets: true,
          lineWrapping: true,
          extraKeys: {
            "Cmd-Enter": () => runRef.current(),
            "Ctrl-Enter": () => runRef.current(),
          },
        });
        editor.setValue(initialCode);
        editor.setSize("100%", "auto");
        editorRef.current = editor;
      })
      .catch((err) => {
        // Editor failed to load — fall back to the textarea so the
        // user can still see / edit the code.
        if (cancelled) return;
        setStatus("error");
        setStatusMessage(
          err instanceof Error ? err.message : "Failed to load editor",
        );
      });
    return () => {
      cancelled = true;
    };
    // We intentionally only mount the editor once per CodeBlock instance.
    // adapter / initialCode are captured by the ref-based callbacks below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync the CodeMirror theme whenever the docs colour scheme flips.
  useEffect(() => {
    editorRef.current?.setOption("theme", cmTheme);
    initEditorRef.current?.setOption("theme", cmTheme);
  }, [cmTheme]);

  // Mount the read-only init editor lazily, the first time the panel
  // is expanded — keeps the cost zero for collapsed init blocks.
  // The cleanup tears the editor down whenever the panel collapses (the
  // host `<div>` is unmounted by the conditional render in JSX, taking
  // the underlying textarea with it). Without resetting `initEditorRef`
  // here, a re-expand would keep the stale editor reference alive and
  // skip mounting a fresh CodeMirror instance, leaving only the bare
  // textarea fallback visible.
  useEffect(() => {
    if (!hasInit || !initExpanded) return;
    let cancelled = false;
    loadCodeMirror()
      .then((CM) => {
        if (cancelled || !initTextareaRef.current || initEditorRef.current) {
          return;
        }
        const editor = CM.fromTextArea(initTextareaRef.current, {
          mode: adapter.codeMirrorMode,
          theme: cmThemeFor(detectIsDark()),
          lineNumbers: true,
          indentUnit: 2,
          tabSize: 2,
          indentWithTabs: false,
          lineWrapping: true,
          // "nocursor" disables both editing AND focus, so the read-only
          // editor reads as a code listing rather than a disabled input.
          readOnly: "nocursor",
        });
        editor.setValue(trimmedInit);
        editor.setSize("100%", "auto");
        initEditorRef.current = editor;
      })
      .catch(() => {
        // Non-fatal: the textarea fallback will still display the code.
      });
    return () => {
      cancelled = true;
      // toTextArea restores the original textarea so React can safely
      // unmount it; clearing the ref ensures the next expand mounts a
      // fresh editor instead of bailing on the stale reference.
      initEditorRef.current?.toTextArea?.();
      initEditorRef.current = null;
    };
    // adapter.codeMirrorMode is stable per adapter; trimmedInit is stable
    // per render of this CodeBlock (init code never changes at runtime).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInit, initExpanded]);

  // ─── Run / Reset ───────────────────────────────────────────────────────
  const run = useCallback(async () => {
    const userCode =
      editorRef.current?.getValue() ?? textareaRef.current?.value ?? "";
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
        runtimeRef.current = await getSharedRuntime(adapter, (msg) => {
          if (runSeqRef.current === mySeq) setStatusMessage(msg);
        });
      }
      if (runSeqRef.current !== mySeq) return;

      setStatus("running");
      setStatusMessage("Running…");

      let nextOutputId = 0;
      const startedAt = performance.now();
      await runtimeRef.current.run(code, (cell) => {
        if (runSeqRef.current !== mySeq) return;
        const elapsedMs = performance.now() - startedAt;
        const elapsed =
          elapsedMs < 1000
            ? `${elapsedMs.toFixed(0)}ms`
            : `${(elapsedMs / 1000).toFixed(2)}s`;
        const fullCell: OutputCell = {
          id: ++nextOutputId,
          elapsed,
          ...cell,
        };
        setOutputs((prev) => [...prev, fullCell]);
      });
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
    editorRef.current?.setValue(initialCode);
    setOutputs([]);
    setStatus("idle");
    setStatusMessage("");
  }, [initialCode]);

  // Copy the current contents of the user-editable editor (not the init
  // block) to the clipboard. Mirrors the Playground's editor copy
  // affordance, including the legacy `execCommand` fallback for browsers
  // / contexts where the async Clipboard API is unavailable.
  const copyEditor = useCallback(async () => {
    const code =
      editorRef.current?.getValue() ?? textareaRef.current?.value ?? "";
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
    } catch {
      // Clipboard failures are non-fatal — silently ignore so a missing
      // permission doesn't surface as a runtime error in the page.
    }
  }, []);

  const isBusy = status === "loading" || status === "running";

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div
      className={styles.codeBlock}
      data-cb-theme={isDark ? "dark" : "light"}
      aria-label={`${adapter.runtimeInfo.language} executable code block`}
    >
      <div className={styles.header}>
        <span className={styles.headerId}># {headerLabel}</span>
        <span className={styles.headerLine} aria-hidden />
        <span className={styles.headerLang}>
          <LanguageGlyph adapter={adapter} />
          <span>
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
          {initExpanded && (
            <div
              id={initPanelId}
              className={styles.initEditor}
              aria-label={`${adapter.runtimeInfo.language} initialization code (read-only)`}
            >
              <textarea
                ref={initTextareaRef}
                defaultValue={trimmedInit}
                spellCheck={false}
                readOnly
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.editor}>
        <textarea
          ref={textareaRef}
          defaultValue={initialCode}
          spellCheck={false}
          aria-label={`${adapter.runtimeInfo.language} source code`}
        />
      </div>

      <div
        className={styles.actionBar}
        role="toolbar"
        aria-label="Code block actions"
      >
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
        </button>
        {!isBusy && (
          <span
            className={styles.kbdGroup}
            title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
          >
            <kbd className={styles.kbd}>{isMac ? "⌘" : "Ctrl"}</kbd>
            <span className={styles.kbdPlus} aria-hidden="true">
              +
            </span>
            <kbd className={styles.kbd}>Enter</kbd>
          </span>
        )}
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
        <button
          type="button"
          className={styles.resetBtn}
          onClick={reset}
          disabled={isBusy}
        >
          <span aria-hidden>↻</span>
          <span>Reset</span>
        </button>
        <span className={styles.actionBarSpacer} />
        {statusMessage && (
          <span className={styles.statusText} data-status={status}>
            {statusMessage}
          </span>
        )}
      </div>

      {outputs.length > 0 && (
        <div className={styles.output} aria-live="polite">
          {outputs.map((cell) => (
            <OutputCellView
              key={cell.id}
              cell={cell}
              onCopy={(content) => {
                void copyToClipboard(content);
              }}
            />
          ))}
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
