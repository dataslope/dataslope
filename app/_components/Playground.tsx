"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import "./playground.css";
// CodeMirror v5 stylesheets — these are pure CSS so importing them at the
// top of a "use client" component is safe (Next.js extracts them at build
// time and they don't touch `window`).
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/material-darker.css";
import "codemirror/theme/nord.css";
import "codemirror/theme/tomorrow-night-eighties.css";
import "codemirror/theme/solarized.css";
import "codemirror/theme/eclipse.css";
import "codemirror/theme/mdn-like.css";
import type {
  CodeMirrorAPI,
  CodeMirrorEditor,
} from "./runtime/globals";
import type {
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PackageInfo,
  PlotlyFigure,
} from "./types";

/** Minimal Plotly surface we use for rendering chart cells. */
interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}

type Mode = "light" | "dark" | "system";

const ALL_THEMES = [
  { value: "dracula", label: "Dracula" },
  { value: "monokai", label: "Monokai" },
  { value: "material-darker", label: "Material Darker" },
  { value: "nord", label: "Nord" },
  { value: "tomorrow-night-eighties", label: "Tomorrow Night" },
  { value: "solarized dark", label: "Solarized Dark" },
  { value: "solarized light", label: "Solarized Light" },
  { value: "eclipse", label: "Eclipse" },
  { value: "mdn-like", label: "MDN-like" },
];

const DARK_THEMES = new Set([
  "dracula",
  "monokai",
  "material-darker",
  "nord",
  "tomorrow-night-eighties",
  "solarized dark",
]);
const LIGHT_THEMES = new Set(["eclipse", "mdn-like", "solarized light"]);

interface ThemePalette {
  bg: string;
  bg2: string;
  bg3: string;
  border: string;
  text: string;
  dim: string;
  muted: string;
  kw: string;
  fn: string;
  arg: string;
  str: string;
}

const THEME_PREVIEWS: Record<string, ThemePalette> = {
  dracula: {
    bg: "#282a36", bg2: "#21222c", bg3: "#343746", border: "#44475a",
    text: "#f8f8f2", dim: "#6272a4", muted: "#bd93f9",
    kw: "#ff79c6", fn: "#50fa7b", arg: "#ffb86c", str: "#f1fa8c",
  },
  monokai: {
    bg: "#272822", bg2: "#1e1f1c", bg3: "#3e3d32", border: "#49483e",
    text: "#f8f8f2", dim: "#75715e", muted: "#ae81ff",
    kw: "#f92672", fn: "#a6e22e", arg: "#fd971f", str: "#e6db74",
  },
  "material-darker": {
    bg: "#212121", bg2: "#1a1a1a", bg3: "#2d2d2d", border: "#3d3d3d",
    text: "#eeffff", dim: "#546e7a", muted: "#82aaff",
    kw: "#c792ea", fn: "#82aaff", arg: "#ffcb6b", str: "#c3e88d",
  },
  nord: {
    bg: "#2e3440", bg2: "#272c36", bg3: "#3b4252", border: "#434c5e",
    text: "#d8dee9", dim: "#4c566a", muted: "#88c0d0",
    kw: "#81a1c1", fn: "#88c0d0", arg: "#d08770", str: "#a3be8c",
  },
  "tomorrow-night-eighties": {
    bg: "#2d2d2d", bg2: "#252525", bg3: "#393939", border: "#515151",
    text: "#cccccc", dim: "#777777", muted: "#cc99cc",
    kw: "#cc99cc", fn: "#6699cc", arg: "#f99157", str: "#99cc99",
  },
  "solarized dark": {
    bg: "#002b36", bg2: "#00212b", bg3: "#073642", border: "#094b5a",
    text: "#839496", dim: "#586e75", muted: "#657b83",
    kw: "#859900", fn: "#268bd2", arg: "#cb4b16", str: "#2aa198",
  },
  "solarized light": {
    bg: "#fdf6e3", bg2: "#eee8d5", bg3: "#f5efdc", border: "#ddd6c0",
    text: "#657b83", dim: "#93a1a1", muted: "#586e75",
    kw: "#859900", fn: "#268bd2", arg: "#cb4b16", str: "#2aa198",
  },
  eclipse: {
    bg: "#ffffff", bg2: "#f5f5f5", bg3: "#ebebeb", border: "#d8d8d8",
    text: "#1a1a1a", dim: "#aaaaaa", muted: "#555555",
    kw: "#7f0055", fn: "#0000c0", arg: "#6a3e3e", str: "#2a00ff",
  },
  "mdn-like": {
    bg: "#ffffff", bg2: "#f9f9fb", bg3: "#f0f0f4", border: "#dcdce0",
    text: "#333333", dim: "#aaaaaa", muted: "#666666",
    kw: "#a71d5d", fn: "#005cc5", arg: "#e36209", str: "#032f62",
  },
};

const SAMPLE_FN_NAME: Record<string, string> = {
  python: "greet",
  r: "greet",
};

function applyThemePalette(theme: string): void {
  const p = THEME_PREVIEWS[theme] ?? THEME_PREVIEWS.dracula;
  const root = document.documentElement;
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--bg2", p.bg2);
  root.style.setProperty("--bg3", p.bg3);
  root.style.setProperty("--border", p.border);
  root.style.setProperty("--text", p.text);
  root.style.setProperty("--text-dim", p.dim);
  root.style.setProperty("--text-muted", p.muted);
}

function applyMode(mode: Mode): void {
  const resolved =
    mode === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : mode;
  document.documentElement.setAttribute("data-theme", resolved);
}

// Plotly dark layout defaults applied to every chart when the user doesn't
// override them.
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
      // Plotly is heavy and only needed when a chart actually renders, so
      // we lazy-load the npm package on demand.
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
  return <div ref={ref} className="plotly-chart" />;
}

interface PackagesDrawerProps {
  open: boolean;
  packages: PackageInfo[];
  importSnippet: (name: string) => string;
  footer: ReactNode;
  onClose: () => void;
}

function PackagesDrawer({
  open,
  packages,
  importSnippet,
  footer,
  onClose,
}: PackagesDrawerProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // The drawer fully unmounts when closed (see `if (!open) return null`
  // below), so internal state naturally resets — no effect needed to clear it.

  const filtered = useMemo(() => {
    const lq = query.toLowerCase();
    return packages.filter(
      (p) =>
        p.name.includes(lq) ||
        p.desc.toLowerCase().includes(lq) ||
        p.cat.toLowerCase().includes(lq),
    );
  }, [packages, query]);

  const byCategory = useMemo(() => {
    const grouped: Record<string, PackageInfo[]> = {};
    for (const p of filtered) {
      (grouped[p.cat] ??= []).push(p);
    }
    return grouped;
  }, [filtered]);

  if (!open) return null;

  const handleCopy = (name: string) => {
    void navigator.clipboard
      .writeText(importSnippet(name))
      .catch(() => undefined);
    setCopied(name);
    window.setTimeout(() => setCopied((c) => (c === name ? null : c)), 1500);
  };

  return (
    <div
      className="pkg-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pkg-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pkg-drawer-header">
          <div className="pkg-drawer-title">
            Available Packages
            <span className="pkg-count-badge">{filtered.length}</span>
          </div>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close packages"
          >
            ✕
          </button>
        </div>
        <div className="pkg-search-wrap">
          <span className="pkg-search-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            className="pkg-search"
            type="text"
            placeholder="Search packages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="pkg-body">
          {filtered.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: 13,
              }}
            >
              No packages match your search.
            </div>
          )}
          {Object.entries(byCategory).map(([cat, pkgs]) => (
            <div key={cat}>
              <div className="pkg-category-label">{cat}</div>
              {pkgs.map((p) => (
                <div className="pkg-item" key={p.name}>
                  <div
                    className="pkg-icon"
                    style={{ background: `${p.color}22` }}
                  >
                    {p.icon}
                  </div>
                  <div className="pkg-info">
                    <div className="pkg-name">
                      {p.name}{" "}
                      <span className="pkg-version">v{p.ver}</span>
                    </div>
                    <div className="pkg-desc">{p.desc}</div>
                  </div>
                  <button
                    type="button"
                    className={`pkg-copy-btn${copied === p.name ? " copied" : ""}`}
                    onClick={() => handleCopy(p.name)}
                  >
                    {copied === p.name ? "✓ copied" : "import"}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="pkg-footer">{footer}</div>
      </div>
    </div>
  );
}

interface ExamplesDropdownProps {
  open: boolean;
  examples: ExampleSnippet[];
  onPick: (example: ExampleSnippet) => void;
}

function ExamplesDropdown({ open, examples, onPick }: ExamplesDropdownProps) {
  if (!open) return null;
  return (
    <div className="examples-dropdown">
      {examples.map((ex) => (
        <div
          key={ex.key}
          className="example-item"
          onClick={() => onPick(ex)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter") onPick(ex);
          }}
        >
          <div className="ex-title">{ex.title}</div>
          <div className="ex-desc">{ex.desc}</div>
        </div>
      ))}
    </div>
  );
}

interface SettingsPanelProps {
  mode: Mode;
  setMode: (m: Mode) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  outputFontSizeEnabled: boolean;
  setOutputFontSizeEnabled: (b: boolean) => void;
  outputFontSize: number;
  setOutputFontSize: (n: number) => void;
  editorTheme: string;
  setEditorTheme: (t: string) => void;
  language: string; // e.g. "python" / "r" — used only for the preview snippet
  onClose: () => void;
}

function SettingsPanel({
  mode,
  setMode,
  fontSize,
  setFontSize,
  outputFontSizeEnabled,
  setOutputFontSizeEnabled,
  outputFontSize,
  setOutputFontSize,
  editorTheme,
  setEditorTheme,
  language,
  onClose,
}: SettingsPanelProps) {
  const palette = THEME_PREVIEWS[editorTheme] ?? THEME_PREVIEWS.dracula;
  const fnName = SAMPLE_FN_NAME[language] ?? "greet";

  return (
    <div
      className="settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button
            type="button"
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <div className="settings-body">
          <div className="setting-row">
            <div className="setting-label">Appearance</div>
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn${mode === "light" ? " active" : ""}`}
                onClick={() => setMode("light")}
              >
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
                Light
              </button>
              <button
                type="button"
                className={`mode-btn${mode === "dark" ? " active" : ""}`}
                onClick={() => setMode("dark")}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Dark
              </button>
              <button
                type="button"
                className={`mode-btn${mode === "system" ? " active" : ""}`}
                onClick={() => setMode("system")}
              >
                <svg viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                System
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">Editor Font Size</div>
            <div className="font-size-row">
              <input
                type="range"
                className="fs-slider"
                min={10}
                max={22}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="font-size-val">{fontSize}px</span>
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-checkbox-row">
              <input
                type="checkbox"
                checked={outputFontSizeEnabled}
                onChange={(e) => setOutputFontSizeEnabled(e.target.checked)}
              />
              <span>Use Different Font Size for Outputs</span>
            </label>
            <div
              className={`font-size-row${outputFontSizeEnabled ? "" : " disabled"}`}
            >
              <input
                type="range"
                className="fs-slider"
                min={10}
                max={22}
                step={1}
                value={outputFontSize}
                onChange={(e) => setOutputFontSize(Number(e.target.value))}
                disabled={!outputFontSizeEnabled}
                aria-label="Output font size"
              />
              <span className="font-size-val">{outputFontSize}px</span>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">Editor Theme</div>
            <div className="theme-select-wrap">
              <select
                className="theme-select"
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
              >
                {ALL_THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className="theme-select-arrow">
                <svg viewBox="0 0 12 12">
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </span>
            </div>
            <div
              className="theme-preview"
              style={{ background: palette.bg, color: palette.text }}
            >
              <span style={{ color: palette.kw }}>
                {language === "r" ? fnName : "def"}
              </span>{" "}
              {language === "r" ? (
                <>
                  <span style={{ color: palette.kw }}>&lt;-</span>{" "}
                  <span style={{ color: palette.fn }}>function</span>(
                  <span style={{ color: palette.arg }}>name</span>) {"{"}
                </>
              ) : (
                <>
                  <span style={{ color: palette.fn }}>{fnName}</span>(
                  <span style={{ color: palette.arg }}>name</span>):
                </>
              )}
              {"\n  "}
              {language === "r" ? (
                <>
                  <span style={{ color: palette.fn }}>paste0</span>(
                  <span style={{ color: palette.str }}>
                    {`"Hello, "`}
                  </span>
                  , name,{" "}
                  <span style={{ color: palette.str }}>{`"!"`}</span>)
                  {"\n}"}
                </>
              ) : (
                <>
                  <span style={{ color: palette.kw }}>return</span>{" "}
                  <span style={{ color: palette.str }}>
                    {`f"Hello, {name}!"`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface PlaygroundProps {
  adapter: LanguageAdapter;
}

export default function Playground({ adapter }: PlaygroundProps) {
  // ─── Initial settings (persisted in localStorage, namespaced per-language) ─
  const storageKey = (k: string) => `pg_${adapter.id}_${k}`;
  const [mode, setModeState] = useState<Mode>("system");
  const [fontSize, setFontSizeState] = useState<number>(13);
  const [outputFontSizeEnabled, setOutputFontSizeEnabledState] =
    useState<boolean>(false);
  const [outputFontSize, setOutputFontSizeState] = useState<number>(13);
  const [editorTheme, setEditorThemeState] = useState<string>("dracula");

  // ─── UI state ───────────────────────────────────────────────────────────
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ─── Runtime state ──────────────────────────────────────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Initializing runtime…",
  );
  const [loaded, setLoaded] = useState(false);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [statusText, setStatusText] = useState("Loading…");
  const [outputs, setOutputs] = useState<OutputCell[]>([]);
  const outputCounter = useRef(0);
  const runtimeRef = useRef<LanguageRuntime | null>(null);

  // ─── CodeMirror ─────────────────────────────────────────────────────────
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<CodeMirrorEditor | null>(null);
  const outputBodyRef = useRef<HTMLDivElement | null>(null);

  // Latest run handler in a ref so the editor's keymap can call into it
  // without being re-bound on every render.
  const runRef = useRef<() => void>(() => undefined);

  const scrollOutputToBottom = useCallback(() => {
    const el = outputBodyRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Hydrate persisted settings + apply to <html data-theme> on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = adapter.documentTitle;
    document.body.classList.add("pg-active");

    const savedMode = (localStorage.getItem(storageKey("mode")) as Mode | null) ?? "system";
    const savedSize = Number(localStorage.getItem(storageKey("fontsize")) ?? 13) || 13;
    const savedTheme = localStorage.getItem(storageKey("editortheme")) ?? "dracula";
    const savedOutputEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(localStorage.getItem(storageKey("outputfontsize")) ?? savedSize) ||
      savedSize;

    /* Hydrate persisted settings from localStorage. We can't use lazy
       useState initialisers because that would cause a hydration mismatch
       between SSR (no `window`) and CSR. */
    /* eslint-disable react-hooks/set-state-in-effect */
    setModeState(savedMode);
    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(savedOutputEnabled);
    setOutputFontSizeState(savedOutputSize);
    setEditorThemeState(savedTheme);
    /* eslint-enable react-hooks/set-state-in-effect */
    applyMode(savedMode);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${savedOutputEnabled ? savedOutputSize : savedSize}px`,
    );

    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const onSysChange = () => {
      if ((localStorage.getItem(storageKey("mode")) ?? "system") === "system") {
        applyMode("system");
      }
    };
    mql.addEventListener("change", onSysChange);
    return () => {
      mql.removeEventListener("change", onSysChange);
      document.body.classList.remove("pg-active");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id]);

  // Boot scripts + runtime.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dynamically import CodeMirror v5 and its modes/addons/keymap.
        // These touch `window` at import time, so we can't import them
        // statically in a "use client" file (Next.js still SSRs the
        // module on the server during the initial render pass).
        const codeMirrorMod = await import("codemirror");
        await Promise.all([
          import("codemirror/mode/python/python"),
          import("codemirror/mode/r/r"),
          import("codemirror/addon/edit/closebrackets"),
          import("codemirror/addon/edit/matchbrackets"),
          import("codemirror/addon/comment/comment"),
          import("codemirror/keymap/sublime"),
        ]);
        if (cancelled) return;

        // Initialise CodeMirror once the script is on the page.
        const CM = (codeMirrorMod.default ?? codeMirrorMod) as unknown as CodeMirrorAPI;
        if (textareaRef.current && !editorRef.current) {
          const editor = CM.fromTextArea(textareaRef.current, {
            mode: adapter.codeMirrorMode,
            theme: editorTheme,
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            keyMap: "sublime",
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: false,
            extraKeys: {
              "Cmd-Enter": () => runRef.current(),
              "Ctrl-Enter": () => runRef.current(),
            },
          });
          editor.setValue(adapter.examples[0]?.code ?? "");
          editor.setSize("100%", "100%");
          editorRef.current = editor;
        }

        const rt = await adapter.init((m) => {
          if (!cancelled) setLoadingMessage(m);
        });
        if (cancelled) return;
        runtimeRef.current = rt;
        setLoaded(true);
        setStatusState("ready");
        setStatusText(adapter.readyStatus);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMessage(`Failed to load: ${msg}`);
        setStatusState("error");
        setStatusText("Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // editorTheme is intentionally only consumed for the *initial* CM theme;
    // subsequent changes are pushed via setOption in another effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // Push editor-theme changes into CodeMirror after init.
  useEffect(() => {
    editorRef.current?.setOption("theme", editorTheme);
    applyThemePalette(editorTheme);
  }, [editorTheme]);

  // Update the editor font size via CSS variable. This is what makes the
  // slider actually take effect — previously the inline-style approach was
  // overridden by `.CodeMirror { font-size: 13.5px !important }`.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.refresh();
  }, [fontSize]);

  // Apply the output font size: when the toggle is off we mirror the editor
  // font size so the output cells stay visually consistent.
  useEffect(() => {
    const effective = outputFontSizeEnabled ? outputFontSize : fontSize;
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${effective}px`,
    );
  }, [outputFontSizeEnabled, outputFontSize, fontSize]);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  // Auto-pick a sensible editor theme when the user toggles light/dark mode.
  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m);
      localStorage.setItem(storageKey("mode"), m);
      if (m === "light" && DARK_THEMES.has(editorTheme)) {
        setEditorThemeState("eclipse");
        localStorage.setItem(storageKey("editortheme"), "eclipse");
      } else if (m === "dark" && LIGHT_THEMES.has(editorTheme)) {
        setEditorThemeState("dracula");
        localStorage.setItem(storageKey("editortheme"), "dracula");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editorTheme, adapter.id],
  );

  const setFontSize = useCallback(
    (n: number) => {
      setFontSizeState(n);
      localStorage.setItem(storageKey("fontsize"), String(n));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter.id],
  );

  const setOutputFontSizeEnabled = useCallback(
    (b: boolean) => {
      setOutputFontSizeEnabledState(b);
      localStorage.setItem(storageKey("outputfontsize_enabled"), String(b));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter.id],
  );

  const setOutputFontSize = useCallback(
    (n: number) => {
      setOutputFontSizeState(n);
      localStorage.setItem(storageKey("outputfontsize"), String(n));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter.id],
  );

  const setEditorTheme = useCallback(
    (t: string) => {
      setEditorThemeState(t);
      localStorage.setItem(storageKey("editortheme"), t);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter.id],
  );

  // ─── Actions ────────────────────────────────────────────────────────────
  const runCode = useCallback(async () => {
    const editor = editorRef.current;
    const rt = runtimeRef.current;
    if (!editor || !rt) return;
    const code = editor.getValue().trim();
    if (!code) return;

    setStatusState("running");
    setStatusText("Running…");

    const t0 = performance.now();
    const collected: Omit<OutputCell, "id" | "elapsed">[] = [];
    try {
      await rt.run(code, (cell) => collected.push(cell));
      const elapsed = `${((performance.now() - t0) / 1000).toFixed(2)}s`;
      setOutputs((prev) => [
        ...prev,
        ...collected.map((c) => ({
          ...c,
          id: ++outputCounter.current,
          elapsed,
        })),
      ]);
      setStatusState("ready");
      setStatusText(`Done in ${elapsed}`);
    } catch (err) {
      const elapsed = `${((performance.now() - t0) / 1000).toFixed(2)}s`;
      const msg = err instanceof Error ? err.message : String(err);
      setOutputs((prev) => [
        ...prev,
        ...collected.map((c) => ({
          ...c,
          id: ++outputCounter.current,
          elapsed,
        })),
        {
          id: ++outputCounter.current,
          type: "stderr" as const,
          content: msg,
          elapsed,
        },
      ]);
      setStatusState("error");
      setStatusText("Error");
      window.setTimeout(() => {
        setStatusState("ready");
        setStatusText(adapter.readyStatus);
      }, 3000);
    }
  }, [adapter.readyStatus]);

  // Keep a fresh closure available for the CodeMirror keymap.
  useEffect(() => {
    runRef.current = () => {
      void runCode();
    };
  }, [runCode]);

  const clearOutput = useCallback(() => {
    setOutputs([]);
    outputCounter.current = 0;
    if (loaded) {
      setStatusState("ready");
      setStatusText(adapter.readyStatus);
    }
  }, [adapter.readyStatus, loaded]);

  const loadExample = useCallback((ex: ExampleSnippet) => {
    editorRef.current?.setValue(ex.code);
    setExamplesOpen(false);
    editorRef.current?.focus();
  }, []);

  // Auto-scroll output on new cells.
  useEffect(() => {
    scrollOutputToBottom();
  }, [outputs, scrollOutputToBottom]);

  // ─── Resizer ────────────────────────────────────────────────────────────
  const panesRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const editorPane = editorPaneRef.current;
    if (!resizer || !panes || !editorPane) return;
    let dragging = false;
    let startX = 0;
    let startFrac = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      startFrac = editorPane.offsetWidth / panes.offsetWidth;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const frac = Math.min(
        0.8,
        Math.max(0.2, startFrac + (e.clientX - startX) / panes.offsetWidth),
      );
      panes.style.gridTemplateColumns = `${frac * 100}% 1fr`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Close examples dropdown when clicking outside.
  useEffect(() => {
    if (!examplesOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target?.closest(".examples-dropdown") &&
        !target?.closest("[data-examples-trigger]")
      ) {
        setExamplesOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [examplesOpen]);

  const typeLabel: Record<OutputCell["type"], string> = {
    stdout: "OUTPUT",
    stderr: "ERROR",
    html: "DATAFRAME",
    image: "FIGURE",
    plot: "CHART",
  };

  return (
    <div className="pg-root">
      {!loaded && (
        <div
          className={`pyodide-loading${statusState === "error" ? "" : ""}`}
        >
          <div className="loading-logo">{adapter.logoText}</div>
          <div className="loading-bar-wrap">
            <div className="loading-bar" />
          </div>
          <div className="loading-msg">{loadingMessage}</div>
        </div>
      )}

      <div className="pg-app">
        <header className="pg-header">
          <div className="logo">
            <div className="logo-icon">{adapter.logoText}</div>
            {adapter.displayName}
          </div>
          <div className="header-sep" />

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="examples-btn"
              data-examples-trigger
              onClick={() => setExamplesOpen((v) => !v)}
            >
              <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                <path d="M2 2h12v2H2zm0 4h8v2H2zm0 4h10v2H2z" />
              </svg>
              Examples
            </button>
            <ExamplesDropdown
              open={examplesOpen}
              examples={adapter.examples}
              onPick={loadExample}
            />
          </div>

          <button
            type="button"
            className="examples-btn"
            onClick={() => setPackagesOpen(true)}
            title="Available Packages"
          >
            <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
              <path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.8l4.5 2.2L8 7.2 3.5 5 8 2.8zM2 6.1l5 2.5v5.3L2 11.4V6.1zm6 7.8V8.6l5-2.5v5.3l-5 2.5z" />
            </svg>
            Packages
          </button>

          <button
            type="button"
            className="settings-btn"
            onClick={() => setSettingsOpen((v) => !v)}
            title="Settings"
            aria-label="Settings"
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <div className={`status-pill ${statusState}`}>
            <div className="status-dot" />
            <span>{statusText}</span>
          </div>
        </header>

        {settingsOpen && (
          <SettingsPanel
            mode={mode}
            setMode={setMode}
            fontSize={fontSize}
            setFontSize={setFontSize}
            outputFontSizeEnabled={outputFontSizeEnabled}
            setOutputFontSizeEnabled={setOutputFontSizeEnabled}
            outputFontSize={outputFontSize}
            setOutputFontSize={setOutputFontSize}
            editorTheme={editorTheme}
            setEditorTheme={setEditorTheme}
            language={adapter.id}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        <PackagesDrawer
          open={packagesOpen}
          packages={adapter.packages}
          importSnippet={adapter.importSnippet}
          footer={adapter.packagesFooter}
          onClose={() => setPackagesOpen(false)}
        />

        <div className="panes" ref={panesRef}>
          <div className="editor-pane" ref={editorPaneRef}>
            <div className="pane-bar">
              <span className="pane-label">Editor</span>
              <div className="pane-bar-sep" />
              <span className="kbd">⌘ Enter</span>
              <button
                type="button"
                className="run-btn"
                disabled={!loaded}
                onClick={() => {
                  void runCode();
                }}
              >
                <svg viewBox="0 0 12 12">
                  <polygon points="2,1 11,6 2,11" />
                </svg>
                Run
              </button>
            </div>
            <div className="editor-wrap">
              <textarea ref={textareaRef} defaultValue="" />
            </div>
            <div className="resizer" ref={resizerRef} />
          </div>

          <div className="output-pane">
            <div className="pane-bar">
              <span className="pane-label">Output</span>
              <div className="pane-bar-sep" />
              <button
                type="button"
                className="clear-btn"
                onClick={clearOutput}
              >
                Clear
              </button>
            </div>
            <div className="output-body" ref={outputBodyRef}>
              {outputs.length === 0 ? (
                <div className="welcome">
                  <div className="welcome-icon">⌬</div>
                  <h3>Run your code to see output</h3>
                  <p>
                    Supports text, data frames, charts, and figures.
                  </p>
                </div>
              ) : (
                outputs.map((cell) => (
                  <div
                    key={cell.id}
                    className={`out-cell ${cell.type}`}
                  >
                    <div className="out-cell-header">
                      <span className="cell-type">{typeLabel[cell.type]}</span>
                      <span className="cell-time">{cell.elapsed}</span>
                    </div>
                    <div className="out-cell-body">
                      {cell.type === "image" ? (
                        // Base64 PNGs from Pyodide/WebR have unknown intrinsic
                        // dimensions and are not eligible for next/image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/png;base64,${cell.content}`}
                          alt="figure"
                          onLoad={scrollOutputToBottom}
                        />
                      ) : cell.type === "html" ? (
                        <div
                          className="dataframe-wrap"
                          dangerouslySetInnerHTML={{ __html: cell.content }}
                        />
                      ) : cell.type === "plot" && cell.plot ? (
                        <PlotlyChart figure={cell.plot} />
                      ) : (
                        <span>{cell.content}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
