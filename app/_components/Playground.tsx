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
// CodeMirror's show-hint addon ships its own popup stylesheet.
import "codemirror/addon/hint/show-hint.css";
import type {
  CodeMirrorAPI,
  CodeMirrorEditor,
} from "./runtime/globals";
import type {
  ExampleSnippet,
  ExportFormat,
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PackageInfo,
  PlotlyFigure,
  RuntimeInfo,
} from "./types";
import { PLAYGROUNDS } from "./playgrounds";
import { useRouter } from "next/navigation";
// Base UI primitives — used for menus, popovers, dialogs, and toasts so
// that the playground gets consistent positioning, focus management,
// and natural enter/exit animations out of the box.
import { Menu } from "@base-ui-components/react/menu";
import { Popover } from "@base-ui-components/react/popover";
import { Dialog } from "@base-ui-components/react/dialog";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Toast } from "@base-ui-components/react/toast";
import { Select } from "@base-ui-components/react/select";

/** Minimal Plotly surface we use for rendering chart cells. */
interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}

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

function applyMode(theme: string): void {
  const resolved = LIGHT_THEMES.has(theme) ? "light" : "dark";
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
  footer: ReactNode;
  onClose: () => void;
  onPickPackage: (pkg: PackageInfo) => void;
}

function PackagesDrawer({
  open,
  packages,
  footer,
  onClose,
  onPickPackage,
}: PackagesDrawerProps) {
  const [query, setQuery] = useState("");

  // The drawer fully unmounts when closed (Base UI's Dialog handles
  // mount/unmount via `open`), so internal state naturally resets — no
  // effect needed to clear it.

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

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="pkg-overlay" />
        <Dialog.Popup
          className="pkg-drawer"
          aria-label="Available packages"
        >
          <div className="pkg-drawer-header">
            <div>
              <Dialog.Title className="pkg-drawer-title">
                Available Packages
                <span className="pkg-count-badge">{filtered.length}</span>
              </Dialog.Title>
              <Dialog.Description className="pkg-drawer-hint">
                Click on a package to import it into your editor.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="settings-close"
              aria-label="Close packages"
            >
              ✕
            </Dialog.Close>
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
                  <button
                    type="button"
                    className="pkg-item"
                    key={p.name}
                    onClick={() => onPickPackage(p)}
                  >
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
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="pkg-footer">{footer}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* The Examples menu, Export menu, and Info popover are rendered inline
   at their call-sites using Base UI's Menu and Popover primitives.
   Those primitives portal to the document body, sidestepping the
   `overflow:hidden` clipping on `.header-actions` that previously hid
   the legacy custom dropdowns. */

function RuntimeInfoContent({ info }: { info: RuntimeInfo }) {
  return (
    <>
      <div className="info-popover-row">
        <span className="info-popover-label">Language</span>
        <span className="info-popover-val">
          {info.language} {info.version}
        </span>
      </div>
      <div className="info-popover-row">
        <span className="info-popover-label">Runtime</span>
        <span className="info-popover-val">
          {info.engineUrl ? (
            <a href={info.engineUrl} target="_blank" rel="noreferrer">
              {info.engine}
            </a>
          ) : (
            info.engine
          )}
        </span>
      </div>
      <div className="info-popover-row">
        <span className="info-popover-label">GitHub</span>
        <span className="info-popover-val">
          <a
            href="https://github.com/subwaymatch/dataslope-playground"
            target="_blank"
            rel="noreferrer"
            className="info-github-link"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Dataslope
          </a>
        </span>
      </div>
      {info.notes && <div className="info-popover-notes">{info.notes}</div>}
    </>
  );
}

// Small clipboard / "copy to clipboard" glyph reused by the editor and
// output cell headers. Stroked rather than filled so it visually matches
// the existing pane-bar icons.
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

interface SettingsPanelProps {
  open: boolean;
  fontSize: number;
  setFontSize: (n: number) => void;
  outputFontSizeEnabled: boolean;
  setOutputFontSizeEnabled: (b: boolean) => void;
  outputFontSize: number;
  setOutputFontSize: (n: number) => void;
  editorTheme: string;
  setEditorTheme: (t: string) => void;
  wordWrap: boolean;
  setWordWrap: (b: boolean) => void;
  clearBeforeRun: boolean;
  setClearBeforeRun: (b: boolean) => void;
  language: string; // e.g. "python" / "r" — used only for the preview snippet
  onClose: () => void;
}

function SettingsPanel({
  open,
  fontSize,
  setFontSize,
  outputFontSizeEnabled,
  setOutputFontSizeEnabled,
  outputFontSize,
  setOutputFontSize,
  editorTheme,
  setEditorTheme,
  wordWrap,
  setWordWrap,
  clearBeforeRun,
  setClearBeforeRun,
  language,
  onClose,
}: SettingsPanelProps) {
  const palette = THEME_PREVIEWS[editorTheme] ?? THEME_PREVIEWS.dracula;
  const fnName = SAMPLE_FN_NAME[language] ?? "greet";

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="settings-overlay" />
        <Dialog.Popup className="settings-panel" aria-label="Settings">
          <div className="settings-header">
            <Dialog.Title className="settings-title">Settings</Dialog.Title>
            <Dialog.Close
              className="settings-close"
              aria-label="Close settings"
            >
              ✕
            </Dialog.Close>
          </div>
        <div className="settings-body">
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

          <div className="setting-row">
            <label className="setting-checkbox-row">
              <input
                type="checkbox"
                checked={wordWrap}
                onChange={(e) => setWordWrap(e.target.checked)}
              />
              <span>Word Wrap</span>
            </label>
          </div>

          <div className="setting-row">
            <label className="setting-checkbox-row">
              <input
                type="checkbox"
                checked={clearBeforeRun}
                onChange={(e) => setClearBeforeRun(e.target.checked)}
              />
              <span>Clear Output Before Running</span>
            </label>
          </div>
        </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface PlaygroundProps {
  adapter: LanguageAdapter;
}

export default function Playground(props: PlaygroundProps) {
  // The Toast.Provider needs to be a parent of any component that uses
  // `Toast.useToastManager()`, so the actual playground body lives in
  // `PlaygroundInner` while this wrapper just sets up the provider /
  // viewport.
  return (
    <Toast.Provider timeout={2400}>
      <PlaygroundInner {...props} />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={`toast toast-${toast.data?.kind ?? "info"}`}
    >
      <Toast.Title className="toast-title">{toast.title}</Toast.Title>
      {toast.description && (
        <Toast.Description className="toast-desc">
          {toast.description}
        </Toast.Description>
      )}
      <Toast.Close className="toast-close" aria-label="Dismiss">
        ✕
      </Toast.Close>
    </Toast.Root>
  ));
}

function PlaygroundInner({ adapter }: PlaygroundProps) {
  // ─── Initial settings (persisted in localStorage, namespaced per-language) ─
  const storageKey = (k: string) => `pg_${adapter.id}_${k}`;
  const [fontSize, setFontSizeState] = useState<number>(13);
  const [outputFontSizeEnabled, setOutputFontSizeEnabledState] =
    useState<boolean>(false);
  const [outputFontSize, setOutputFontSizeState] = useState<number>(13);
  const [editorTheme, setEditorThemeState] = useState<string>("dracula");
  const [wordWrap, setWordWrapState] = useState<boolean>(true);
  const [clearBeforeRun, setClearBeforeRunState] = useState<boolean>(false);

  // ─── UI state ───────────────────────────────────────────────────────────
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Mobile consolidated-menu drawer. We render this as a Dialog (bottom
  // sheet) instead of a Menu so its inline sub-sections (Examples,
  // Information, …) can't be cut off the side of a narrow viewport.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Confirm dialog shown when picking an example would discard editor
  // contents the user has already typed.
  const [pendingExample, setPendingExample] = useState<ExampleSnippet | null>(
    null,
  );
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      toastManager.add({ title: msg, data: { kind } });
    },
    [toastManager],
  );
  const [mobileTab, setMobileTab] = useState<"editor" | "output">("editor");
  const router = useRouter();

  // ─── Runtime state ──────────────────────────────────────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Initializing runtime…",
  );
  const [loaded, setLoaded] = useState(false);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
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

  // The id of the first output cell produced by the most recent run.
  // The auto-scroll effect uses it to scroll that cell into view rather
  // than jumping all the way to the end of the scroll container.
  const newRunFirstIdRef = useRef<number | null>(null);

  const scrollToLatestOutput = useCallback(() => {
    const el = outputBodyRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const id = newRunFirstIdRef.current;
      if (id != null) {
        const target = el.querySelector<HTMLElement>(
          `[data-cell-id="${id}"]`,
        );
        if (target) {
          // Scroll so the cell sits ~64px below the top of the output area,
          // giving the header a small breathing room without overshooting
          // into the bottom padding.
          const top = target.offsetTop - 64;
          el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
          return;
        }
      }
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Hydrate persisted settings + apply to <html data-theme> on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = adapter.documentTitle;
    document.body.classList.add("pg-active");

    const savedSize = Number(localStorage.getItem(storageKey("fontsize")) ?? 13) || 13;
    const savedTheme = localStorage.getItem(storageKey("editortheme")) ?? "dracula";
    const savedOutputEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(localStorage.getItem(storageKey("outputfontsize")) ?? savedSize) ||
      savedSize;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";

    /* Hydrate persisted settings from localStorage. We can't use lazy
       useState initialisers because that would cause a hydration mismatch
       between SSR (no `window`) and CSR. */
    /* eslint-disable react-hooks/set-state-in-effect */
    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(savedOutputEnabled);
    setOutputFontSizeState(savedOutputSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);
    /* eslint-enable react-hooks/set-state-in-effect */
    applyMode(savedTheme);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${savedOutputEnabled ? savedOutputSize : savedSize}px`,
    );

    return () => {
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
          import("codemirror/mode/javascript/javascript"),
          // The PHP mode depends on htmlmixed, which itself depends on
          // xml, css, and javascript (already loaded above), and on
          // clike for inline C-style syntax inside <?php blocks.
          import("codemirror/mode/xml/xml"),
          import("codemirror/mode/css/css"),
          import("codemirror/mode/clike/clike"),
          import("codemirror/mode/htmlmixed/htmlmixed"),
          import("codemirror/mode/php/php"),
          import("codemirror/addon/edit/closebrackets"),
          import("codemirror/addon/edit/matchbrackets"),
          import("codemirror/addon/comment/comment"),
          import("codemirror/addon/hint/show-hint"),
          import("codemirror/keymap/sublime"),
        ]);
        if (cancelled) return;

        // Initialise CodeMirror once the script is on the page.
        const CM = (codeMirrorMod.default ?? codeMirrorMod) as unknown as CodeMirrorAPI;
        if (textareaRef.current && !editorRef.current) {
          // Read the persisted theme directly so the editor is created with
          // the same theme that the rest of the UI was hydrated with.
          // Otherwise CodeMirror would briefly render with the default
          // `editorTheme` state ("dracula") while the surrounding UI uses
          // the saved theme, producing a visible mismatch on load.
          const initialTheme =
            localStorage.getItem(storageKey("editortheme")) ?? "dracula";
          const initialWordWrap =
            localStorage.getItem(storageKey("wordwrap")) !== "false";
          const triggerAutocomplete = () => {
            // The runtime might not be ready yet (e.g. immediately after
            // page load); the registered hint helper just resolves to
            // null in that case so it's safe to always trigger.
            editorRef.current?.showHint({ completeSingle: false });
          };
          const editor = CM.fromTextArea(textareaRef.current, {
            mode: adapter.codeMirrorMode,
            theme: initialTheme,
            lineNumbers: true,
            indentUnit: 2,
            tabSize: 2,
            indentWithTabs: false,
            keyMap: "sublime",
            autoCloseBrackets: true,
            matchBrackets: true,
            lineWrapping: initialWordWrap,
            extraKeys: {
              "Cmd-Enter": () => runRef.current(),
              "Ctrl-Enter": () => runRef.current(),
              "Ctrl-Space": triggerAutocomplete,
            },
          });
          editor.setValue(adapter.examples[0]?.code ?? "");
          editor.setSize("100%", "100%");
          editorRef.current = editor;

          // Register a hint helper for the adapter's mode that defers to
          // the runtime's `complete()` (when implemented). Helpers can
          // return a promise — show-hint awaits it before showing the
          // popup, which is exactly what we need for the worker round-trip.
          CM.registerHelper(
            "hint",
            adapter.codeMirrorMode,
            async (cm: CodeMirrorEditor) => {
              const rt = runtimeRef.current;
              if (!rt || typeof rt.complete !== "function") return null;
              const cur = cm.getCursor();
              const lineText = cm.getLine(cur.line);
              try {
                const res = await rt.complete(lineText, cur.ch);
                if (!res || res.list.length === 0) return null;
                return {
                  list: res.list,
                  from: CM.Pos(cur.line, cur.ch - res.replaceLength),
                  to: CM.Pos(cur.line, cur.ch),
                };
              } catch {
                return null;
              }
            },
          );

          // Auto-trigger the popup after the user types `.` so that
          // `pd.<Tab>` style attribute completion feels natural without
          // requiring an explicit Ctrl-Space.
          editor.on("inputRead", ((_cm: unknown, change: unknown) => {
            const c = change as { text?: string[]; origin?: string };
            if (c.origin !== "+input") return;
            const text = c.text?.[0];
            if (text === ".") {
              triggerAutocomplete();
            }
          }) as (...args: unknown[]) => void);
        }

        const rt = await adapter.init((m) => {
          if (!cancelled) setLoadingMessage(m);
        });
        if (cancelled) return;
        runtimeRef.current = rt;
        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadingMessage(`Failed to load: ${msg}`);
        setStatusState("error");
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
    applyMode(editorTheme);
  }, [editorTheme]);

  // Push word-wrap changes into CodeMirror after init.
  useEffect(() => {
    editorRef.current?.setOption("lineWrapping", wordWrap);
  }, [wordWrap]);

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

  const setWordWrap = useCallback(
    (b: boolean) => {
      setWordWrapState(b);
      localStorage.setItem(storageKey("wordwrap"), String(b));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adapter.id],
  );

  const setClearBeforeRun = useCallback(
    (b: boolean) => {
      setClearBeforeRunState(b);
      localStorage.setItem(storageKey("clearbeforerun"), String(b));
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

    if (clearBeforeRun) {
      setOutputs([]);
      outputCounter.current = 0;
    }

    const t0 = performance.now();
    const collected: Omit<OutputCell, "id" | "elapsed">[] = [];
    const firstId = outputCounter.current + 1;
    newRunFirstIdRef.current = firstId;
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
      if (collected.length === 0) {
        showToast("Code ran successfully — no output.");
      }
      setStatusState("ready");
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
      window.setTimeout(() => {
        setStatusState("ready");
      }, 3000);
    } finally {
      // On narrow viewports the panes share the screen via a tab switcher;
      // surface the result tab automatically once the run is done so the
      // user doesn't have to swipe back themselves.
      setMobileTab("output");
    }
  }, [clearBeforeRun, showToast]);

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
    }
  }, [loaded]);

  // Apply an example to the editor immediately. Use `requestExample` for
  // user-initiated picks so we can prompt before discarding work.
  const applyExample = useCallback((ex: ExampleSnippet) => {
    editorRef.current?.setValue(ex.code);
    editorRef.current?.focus();
  }, []);

  const requestExample = useCallback(
    (ex: ExampleSnippet) => {
      const current = editorRef.current?.getValue().trim() ?? "";
      // Prompt only when the editor has user content that isn't already
      // identical to the chosen example. We always allow the very first
      // example (index 0) load when the buffer matches the default code.
      if (current.length > 0 && current !== ex.code.trim()) {
        setPendingExample(ex);
        return;
      }
      applyExample(ex);
    },
    [applyExample],
  );

  const importPackage = useCallback(
    (pkg: PackageInfo) => {
      const editor = editorRef.current;
      if (!editor) return;
      const current = editor.getValue();
      if (adapter.hasImport(current, pkg.name)) {
        showToast(`${pkg.name} is already imported.`, "warn");
        return;
      }
      const snippet = adapter.importSnippet(pkg.name);
      const next = current.length === 0 ? `${snippet}\n` : `${snippet}\n${current}`;
      editor.setValue(next);
      // Position the cursor right after the inserted line so the user lands
      // back where work in progress can continue.
      editor.setCursor({ line: 1, ch: 0 });
      showToast(`Imported ${pkg.name}.`);
    },
    [adapter, showToast],
  );

  const exportCode = useCallback(
    (format: ExportFormat) => {
      const code = editorRef.current?.getValue() ?? "";
      const blob = new Blob([code], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${adapter.exportBaseFilename}.${format.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [adapter.exportBaseFilename],
  );

  // Copy arbitrary text to the clipboard. Prefers the async Clipboard API
  // and falls back to the legacy `execCommand("copy")` path so the button
  // still works in non-secure contexts (e.g. http:// dev hosts) where
  // `navigator.clipboard` is unavailable. Surfaces success/failure via a
  // toast so the action has clear visual feedback.
  const copyToClipboard = useCallback(
    async (text: string, label: string) => {
      const fallback = () => {
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.setAttribute("readonly", "");
          ta.style.position = "fixed";
          ta.style.top = "-1000px";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          return ok;
        } catch {
          return false;
        }
      };

      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          ok = fallback();
        }
      } catch {
        ok = fallback();
      }
      if (ok) {
        showToast(`${label} copied to clipboard.`);
      } else {
        showToast(`Could not copy ${label.toLowerCase()}.`, "warn");
      }
    },
    [showToast],
  );

  const copyEditor = useCallback(() => {
    const code = editorRef.current?.getValue() ?? "";
    if (!code) {
      showToast("Editor is empty.", "warn");
      return;
    }
    void copyToClipboard(code, "Code");
  }, [copyToClipboard, showToast]);

  // Auto-scroll output on new cells.
  useEffect(() => {
    scrollToLatestOutput();
  }, [outputs, scrollToLatestOutput]);

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

  // Base UI's Menu / Popover handle outside clicks, focus management,
  // and Escape themselves, so the legacy click-outside effects for the
  // examples / export / info dropdowns are no longer needed.

  const typeLabel: Record<OutputCell["type"], string> = {
    stdout: "OUTPUT",
    stderr: "ERROR",
    html: "DATAFRAME",
    image: "FIGURE",
    plot: "CHART",
  };

  // The output cell shows a copy button only when its content is plain
  // text or HTML markup that is meaningful to copy. Skipping image/plot
  // cells avoids exposing the raw base64 PNG / Plotly JSON blob behind a
  // misleading "Copy" affordance.
  const isCopyableCell = (cell: OutputCell) =>
    cell.type === "stdout" || cell.type === "stderr" || cell.type === "html";

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
            <Select.Root
              value={adapter.id}
              onValueChange={(value) => {
                const next = PLAYGROUNDS.find((p) => p.id === value);
                if (next && next.id !== adapter.id) router.push(next.href);
              }}
            >
              <Select.Trigger
                className="playground-switcher"
                aria-label="Switch playground"
              >
                <Select.Value />
                <Select.Icon className="playground-switcher-icon">
                  <svg viewBox="0 0 12 12" width={10} height={10}>
                    <polyline
                      points="2,4 6,8 10,4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup">
                    {PLAYGROUNDS.map((p) => (
                      <Select.Item
                        key={p.id}
                        value={p.id}
                        className="bui-select-item"
                      >
                        <Select.ItemText>{p.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />

          {/* Desktop action group — hidden on narrow viewports in favour
              of the consolidated mobile menu below. */}
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Examples"
                aria-label="Examples"
              >
                <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                  <path d="M2 2h12v2H2zm0 4h8v2H2zm0 4h10v2H2z" />
                </svg>
                <span className="btn-label">Examples</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown">
                    {adapter.examples.map((ex) => (
                      <Menu.Item
                        key={ex.key}
                        className="example-item"
                        onClick={() => requestExample(ex)}
                      >
                        <div className="ex-title">{ex.title}</div>
                        <div className="ex-desc">{ex.desc}</div>
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>

            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Export code"
                aria-label="Export"
              >
                <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                  <path d="M8 1l3 3h-2v5H7V4H5l3-3zM2 11h12v2H2z" />
                </svg>
                <span className="btn-label">Export</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    {adapter.exportFormats.map((fmt) => (
                      <Menu.Item
                        key={fmt.extension}
                        className="example-item export-item"
                        onClick={() => exportCode(fmt)}
                      >
                        <span className="ext-badge">.{fmt.extension}</span>
                        <div className="export-item-text">
                          <div className="ex-title">{fmt.label}</div>
                          <div className="ex-desc">
                            Download as .{fmt.extension}
                          </div>
                        </div>
                      </Menu.Item>
                    ))}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>

            {adapter.packages.length > 0 && (
              <button
                type="button"
                className="header-btn"
                onClick={() => setPackagesOpen(true)}
                title="Available Packages"
                aria-label="Packages"
              >
                <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                  <path d="M8 1L1 4.5v7L8 15l7-3.5v-7L8 1zm0 1.8l4.5 2.2L8 7.2 3.5 5 8 2.8zM2 6.1l5 2.5v5.3L2 11.4V6.1zm6 7.8V8.6l5-2.5v5.3l-5 2.5z" />
                </svg>
                <span className="btn-label">Packages</span>
              </button>
            )}

            <Popover.Root>
              <Popover.Trigger
                className="header-btn icon-only"
                title="Runtime info"
                aria-label="Runtime info"
              >
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="11" x2="12" y2="16" />
                  <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup info-popover">
                    <RuntimeInfoContent info={adapter.runtimeInfo} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>

            <button
              type="button"
              className="header-btn icon-only"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Settings"
            >
              <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          {/* Mobile-only consolidated menu — replaces the header buttons
              on narrow viewports. We render it as a Dialog (bottom-sheet
              drawer) rather than a Menu with nested submenus, so that
              sections like "Examples" and "Information" stay inside the
              viewport instead of popping out to the side and getting
              clipped on narrow phones. The playground switcher stays on
              the left of the header so the user can always tell which
              playground they're in at a glance. */}
          <Dialog.Root
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
          >
            <Dialog.Trigger
              className="header-btn icon-only mobile-only mobile-menu-btn"
              title="Menu"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="pkg-overlay mobile-menu-backdrop" />
              <Dialog.Popup
                className="mobile-menu-drawer"
                aria-label="Menu"
              >
                <div className="mobile-menu-handle" aria-hidden="true" />
                <div className="mobile-menu-drawer-header">
                  <Dialog.Title className="mobile-menu-drawer-title">
                    Menu
                  </Dialog.Title>
                  <Dialog.Close
                    className="settings-close"
                    aria-label="Close menu"
                  >
                    ✕
                  </Dialog.Close>
                </div>
                <div className="mobile-menu-drawer-body">
                  {/* Examples — collapsible inline section */}
                  <details className="mobile-menu-section">
                    <summary className="mobile-menu-section-summary">
                      <span>Examples</span>
                      <span className="mobile-menu-chev" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <div className="mobile-menu-section-body">
                      {adapter.examples.map((ex) => (
                        <button
                          type="button"
                          key={ex.key}
                          className="example-item"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            requestExample(ex);
                          }}
                        >
                          <div className="ex-title">{ex.title}</div>
                          <div className="ex-desc">{ex.desc}</div>
                        </button>
                      ))}
                    </div>
                  </details>

                  {/* Export — collapsible inline section */}
                  <details className="mobile-menu-section">
                    <summary className="mobile-menu-section-summary">
                      <span>Export</span>
                      <span className="mobile-menu-chev" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <div className="mobile-menu-section-body">
                      {adapter.exportFormats.map((fmt) => (
                        <button
                          type="button"
                          key={fmt.extension}
                          className="example-item export-item"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            exportCode(fmt);
                          }}
                        >
                          <span className="ext-badge">.{fmt.extension}</span>
                          <div className="export-item-text">
                            <div className="ex-title">{fmt.label}</div>
                            <div className="ex-desc">
                              Download as .{fmt.extension}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </details>

                  {adapter.packages.length > 0 && (
                    <button
                      type="button"
                      className="mobile-menu-action"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setPackagesOpen(true);
                      }}
                    >
                      <span>Packages</span>
                    </button>
                  )}

                  {/* Information — collapsible inline section */}
                  <details className="mobile-menu-section">
                    <summary className="mobile-menu-section-summary">
                      <span>Information</span>
                      <span className="mobile-menu-chev" aria-hidden="true">
                        ›
                      </span>
                    </summary>
                    <div className="mobile-menu-section-body info-popover">
                      <RuntimeInfoContent info={adapter.runtimeInfo} />
                    </div>
                  </details>

                  <button
                    type="button"
                    className="mobile-menu-action"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                  >
                    <span>Settings</span>
                  </button>
                </div>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        <SettingsPanel
          open={settingsOpen}
          fontSize={fontSize}
          setFontSize={setFontSize}
          outputFontSizeEnabled={outputFontSizeEnabled}
          setOutputFontSizeEnabled={setOutputFontSizeEnabled}
          outputFontSize={outputFontSize}
          setOutputFontSize={setOutputFontSize}
          editorTheme={editorTheme}
          setEditorTheme={setEditorTheme}
          wordWrap={wordWrap}
          setWordWrap={setWordWrap}
          clearBeforeRun={clearBeforeRun}
          setClearBeforeRun={setClearBeforeRun}
          language={adapter.id}
          onClose={() => setSettingsOpen(false)}
        />

        <PackagesDrawer
          open={packagesOpen}
          packages={adapter.packages}
          footer={adapter.packagesFooter}
          onClose={() => setPackagesOpen(false)}
          onPickPackage={importPackage}
        />

        {/* Confirm dialog shown when picking an example would discard
            existing editor contents. */}
        <AlertDialog.Root
          open={pendingExample !== null}
          onOpenChange={(next) => {
            if (!next) setPendingExample(null);
          }}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Discard current code?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                Loading{" "}
                <strong>“{pendingExample?.title}”</strong>{" "}
                will overwrite the code currently in the editor. This
                can&rsquo;t be undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    if (pendingExample) applyExample(pendingExample);
                    setPendingExample(null);
                  }}
                >
                  Discard &amp; load
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <div className="mobile-tabs" role="tablist" aria-label="Pane">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "editor"}
            className={`mobile-tab${mobileTab === "editor" ? " active" : ""}`}
            onClick={() => setMobileTab("editor")}
          >
            Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "output"}
            className={`mobile-tab${mobileTab === "output" ? " active" : ""}`}
            onClick={() => setMobileTab("output")}
          >
            Output
          </button>
        </div>

        <div className="panes" data-mobile-tab={mobileTab} ref={panesRef}>
          <div className="editor-pane" ref={editorPaneRef}>
            <div className="pane-bar">
              <span className="pane-label">Editor</span>
              <div className="pane-bar-sep" />
              <button
                type="button"
                className="icon-btn"
                title="Copy code to clipboard"
                aria-label="Copy code to clipboard"
                onClick={copyEditor}
              >
                <CopyIcon />
              </button>
              <span className="kbd">⌘ Enter</span>
              <button
                type="button"
                className={`run-btn${statusState === "running" ? " running" : ""}`}
                disabled={!loaded || statusState === "running"}
                onClick={() => {
                  void runCode();
                }}
              >
                {statusState === "running" ? (
                  <svg viewBox="0 0 12 12" className="run-btn-spinner">
                    <circle cx="6" cy="6" r="4.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 12 12">
                    <polygon points="2,1 11,6 2,11" />
                  </svg>
                )}
                {statusState === "running" ? "Running…" : "Run"}
              </button>
            </div>
            <div className="editor-wrap">
              <textarea ref={textareaRef} defaultValue="" />
            </div>
            <div
              className="resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="vertical"
              aria-label="Drag to resize editor and output panes"
              title="Drag to resize"
            />
          </div>

          <div className="output-pane">
            <div className="pane-bar">
              <span className="pane-label">
                {outputs.length === 0
                  ? "Output"
                  : `${outputs.length} ${outputs.length === 1 ? "Output" : "Outputs"}`}
              </span>
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
              {outputs.length === 0 && statusState !== "running" ? (
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
                    data-cell-id={cell.id}
                    className={`out-cell ${cell.type}`}
                  >
                    <div className="out-cell-header">
                      <span className="cell-type">{typeLabel[cell.type]}</span>
                      <span className="cell-time">Done in {cell.elapsed}</span>
                      {isCopyableCell(cell) && (
                        <button
                          type="button"
                          className="icon-btn out-cell-copy"
                          title="Copy output to clipboard"
                          aria-label="Copy output to clipboard"
                          onClick={() =>
                            void copyToClipboard(
                              cell.content,
                              cell.type === "stderr" ? "Error" : "Output",
                            )
                          }
                        >
                          <CopyIcon />
                        </button>
                      )}
                    </div>
                    <div className="out-cell-body">
                      {cell.type === "image" ? (
                        // Base64 PNGs from Pyodide/WebR have unknown intrinsic
                        // dimensions and are not eligible for next/image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/png;base64,${cell.content}`}
                          alt="figure"
                          onLoad={scrollToLatestOutput}
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
