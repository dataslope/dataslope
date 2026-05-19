"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import "./playground.css";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers as lineNumbersExt,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { loadLanguage, themeFor } from "./cmExtensions";

import type {
  ExampleSnippet,
  ExportFormat,
  LanguageAdapter,
  LanguageRuntime,
  OutputCell,
  PackageInfo,
  PlotlyFigure,
} from "./types";
import { PLAYGROUNDS } from "./playgrounds";
import { useRouter } from "next/navigation";
import Link from "next/link";
// Base UI primitives — used for menus, popovers, dialogs, and toasts so
// that the playground gets consistent positioning, focus management,
// and natural enter/exit animations out of the box.
import { Menu } from "@base-ui-components/react/menu";
import { Popover } from "@base-ui-components/react/popover";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Toast } from "@base-ui-components/react/toast";
import { Select } from "@base-ui-components/react/select";
import { Drawer } from "@base-ui/react/drawer";
import {
  Library,
  ArrowDownToLine,
  Package,
  Timer,
  Eraser,
  Play,
  FileCode,
  Wand2,
  Code2,
  Terminal,
  FolderTree,
  X,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "./languageIcons";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "./playgroundTheme";
import {
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  LOADING_QUIPS,
  RuntimeInfoContent,
  SettingsPanelContent,
  detectIsMac,
} from "./playgroundShared";
import { TabBar } from "./tabs/TabBar";
import type { TabDescriptor } from "./tabs/tabTypes";
import {
  SETTINGS_TAB_ID,
  defaultFiles,
  loadManifest,
  newFileId,
  saveManifest,
  suggestNextFilename,
  type PlaygroundFile,
} from "./playgroundTabs";
import { getPlaygroundStore } from "./stores/createPlaygroundStore";
import {
  deleteFile as opfsDeleteFile,
  readFile as opfsReadFile,
  writeFile as opfsWriteFile,
} from "./opfs/fileStorage";
import { ensureActiveWorkspace } from "./opfs/activeWorkspace";
import { acquireWorkspaceLock } from "./opfs/workspace";
import { WorkspaceBadge } from "./workspace/WorkspaceBadge";
import { FileCode2, Settings } from "lucide-react";
import { FilesPanel, type VirtualFile } from "./files/FilesPanel";
import {
  deleteDataEntry,
  loadDataFiles,
  readDataFile,
  renameDataEntry,
  upsertDataFolder,
  writeDataFile,
} from "./files/opfsDataStorage";

const MOBILE_EDITOR_TAB = "editor" as const;
// Minimum time (ms) the "running" overlay is shown so the 180ms CSS
// transition can complete and be clearly visible to the user.
const MIN_ANIMATION_MS = 300;

/** Minimal Plotly surface we use for rendering chart cells. */
interface PlotlyAPI {
  newPlot(
    el: HTMLElement,
    data: unknown[],
    layout?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ): Promise<unknown>;
}


/** Build the empty-state output-panel blurb based on what the runtime
 *  can actually produce. Every runtime supports plain text; richer
 *  outputs (data frames / charts / figures) are advertised only when the
 *  adapter explicitly enables them via `outputCapabilities`. Returns an
 *  empty string for text-only runtimes so the welcome panel doesn't
 *  show a noisy "Supports text output." line for languages that have no
 *  richer outputs to brag about. */
function buildCapabilitiesBlurb(
  caps: LanguageAdapter["outputCapabilities"],
): string {
  const items: string[] = [];
  if (caps?.dataframes) items.push("data frames");
  if (caps?.charts) items.push("charts");
  if (caps?.figures) items.push("figures");
  if (items.length === 0) return "";
  if (items.length === 1) return `Supports text and ${items[0]}.`;
  if (items.length === 2)
    return `Supports text, ${items[0]}, and ${items[1]}.`;
  return `Supports text, ${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}.`;
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
  onPickPackageExample: (pkg: PackageInfo) => void;
}

function PackagesDrawer({
  open,
  packages,
  footer,
  onClose,
  onPickPackage,
  onPickPackageExample,
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
    <Drawer.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop className="pkg-overlay" />
        <Drawer.Viewport className="mobile-drawer-viewport pkg-drawer-viewport">
          <Drawer.Popup
            className="pkg-drawer"
            aria-label="Available packages"
          >
            <Drawer.Content className="pkg-drawer-content">
              {/* Visible drag handle on mobile (matches the other
                  bottom-sheet drawers); hidden via CSS on desktop where
                  the panel slides in from the right and isn't dragged. */}
              <div className="mobile-menu-handle" aria-hidden="true" />
              <div className="pkg-drawer-header">
                <div>
                  <Drawer.Title className="pkg-drawer-title">
                    Available Packages
                    <span className="pkg-count-badge">{filtered.length}</span>
                  </Drawer.Title>
                  <Drawer.Description className="pkg-drawer-hint">
                    Click on a package to import it into your editor.
                  </Drawer.Description>
                </div>
                <Drawer.Close
                  className="settings-close"
                  aria-label="Close packages"
                >
                  ✕
                </Drawer.Close>
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
                      <div className="pkg-item-row" key={p.name}>
                        <button
                          type="button"
                          className="pkg-item"
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
                        {p.example && (
                          <button
                            type="button"
                            className="pkg-example-btn"
                            onClick={(e) => {
                              // Stop the click from also triggering the
                              // outer pkg-item onClick (which would import
                              // the package as a side-effect).
                              e.stopPropagation();
                              onPickPackageExample(p);
                            }}
                            title={`Load example using ${p.name}`}
                            aria-label={`Load example using ${p.name}`}
                          >
                            <FileCode size={13} aria-hidden="true" />
                            <span>Example</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="pkg-footer">{footer}</div>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* The Examples menu, Export menu, and Info popover are rendered inline
   at their call-sites using Base UI's Menu and Popover primitives.
   Those primitives portal to the document body, sidestepping the
   `overflow:hidden` clipping on `.header-actions` that previously hid
   the legacy custom dropdowns. */



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
      <Toast.Content className="toast-content">
        <Toast.Title className="toast-title">{toast.title}</Toast.Title>
        {toast.description && (
          <Toast.Description className="toast-desc">
            {toast.description}
          </Toast.Description>
        )}
        <Toast.Close className="toast-close" aria-label="Dismiss">
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

function PlaygroundInner({ adapter }: PlaygroundProps) {
  // ─── Initial settings (persisted in localStorage, namespaced per-language) ─
  const storageKey = (k: string) => `pg_${adapter.id}_${k}`;
  const [fontSize, setFontSizeState] = useState<number>(
    DEFAULT_PLAYGROUND_SETTINGS.fontSize,
  );
  const [outputFontSizeEnabled, setOutputFontSizeEnabledState] =
    useState<boolean>(false);
  const [outputFontSize, setOutputFontSizeState] = useState<number>(13);
  const [editorTheme, setEditorThemeState] = useState<string>("lucario");
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
  // Confirmations for the two destructive actions in the Settings
  // panel — using Base UI AlertDialog for both rather than the native
  // window.confirm so they look consistent with the rest of the UI.
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] =
    useState(false);
  const [confirmClearAllDataOpen, setConfirmClearAllDataOpen] =
    useState(false);

  // ─── Files pane (OPFS-backed virtual filesystem) ─────────────────────
  const [filesPaneOpen, setFilesPaneOpen] = useState(false);
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (msg: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title: msg, data: { kind } });
      });
    },
    [toastManager],
  );
  const [mobileTab, setMobileTab] = useState<"editor" | "output">(
    MOBILE_EDITOR_TAB,
  );
  // Use useSyncExternalStore so the macOS detection runs only on the
  // client without triggering a cascading effect on mount. The server
  // snapshot returns false (Ctrl Enter) so the kbd hint matches what a
  // freshly hydrated page sees on Windows/Linux.
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );
  const router = useRouter();

  // ─── Runtime state ──────────────────────────────────────────────────────
  const [loadingMessage, setLoadingMessage] = useState(
    "Initializing runtime…",
  );
  const [loaded, setLoaded] = useState(false);
  // Two-phase teardown for the loading overlay: when `loaded` flips
  // true we keep the overlay mounted briefly so its CSS opacity
  // transition can play out (avoids the "blink" effect on languages
  // that initialise quickly), then unmount it once the fade completes.
  // `loadingFading` is derived from `loaded` and `showLoadingOverlay`
  // so we don't have to setState() directly inside an effect.
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const loadingFading = loaded && showLoadingOverlay;
  useEffect(() => {
    if (!loaded) return;
    const id = window.setTimeout(() => setShowLoadingOverlay(false), 400);
    return () => window.clearTimeout(id);
  }, [loaded]);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");

  // ─── Per-adapter playground store ───────────────────────────────────────
  // Workspaces, files (tabs), per-file dirty buffers and per-file output
  // history all live in a Zustand store keyed by adapter id so the state
  // survives navigation between unrelated UI surfaces.
  const useStore = getPlaygroundStore(adapter.id);
  const workspaceId = useStore((s) => s.workspaceId);
  const workspaceName = useStore((s) => s.workspaceName);
  const files = useStore((s) => s.files);
  const activeFileId = useStore((s) => s.activeFileId);
  const activeTabId = useStore((s) => s.activeTabId);
  const dirtyBuffers = useStore((s) => s.dirtyBuffers);
  const outputsByFile = useStore((s) => s.outputsByFile);
  const setWorkspace = useStore((s) => s.setWorkspace);
  const setFiles = useStore((s) => s.setFiles);
  const setActiveFileId = useStore((s) => s.setActiveFileId);
  const setActiveTabId = useStore((s) => s.setActiveTabId);
  const updateDirtyBuffer = useStore((s) => s.updateDirtyBuffer);
  const clearDirtyBuffer = useStore((s) => s.clearDirtyBuffer);
  const setOutputsForFile = useStore((s) => s.setOutputsForFile);
  const clearOutputsForFile = useStore((s) => s.clearOutputsForFile);

  // Derived: the active file's outputs (the output pane is per-tab).
  const outputs = useMemo(
    () => outputsByFile.get(activeFileId) ?? [],
    [outputsByFile, activeFileId],
  );

  // Refs let stale closures (CodeMirror persist listener, async run loop)
  // read the latest workspace + file ids without being rebuilt.
  const activeFileIdRef = useRef("");
  const workspaceIdRef = useRef("");
  const filesRef = useRef<PlaygroundFile[]>([]);
  const dirtyBuffersRef = useRef(dirtyBuffers);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);
  useEffect(() => {
    workspaceIdRef.current = workspaceId ?? "";
  }, [workspaceId]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => {
    dirtyBuffersRef.current = dirtyBuffers;
  }, [dirtyBuffers]);

  // Suppress the persist listener while we programmatically replace the
  // editor doc (tab switches, example loads). Without this every doc
  // replacement would write the *previous* file's content into the
  // *new* file's dirty buffer.
  const suppressPersistRef = useRef(false);

  const [workspaceReady, setWorkspaceReady] = useState(false);

  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  const outputCounter = useRef(0);
  const runtimeRef = useRef<LanguageRuntime | null>(null);

  // ─── CodeMirror ─────────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
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

    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize = Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) || D.fontSize;
    const savedTheme = getStoredEditorTheme(storageKey("editortheme")) ?? D.editorTheme;
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
      clearThemePalette();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id]);

  // ─── Workspace + file manifest bootstrap ────────────────────────────────
  // Resolves (or auto-creates) the active workspace for this language,
  // hydrates the file manifest from localStorage, and seeds the
  // in-memory dirty buffer by reading each file's contents from OPFS.
  // Once complete, the editor mount effect can dispatch a doc
  // replacement so the user lands on their saved code.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        const ws = await ensureActiveWorkspace(adapter.id);
        if (cancelled) return;

        const manifest = loadManifest(adapter.id, ws.id);
        let files: PlaygroundFile[];
        let activeId: string;
        if (manifest) {
          files = manifest.files;
          activeId = manifest.activeFileId;
        } else {
          files = defaultFiles(adapter);
          activeId = files[0].id;
          // Seed the file with the legacy single-file code (if any) so
          // users migrating from Phase-4 don't lose their work.
          const legacy = localStorage.getItem(storageKey("code"));
          if (legacy && legacy.length > 0) {
            opfsWriteFile(ws.id, files[0].id, legacy);
          }
          saveManifest(adapter.id, ws.id, files, activeId);
        }

        // Read each file's content from OPFS into the dirty buffer.
        // Files without OPFS content fall back to the first example as
        // a sensible starter (matches the single-file behaviour from
        // before Phase 5).
        for (const f of files) {
          const stored = await opfsReadFile(ws.id, f.id);
          if (cancelled) return;
          if (stored != null) {
            updateDirtyBuffer(f.id, stored);
          } else if (f.id === activeId) {
            const legacy = localStorage.getItem(storageKey("code"));
            const seed = legacy ?? adapter.examples[0]?.code ?? "";
            updateDirtyBuffer(f.id, seed);
            if (seed) opfsWriteFile(ws.id, f.id, seed);
          } else {
            updateDirtyBuffer(f.id, "");
          }
        }

        if (cancelled) return;
        setWorkspace(ws.id, ws.name);
        setFiles(files);
        setActiveFileId(activeId);
        setActiveTabId(activeId);
        // Sync refs eagerly so the editor's persist listener can use them
        // immediately on the next dispatch.
        workspaceIdRef.current = ws.id;
        activeFileIdRef.current = activeId;
        filesRef.current = files;
        setWorkspaceReady(true);

        // Tab-isolation notice: if another tab already holds the lock
        // for this workspace, surface a one-time toast so the user
        // knows their edits in this tab are unsafe. Shown at most once
        // per (workspace × session) via sessionStorage.
        const noticeKey = `pg_ws_warned_${ws.id}`;
        try {
          if (window.sessionStorage.getItem(noticeKey) !== "1") {
            const hasLock = await acquireWorkspaceLock(ws.id);
            if (!cancelled && !hasLock) {
              window.sessionStorage.setItem(noticeKey, "1");
              showToast(
                "This workspace is already open in another tab. Edits here may conflict — switch workspaces via the badge in the header.",
                "warn",
              );
            }
          }
        } catch {
          /* sessionStorage / Locks unavailable — ignore. */
        }
      } catch {
        // Workspace bootstrap failed (OPFS down, lock contention, etc.);
        // fall back to a single in-memory file so the playground still
        // works.
        if (cancelled) return;
        const files = defaultFiles(adapter);
        const activeId = files[0].id;
        const legacy =
          typeof window !== "undefined"
            ? localStorage.getItem(storageKey("code"))
            : null;
        const seed = legacy ?? adapter.examples[0]?.code ?? "";
        updateDirtyBuffer(activeId, seed);
        setFiles(files);
        setActiveFileId(activeId);
        setActiveTabId(activeId);
        activeFileIdRef.current = activeId;
        filesRef.current = files;
        setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id]);

  // Persist the manifest whenever files or active file change. Skipped
  // until the workspace has finished bootstrapping so the initial
  // hydration doesn't immediately overwrite a freshly-loaded manifest.
  useEffect(() => {
    if (!workspaceReady || !workspaceId) return;
    saveManifest(adapter.id, workspaceId, files, activeFileId);
  }, [adapter.id, workspaceId, files, activeFileId, workspaceReady]);

  // Load uploaded data files from OPFS once the workspace is ready.
  useEffect(() => {
    if (!workspaceReady || !workspaceId) return;
    let cancelled = false;
    void loadDataFiles(workspaceId).then((loaded) => {
      if (!cancelled) setVirtualFiles(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceReady, workspaceId]);

  // ─── Files pane handlers ───────────────────────────────────────────────
  const handleFilesUpload = useCallback(
    (fileList: FileList, parentPath: string) => {
      void (async () => {
        for (const file of Array.from(fileList)) {
          try {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            const path = parentPath ? `${parentPath}/${file.name}` : file.name;
            if (workspaceIdRef.current) {
              await writeDataFile(workspaceIdRef.current, path, bytes);
            }
            setVirtualFiles((prev) => {
              const filtered = prev.filter((f) => f.path !== path);
              return [...filtered, { path, size: bytes.length, isFolder: false }];
            });
            // Auto-expand ancestor folders so the new file is visible.
            const segments = path.split("/").filter(Boolean);
            if (segments.length > 1) {
              setExpandedFolders((prev) => {
                const next = new Set(prev);
                let cur = "";
                for (let i = 0; i < segments.length - 1; i++) {
                  cur = cur ? `${cur}/${segments[i]}` : segments[i];
                  next.add(cur);
                }
                return next;
              });
            }
            showToast(`Uploaded "${path}".`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            showToast(`Failed to upload "${file.name}": ${msg}`, "warn");
          }
        }
      })();
    },
    [showToast],
  );

  const handleFilesDownload = useCallback(
    (path: string) => {
      void (async () => {
        const wsId = workspaceIdRef.current;
        if (!wsId) return;
        try {
          const bytes = await readDataFile(wsId, path);
          if (!bytes) {
            showToast(`Could not read "${path}".`, "warn");
            return;
          }
          const blob = new Blob([bytes]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = path.split("/").pop() ?? path;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Download failed: ${msg}`, "warn");
        }
      })();
    },
    [showToast],
  );

  const handleFilesDelete = useCallback(
    (path: string) => {
      void (async () => {
        const wsId = workspaceIdRef.current;
        if (wsId) {
          await deleteDataEntry(wsId, path);
        }
        const prefix = `${path}/`;
        setVirtualFiles((prev) =>
          prev.filter((f) => f.path !== path && !f.path.startsWith(prefix)),
        );
        showToast(`Deleted "${path}".`);
      })();
    },
    [showToast],
  );

  const handleFilesRename = useCallback(
    (oldPath: string, newPath: string) => {
      void (async () => {
        const wsId = workspaceIdRef.current;
        if (wsId) {
          await renameDataEntry(wsId, oldPath, newPath);
        }
        const oldPrefix = `${oldPath}/`;
        const newPrefix = `${newPath}/`;
        setVirtualFiles((prev) =>
          prev.map((f) => {
            if (f.path === oldPath) return { ...f, path: newPath };
            if (f.path.startsWith(oldPrefix)) {
              return { ...f, path: `${newPrefix}${f.path.slice(oldPrefix.length)}` };
            }
            return f;
          }),
        );
        showToast(`Renamed to "${newPath}".`);
      })();
    },
    [showToast],
  );

  const handleFilesCreateFolder = useCallback(
    (parentPath: string, name: string) => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      setVirtualFiles((prev) => {
        if (prev.some((f) => f.path === path)) return prev;
        return [...prev, { path, size: 0, isFolder: true }];
      });
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(path);
        if (parentPath) next.add(parentPath);
        return next;
      });
      const wsId = workspaceIdRef.current;
      if (wsId) void upsertDataFolder(wsId, path);
    },
    [],
  );

  const handleFilesToggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleFilesMove = useCallback(
    (sourcePath: string, destFolderPath: string) => {
      void (async () => {
        const leaf = sourcePath.split("/").pop() ?? sourcePath;
        const newPath = destFolderPath ? `${destFolderPath}/${leaf}` : leaf;
        if (newPath === sourcePath) return;
        const wsId = workspaceIdRef.current;
        if (wsId) {
          await renameDataEntry(wsId, sourcePath, newPath);
        }
        const oldPrefix = `${sourcePath}/`;
        const newPrefix = `${newPath}/`;
        setVirtualFiles((prev) =>
          prev.map((f) => {
            if (f.path === sourcePath) return { ...f, path: newPath };
            if (f.path.startsWith(oldPrefix)) {
              return { ...f, path: `${newPrefix}${f.path.slice(oldPrefix.length)}` };
            }
            return f;
          }),
        );
        if (destFolderPath) {
          setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.add(destFolderPath);
            return next;
          });
        }
      })();
    },
    [],
  );
  useEffect(() => {
    let cancelled = false;

    if (editorHostRef.current && !editorRef.current) {
      // Read persisted settings directly so the editor mounts with the
      // same values the surrounding UI was hydrated with — otherwise the
      // editor would briefly render with default theme/wrapping and then
      // flip to the saved values on the next effect.
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ?? "lucario";
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";

      const themeComp = new Compartment();
      const wrapComp = new Compartment();
      const languageComp = new Compartment();

      // Bridge the runtime adapter's `complete()` into v6 autocompletion.
      // The runtime returns `{ list, replaceLength }` describing the prefix
      // under the cursor; we translate that into a v6 `CompletionResult`.
      const completionSource = async (
        ctx: CompletionContext,
      ): Promise<CompletionResult | null> => {
        const rt = runtimeRef.current;
        if (!rt || typeof rt.complete !== "function") return null;
        const line = ctx.state.doc.lineAt(ctx.pos);
        const col = ctx.pos - line.from;
        try {
          const res = await rt.complete(line.text, col);
          if (!res || res.list.length === 0) return null;
          return {
            from: ctx.pos - res.replaceLength,
            to: ctx.pos,
            options: res.list.map((label) => ({ label, type: "variable" })),
            validFor: /^[\w$]*$/,
          };
        } catch {
          return null;
        }
      };

      // Listen for doc changes to persist + auto-trigger completion on `.`,
      // matching the v5 inputRead "type a dot" UX.
      // The persist target is the *currently active file*: contents
      // land in the file's in-memory dirty buffer (synchronous) and in
      // OPFS via an async queue. We deliberately read the active file
      // and workspace ids from refs so tab switches don't require
      // rebuilding the editor extensions.
      const persistListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (!suppressPersistRef.current) {
          const fileId = activeFileIdRef.current;
          const wsId = workspaceIdRef.current;
          if (fileId) {
            const content = update.state.doc.toString();
            updateDirtyBuffer(fileId, content);
            if (wsId) opfsWriteFile(wsId, fileId, content);
          }
        }
        for (const tr of update.transactions) {
          if (!tr.isUserEvent("input.type")) continue;
          let inserted = "";
          tr.changes.iterChanges((_fA, _tA, _fB, _tB, ins) => {
            inserted += ins.toString();
          });
          if (inserted === ".") {
            startCompletion(update.view);
          }
        }
      });

      const view = new EditorView({
        // The editor mounts before the workspace bootstrap resolves; we
        // start with the legacy localStorage entry (if any) for a
        // zero-flash first paint, then the workspace effect dispatches
        // a doc replacement with whatever the OPFS read returned.
        doc:
          localStorage.getItem(storageKey("code")) ??
          adapter.examples[0]?.code ??
          "",
        parent: editorHostRef.current,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lineNumbersExt(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          rectangularSelection(),
          crosshairCursor(),
          EditorState.tabSize.of(2),
          indentUnit.of("  "),
          autocompletion({
            override: [completionSource],
            activateOnTyping: false,
            closeOnBlur: true,
          }),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                runRef.current();
                return true;
              },
            },
            {
              key: "Ctrl-Space",
              run: (v) => {
                startCompletion(v);
                return true;
              },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...completionKeymap,
            indentWithTab,
          ]),
          languageComp.of([]),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          persistListener,
        ],
      });

      editorRef.current = view;
      themeCompRef.current = themeComp;
      wrapCompRef.current = wrapComp;

      void loadLanguage(adapter.codeMirrorMode).then((ext) => {
        if (ext && editorRef.current === view) {
          view.dispatch({ effects: languageComp.reconfigure(ext) });
        }
      });
    }

    (async () => {
      try {
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
      editorRef.current?.destroy();
      editorRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
    };
    // editorTheme is intentionally only consumed for the *initial* CM theme;
    // subsequent changes are pushed via Compartment reconfigure below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // Push editor-theme changes into CodeMirror after init.
  useEffect(() => {
    if (editorRef.current && themeCompRef.current) {
      editorRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(editorTheme)),
      });
    }
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  // Sync the CodeMirror document to the active file's dirty buffer.
  // Runs whenever the active file id changes (tab switch) or the
  // workspace finishes bootstrapping. The persist listener is suppressed
  // during the replacement so the change isn't echoed back as a "save".
  useEffect(() => {
    if (!workspaceReady) return;
    if (activeTabId === SETTINGS_TAB_ID) return;
    const view = editorRef.current;
    if (!view) return;
    if (!activeFileId) return;
    const target = dirtyBuffersRef.current.get(activeFileId) ?? "";
    if (view.state.doc.toString() === target) return;
    suppressPersistRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: target },
        // Drop selection to the start so it's never out of range.
        selection: { anchor: 0 },
      });
    } finally {
      suppressPersistRef.current = false;
    }
  }, [activeFileId, activeTabId, workspaceReady]);

  // Push word-wrap changes into CodeMirror after init.
  useEffect(() => {
    if (editorRef.current && wrapCompRef.current) {
      editorRef.current.dispatch({
        effects: wrapCompRef.current.reconfigure(
          wordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }
  }, [wordWrap]);

  // Update the editor font size via CSS variable.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.requestMeasure();
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
      setStoredEditorTheme(t);
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

  // Restore the editor settings (font size, theme, word wrap, clear-
  // before-run, output font size) to their built-in defaults. Drops the
  // matching localStorage entries so a future page load also starts
  // from defaults. The user's saved code, examples, and any other
  // unrelated localStorage entries are intentionally left alone — the
  // separate "Clear all localStorage" action handles those.
  const restoreDefaultSettings = useCallback(() => {
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    setFontSize(D.fontSize);
    setOutputFontSize(D.outputFontSize);
    setOutputFontSizeEnabled(D.outputFontSizeEnabled);
    setEditorTheme(D.editorTheme);
    setWordWrap(D.wordWrap);
    setClearBeforeRun(D.clearBeforeRun);
    showToast("Default settings restored.");
  }, [
    setFontSize,
    setOutputFontSize,
    setOutputFontSizeEnabled,
    setEditorTheme,
    setWordWrap,
    setClearBeforeRun,
    showToast,
  ]);

  // Clear every localStorage entry (across all playgrounds) and reload
  // so the freshly cleared state takes effect everywhere — including
  // saved editor contents, theme, and any future per-playground keys.
  // Confirmation is handled by a Base UI AlertDialog rendered below;
  // by the time this callback fires the user has already opted in.
  const clearAllLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      // localStorage might be unavailable in private mode; continue to
      // the reload anyway so the user at least gets a fresh page.
    }
    window.location.reload();
  }, []);

  // Nuclear wipe: clears every storage surface (localStorage, OPFS,
  // IndexedDB, caches) before reloading. Backed by the shared
  // `clearAllLocalData` helper so every playground gets the same
  // behaviour. Best-effort: failures inside one surface don't block
  // the others, and we always reload.
  const clearAllLocalData = useCallback(() => {
    void (async () => {
      try {
        const mod = await import("./storage/clearAllData");
        await mod.clearAllLocalData();
      } catch {
        /* fall through to reload regardless */
      }
      window.location.reload();
    })();
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────
  const runCode = useCallback(async () => {
    const editor = editorRef.current;
    const rt = runtimeRef.current;
    if (!editor || !rt) return;
    const code = editor.state.doc.toString().trim();
    if (!code) return;
    // Snapshot the active file id at run start: even if the user
    // switches tabs mid-run, the outputs should be routed to the file
    // whose code we actually executed.
    const targetFileId = activeFileIdRef.current;
    if (!targetFileId) return;

    setStatusState("running");

    if (clearBeforeRun) {
      setOutputsForFile(targetFileId, []);
    }

    const t0 = performance.now();
    const collected: Omit<OutputCell, "id" | "elapsed">[] = [];
    const firstId = outputCounter.current + 1;
    newRunFirstIdRef.current = firstId;
    try {
      await rt.run(code, (cell) => collected.push(cell));
      const elapsed = `${((performance.now() - t0) / 1000).toFixed(2)}s`;
      setOutputsForFile(targetFileId, (prev) => [
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
      // Keep the running overlay visible long enough for the 180ms CSS
      // transition to complete and be perceptible to the user.
      const waitMs = MIN_ANIMATION_MS - (performance.now() - t0);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      setStatusState("ready");
    } catch (err) {
      const elapsed = `${((performance.now() - t0) / 1000).toFixed(2)}s`;
      const msg = err instanceof Error ? err.message : String(err);
      setOutputsForFile(targetFileId, (prev) => [
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
  }, [clearBeforeRun, setOutputsForFile, showToast]);

  // Keep a fresh closure available for the CodeMirror keymap.
  useEffect(() => {
    runRef.current = () => {
      void runCode();
    };
  }, [runCode]);

  const clearOutput = useCallback(() => {
    const fileId = activeFileIdRef.current;
    if (fileId) clearOutputsForFile(fileId);
    if (loaded) {
      setStatusState("ready");
    }
  }, [clearOutputsForFile, loaded]);

  // ─── File tab management ────────────────────────────────────────────────

  /** Flush the current editor doc into the active file's dirty buffer
   *  + OPFS, so the contents survive a tab switch. */
  const flushActiveFileToBuffer = useCallback(() => {
    const view = editorRef.current;
    const fileId = activeFileIdRef.current;
    const wsId = workspaceIdRef.current;
    if (!view || !fileId) return;
    const content = view.state.doc.toString();
    updateDirtyBuffer(fileId, content);
    if (wsId) opfsWriteFile(wsId, fileId, content);
  }, [updateDirtyBuffer]);

  const selectTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTabId) return;
      flushActiveFileToBuffer();
      if (tabId === SETTINGS_TAB_ID) {
        setActiveTabId(SETTINGS_TAB_ID);
        return;
      }
      setActiveTabId(tabId);
      setActiveFileId(tabId);
      activeFileIdRef.current = tabId;
    },
    [activeTabId, flushActiveFileToBuffer, setActiveFileId, setActiveTabId],
  );

  const addNewFile = useCallback(() => {
    flushActiveFileToBuffer();
    const wsId = workspaceIdRef.current;
    const id = newFileId();
    const filename = suggestNextFilename(adapter, filesRef.current);
    const newFile: PlaygroundFile = {
      id,
      filename,
      pristineFilename: filename,
    };
    const next = [...filesRef.current, newFile];
    filesRef.current = next;
    setFiles(next);
    updateDirtyBuffer(id, "");
    if (wsId) opfsWriteFile(wsId, id, "");
    activeFileIdRef.current = id;
    setActiveFileId(id);
    setActiveTabId(id);
  }, [
    adapter,
    flushActiveFileToBuffer,
    setActiveFileId,
    setActiveTabId,
    setFiles,
    updateDirtyBuffer,
  ]);

  /** Open the Settings tab, or focus it if already open. The settings
   *  panel renders inline inside the editor pane when active. */
  const openSettingsTab = useCallback(() => {
    flushActiveFileToBuffer();
    setSettingsOpen(true);
    setActiveTabId(SETTINGS_TAB_ID);
  }, [flushActiveFileToBuffer, setActiveTabId]);

  /** Close the Settings tab and return focus to the previously-active
   *  code file. Used by the TabBar's close affordance. */
  const closeSettingsTab = useCallback(() => {
    setSettingsOpen(false);
    if (activeTabId === SETTINGS_TAB_ID) {
      const targetId = activeFileIdRef.current;
      if (targetId) {
        setActiveTabId(targetId);
      } else if (filesRef.current.length > 0) {
        setActiveTabId(filesRef.current[0].id);
      }
    }
  }, [activeTabId, setActiveTabId]);

  const closeFileTab = useCallback(
    (fileId: string) => {
      if (fileId === SETTINGS_TAB_ID) {
        closeSettingsTab();
        return;
      }
      const current = filesRef.current;
      if (current.length <= 1) {
        // Refuse to close the last file — the playground needs at
        // least one editor target. Could be relaxed later by recreating
        // a default file on close.
        showToast("Can't close the last file.", "warn");
        return;
      }
      const wsId = workspaceIdRef.current;
      const remaining = current.filter((f) => f.id !== fileId);
      filesRef.current = remaining;
      setFiles(remaining);
      clearDirtyBuffer(fileId);
      clearOutputsForFile(fileId);
      if (wsId) void opfsDeleteFile(wsId, fileId);
      if (activeFileIdRef.current === fileId) {
        // Pick a neighbour: prefer the tab that visually replaces the
        // closed one — i.e. the previous tab in tab order, falling back
        // to the first remaining tab.
        const closedIdx = current.findIndex((f) => f.id === fileId);
        const next =
          remaining[Math.max(0, Math.min(closedIdx - 1, remaining.length - 1))]
            ?.id ?? remaining[0].id;
        activeFileIdRef.current = next;
        setActiveFileId(next);
        setActiveTabId(next);
      }
    },
    [
      clearDirtyBuffer,
      clearOutputsForFile,
      closeSettingsTab,
      setActiveFileId,
      setActiveTabId,
      setFiles,
      showToast,
    ],
  );

  const renameFileTab = useCallback(
    (fileId: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const target = filesRef.current.find((f) => f.id === fileId);
      if (!target) return;
      // Two input shapes converge here:
      //  - Full path (contains "/") — replace the workspace path
      //    outright (e.g. user types `src/utils.py` to move the
      //    file).
      //  - Leaf only (no "/") — preserve the file's existing parent
      //    directory so a tab-strip rename of `src/foo.py` to
      //    `bar.py` becomes `src/bar.py`, not `bar.py` at the root.
      let nextPath: string;
      if (trimmed.includes("/")) {
        nextPath = trimmed;
      } else {
        const lastSlash = target.filename.lastIndexOf("/");
        const parentDir =
          lastSlash >= 0 ? target.filename.slice(0, lastSlash + 1) : "";
        nextPath = `${parentDir}${trimmed}`;
      }
      if (nextPath === target.filename) return;
      // Refuse to overwrite another tab at the same path.
      if (
        filesRef.current.some(
          (f) => f.id !== fileId && f.filename === nextPath,
        )
      ) {
        showToast(
          `A file at "${nextPath}" already exists in this workspace.`,
          "warn",
        );
        return;
      }
      const next = filesRef.current.map((f) =>
        f.id === fileId ? { ...f, filename: nextPath } : f,
      );
      filesRef.current = next;
      setFiles(next);
    },
    [setFiles, showToast],
  );

  /** Reorder the file tabs after a drag-and-drop drop. The generic
   *  TabBar hands us the new tab order (TabDescriptors); we project it
   *  back onto the `files` array via id lookup so the manifest stays
   *  authoritative. */
  const reorderFileTabs = useCallback(
    (nextDescriptors: TabDescriptor[]) => {
      const byId = new Map(filesRef.current.map((f) => [f.id, f]));
      const next: PlaygroundFile[] = [];
      for (const d of nextDescriptors) {
        const f = byId.get(d.id);
        if (f) next.push(f);
      }
      // Defensive: ensure we didn't drop any files (e.g. a transient
      // mismatch between descriptors and the file list).
      if (next.length !== filesRef.current.length) return;
      filesRef.current = next;
      setFiles(next);
    },
    [setFiles],
  );

  // ─── Merge workspace tabs into the Files pane ─────────────────────────
  //
  // The Files pane shows two distinct kinds of entries:
  //   1. Workspace code files — one per tab in the tab strip
  //      (e.g. `main.py`, `src/utils.py`). Their content lives in
  //      the per-file dirty buffer + OPFS.
  //   2. User data files — anything uploaded via the panel
  //      (e.g. `data.csv`, `images/cat.png`). Their content lives in
  //      OPFS under `data/`.
  //
  // Code files may live at any path (root or inside folders) — the
  // tab strip just shows the leaf. If a data file's path collides
  // with a code file's path, the code file wins (it's the live
  // editor target) and the data file is hidden — uploads already
  // enforce uniqueness within `data/` so this only matters for the
  // cross-namespace edge case.

  const codeFilePaths = useMemo(
    () => new Set(files.map((f) => f.filename)),
    [files],
  );

  const codeFileIdByPath = useMemo(
    () => new Map(files.map((f) => [f.filename, f.id])),
    [files],
  );

  const mergedVirtualFiles = useMemo<VirtualFile[]>(() => {
    const codeEntries: VirtualFile[] = files.map((f) => ({
      path: f.filename,
      // Byte-size estimate from the dirty buffer. Approximate (string
      // length, not UTF-8 byte length) but accurate enough for the
      // pane's size column — the same approximation FilesPanel uses
      // everywhere else.
      size: dirtyBuffers.get(f.id)?.length ?? 0,
      isFolder: false,
    }));
    const filteredData = virtualFiles.filter(
      (f) => !codeFilePaths.has(f.path),
    );
    return [...codeEntries, ...filteredData];
  }, [files, dirtyBuffers, virtualFiles, codeFilePaths]);

  /** Resolves the workspace tab id for a Files-pane path, if any. */
  const tabIdForFilesPath = useCallback(
    (path: string): string | null => codeFileIdByPath.get(path) ?? null,
    [codeFileIdByPath],
  );

  const mergedHandleFilesDownload = useCallback(
    (path: string) => {
      const tabId = tabIdForFilesPath(path);
      if (tabId) {
        // Code file download: serialise the (possibly unsaved) dirty
        // buffer into a Blob. Falls back to an empty file when the
        // buffer hasn't been populated yet.
        const content = dirtyBuffersRef.current.get(tabId) ?? "";
        try {
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = path.split("/").pop() ?? path;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Download failed: ${msg}`, "warn");
        }
        return;
      }
      handleFilesDownload(path);
    },
    [handleFilesDownload, showToast, tabIdForFilesPath],
  );

  const mergedHandleFilesDelete = useCallback(
    (path: string) => {
      const tabId = tabIdForFilesPath(path);
      if (tabId) {
        // Delete-from-Files-pane on a code file maps to "close the
        // tab". `closeFileTab` already refuses to drop the last
        // remaining file (the editor needs at least one target) and
        // surfaces its own toast.
        closeFileTab(tabId);
        return;
      }
      handleFilesDelete(path);
    },
    [closeFileTab, handleFilesDelete, tabIdForFilesPath],
  );

  const mergedHandleFilesRename = useCallback(
    (oldPath: string, newPath: string) => {
      const tabId = tabIdForFilesPath(oldPath);
      if (tabId) {
        // FilesPanel hands us the already-reconstructed full path
        // (parent dir + new leaf). `renameFileTab` enforces collision
        // detection across the workspace.
        renameFileTab(tabId, newPath);
        return;
      }
      handleFilesRename(oldPath, newPath);
    },
    [handleFilesRename, renameFileTab, tabIdForFilesPath],
  );

  const mergedHandleFilesMove = useCallback(
    (sourcePath: string, destFolderPath: string) => {
      const tabId = tabIdForFilesPath(sourcePath);
      if (tabId) {
        // Code file move: relocate to the destination folder while
        // preserving the leaf filename. `renameFileTab` handles the
        // collision check.
        const leaf = sourcePath.split("/").pop() ?? sourcePath;
        const newPath = destFolderPath ? `${destFolderPath}/${leaf}` : leaf;
        if (newPath === sourcePath) return;
        renameFileTab(tabId, newPath);
        if (destFolderPath) {
          setExpandedFolders((prev) => {
            const next = new Set(prev);
            next.add(destFolderPath);
            return next;
          });
        }
        return;
      }
      handleFilesMove(sourcePath, destFolderPath);
    },
    [handleFilesMove, renameFileTab, tabIdForFilesPath],
  );

  // Apply an example to the editor immediately. Use `requestExample` for
  // user-initiated picks so we can prompt before discarding work.
  const applyExample = useCallback(
    (ex: ExampleSnippet) => {
      const view = editorRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: ex.code },
        });
        view.focus();
      }
      setMobileTab(MOBILE_EDITOR_TAB);
      showToast(`Loaded ${ex.title} in the editor.`);
    },
    [showToast],
  );

  const requestExample = useCallback(
    (ex: ExampleSnippet) => {
      const current = editorRef.current?.state.doc.toString().trim() ?? "";
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

  // Wraps a package's `example` snippet in the same ExampleSnippet shape
  // the existing requestExample flow expects, so the discard-confirm
  // dialog can be reused without duplication. Closes the packages
  // drawer first so the dialog isn't covered by the open Sheet.
  const requestPackageExample = useCallback(
    (pkg: PackageInfo) => {
      if (!pkg.example) return;
      setPackagesOpen(false);
      requestExample({
        key: `pkg-example-${pkg.name}`,
        title: `${pkg.name} example`,
        desc: pkg.desc,
        code: pkg.example,
      });
    },
    [requestExample],
  );

  const importPackage = useCallback(
    (pkg: PackageInfo) => {
      const editor = editorRef.current;
      if (!editor) return;
      const current = editor.state.doc.toString();
      if (adapter.hasImport(current, pkg.name)) {
        setMobileTab(MOBILE_EDITOR_TAB);
        showToast(`${pkg.name} is already imported.`, "warn");
        return;
      }
      const snippet = adapter.importSnippet(pkg.name);
      const next = current.length === 0 ? `${snippet}\n` : `${snippet}\n${current}`;
      // Position the cursor right after the inserted import line so the
      // user lands back where work in progress can continue. Line 2,
      // column 0 in v6's 1-indexed line model = start of second line.
      const secondLineStart =
        editor.state.doc.lines >= 2
          ? editor.state.doc.line(2).from
          : next.length;
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: next },
        selection: { anchor: secondLineStart },
      });
      setMobileTab(MOBILE_EDITOR_TAB);
      showToast(`Imported ${pkg.name}.`);
    },
    [adapter, showToast],
  );

  const exportCode = useCallback(
    (format: ExportFormat) => {
      const code = editorRef.current?.state.doc.toString() ?? "";
      const blob = new Blob([code], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // When the active file has been renamed, prefer its filename
      // base over the adapter's generic export name so a user who
      // edited "utils.py" downloads "utils.py" rather than "script.py".
      const active = filesRef.current.find(
        (f) => f.id === activeFileIdRef.current,
      );
      // Use the leaf of the workspace path (`"src/main.py"` →
      // `"main"`) so an export of `src/utils.py` downloads
      // `utils.<ext>` rather than `src/utils.<ext>`.
      const activeLeaf = active
        ? active.filename.split("/").pop() ?? active.filename
        : "";
      const base = activeLeaf
        ? activeLeaf.replace(/\.[^.]+$/, "")
        : adapter.exportBaseFilename;
      a.download = `${base || adapter.exportBaseFilename}.${format.extension}`;
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
    const code = editorRef.current?.state.doc.toString() ?? "";
    if (!code) {
      showToast("Editor is empty.", "warn");
      return;
    }
    void copyToClipboard(code, "Code");
  }, [copyToClipboard, showToast]);

  const handleFormatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    const code = editorRef.current?.state.doc.toString() ?? "";
    setIsFormatting(true);
    try {
      const formatted = await adapter.formatCode(code);
      if (formatted === code) {
        showToast("Already formatted — nothing to change.");
        return;
      }
      editorRef.current?.dispatch({
        changes: {
          from: 0,
          to: editorRef.current.state.doc.length,
          insert: formatted,
        },
      });
      showToast("Code formatted.", "info");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      showToast(
        reason ? `Formatting failed: ${reason}` : "Formatting failed.",
        "warn",
      );
    } finally {
      setIsFormatting(false);
    }
  }, [adapter, showToast]);

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

  // Rotate through the witty loading messages while the runtime is
  // still initialising. The cadence is intentionally a touch slower than
  // the moving-text animation so the text isn't constantly twitching.
  // We always start at index 0 so the SSR HTML and the first client
  // paint match (avoiding a hydration mismatch). The random offset is
  // captured once on mount in a ref and applied on the first interval
  // tick, so subsequent effect re-runs (e.g. when statusState flips)
  // don't re-roll the start position.
  const [quipIndex, setQuipIndex] = useState<number>(0);
  const quipSeedRef = useRef<number>(-1);
  useEffect(() => {
    if (quipSeedRef.current < 0) {
      quipSeedRef.current = Math.floor(Math.random() * LOADING_QUIPS.length);
    }
  }, []);
  useEffect(() => {
    if (loaded || statusState === "error") return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      // First tick: jump to the random starting quip captured on mount
      // so different page loads don't all begin with the same line.
      // Subsequent ticks advance by one for predictable rotation.
      setQuipIndex(
        tick === 1
          ? Math.max(0, quipSeedRef.current)
          : (prev) => (prev + 1) % LOADING_QUIPS.length,
      );
    }, 2200);
    return () => {
      window.clearInterval(id);
    };
  }, [loaded, statusState]);

  const fileTabDescriptors = useMemo<TabDescriptor[]>(
    () => {
      const list: TabDescriptor[] = files.map((f) => {
        // PlaygroundFile.filename may be a multi-segment path
        // (e.g. "src/utils.py"); the tab strip is too narrow for the
        // full path, so we show only the leaf and let the Files pane
        // expose the rest.
        const leaf = f.filename.split("/").pop() ?? f.filename;
        return {
          id: f.id,
          kind: "code" as const,
          label: leaf,
          icon: <FileCode2 size={11} aria-hidden="true" />,
          closeable: files.length > 1,
          renameable: true,
        };
      });
      if (settingsOpen) {
        list.push({
          id: SETTINGS_TAB_ID,
          kind: "settings",
          label: "Settings",
          icon: <Settings size={11} aria-hidden="true" />,
          closeable: true,
          renameable: false,
        });
      }
      return list;
    },
    [files, settingsOpen],
  );

  const capabilitiesBlurb = useMemo(
    () => buildCapabilitiesBlurb(adapter.outputCapabilities),
    [adapter.outputCapabilities],
  );

  return (
    <div className="pg-root">
      {showLoadingOverlay && (
        <div
          className={`pyodide-loading${
            statusState === "error" ? " has-error" : ""
          }${loadingFading ? " hidden" : ""}`}
          role="status"
          aria-live="polite"
        >
          {/* Hero — gigantic horizontally-moving title with faded
              left/right edges. The text repeats so there is always
              something visible mid-translate, and the surrounding mask
              fades the strip into the background at both ends. */}
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              <span className="loading-hero-text">
                {adapter.displayName}
              </span>
              <span className="loading-hero-text">
                {adapter.displayName}
              </span>
              <span className="loading-hero-text">
                {adapter.displayName}
              </span>
              <span className="loading-hero-text">
                {adapter.displayName}
              </span>
            </div>
          </div>

          {/* Witty quip + indeterminate progress bar pinned to the
              bottom of the viewport. On error we surface the failure
              message instead of the rotating quip. */}
          <div className="loading-bottom">
            <div className="loading-quip">
              {statusState === "error"
                ? loadingMessage
                : LOADING_QUIPS[quipIndex]}
            </div>
            <div className="loading-bar-wrap">
              <div className="loading-bar" />
            </div>
          </div>
        </div>
      )}

      <div className="pg-app">
        <header className="pg-header">
          <div className="logo">
            <Link href="/" aria-label="Dataslope home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo" />
            </Link>
            <Link href="/" className="brand-name">Dataslope</Link>
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
                {(() => {
                  const Icon = PLAYGROUND_ICONS[adapter.id];
                  const factor = PLAYGROUND_ICON_SIZE_FACTOR[adapter.id] ?? 1;
                  return Icon ? (
                    <span
                      className="playground-switcher-lang-icon"
                      style={{ color: "var(--text)" }}
                      aria-hidden="true"
                    >
                      <Icon size={Math.round(16 * factor)} />
                    </span>
                  ) : null;
                })()}
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
                <Select.Positioner sideOffset={0} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup">
                    {PLAYGROUNDS.map((p) => {
                      const Icon = PLAYGROUND_ICONS[p.id];
                      const factor = PLAYGROUND_ICON_SIZE_FACTOR[p.id] ?? 1;
                      return (
                        <Select.Item
                          key={p.id}
                          value={p.id}
                          className="bui-select-item"
                        >
                          {Icon && (
                            <span
                              className="bui-select-item-icon"
                              aria-hidden="true"
                            >
                              <Icon size={Math.round(16 * factor)} />
                            </span>
                          )}
                          <Select.ItemText>{p.label}</Select.ItemText>
                        </Select.Item>
                      );
                    })}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />

          {/* Workspace badge: visible on every breakpoint. Clicking opens
              a popover with this playground's recent workspaces and a
              "Manage" entry into the full workspace drawer. */}
          {workspaceReady && (
            <WorkspaceBadge
              playgroundId={adapter.id}
              activeWorkspaceId={workspaceId}
              activeWorkspaceName={workspaceName}
            />
          )}

          {/* Desktop action group — hidden on narrow viewports in favour
              of the consolidated mobile menu below. */}
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Examples"
                aria-label="Examples"
              >
                <Library size={14} aria-hidden="true" />
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
                <ArrowDownToLine size={14} aria-hidden="true" />
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
                        <div className="export-item-text">
                          <div className="ex-title">
                            {fmt.label}
                            <span className="ext-badge">.{fmt.extension}</span>
                          </div>
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
                <Package size={14} aria-hidden="true" />
                <span className="btn-label">Packages</span>
              </button>
            )}

            <Popover.Root>
              <Popover.Trigger
                className="header-btn icon-only"
                title="Runtime info"
                aria-label="Runtime info"
              >
                <FaInfo size={13} aria-hidden="true" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup info-popover">
                    <RuntimeInfoContent info={adapter.runtimeInfo} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>

          {/* Mobile-only consolidated menu — replaces the header buttons
              on narrow viewports. Base UI Drawer keeps the main menu and
              nested sections as bottom sheets so they stay within the
              viewport on narrow phones. */}
          <Drawer.Root
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            swipeDirection="down"
          >
            <Drawer.Trigger
              className="header-btn icon-only mobile-only mobile-menu-btn"
              title="Menu"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Backdrop className="pkg-overlay mobile-menu-backdrop" />
              <Drawer.Viewport className="mobile-drawer-viewport">
                <Drawer.Popup
                  className="mobile-menu-drawer"
                  aria-label="Menu"
                >
                  <Drawer.Content>
                    <div className="mobile-menu-handle" aria-hidden="true" />
                    <div className="mobile-menu-drawer-header">
                      <Drawer.Title className="mobile-menu-drawer-title">
                        Menu
                      </Drawer.Title>
                      <Drawer.Close
                        className="settings-close"
                        aria-label="Close menu"
                      >
                        ✕
                      </Drawer.Close>
                    </div>
                    <div className="mobile-menu-drawer-body">
                      <Drawer.Root swipeDirection="down">
                        <Drawer.Trigger className="mobile-menu-action">
                          <span>Examples</span>
                          <span className="mobile-menu-chev" aria-hidden="true">
                            ›
                          </span>
                        </Drawer.Trigger>
                        <Drawer.Portal>
                          <Drawer.Backdrop
                            className="pkg-overlay mobile-menu-backdrop"
                            forceRender
                          />
                          <Drawer.Viewport className="mobile-drawer-viewport">
                            <Drawer.Popup
                              className="mobile-menu-drawer mobile-menu-nested-drawer"
                              aria-label="Examples"
                            >
                              <Drawer.Content>
                                <div className="mobile-menu-handle" aria-hidden="true" />
                                <div className="mobile-menu-drawer-header">
                                  <Drawer.Title className="mobile-menu-drawer-title">
                                    Examples
                                  </Drawer.Title>
                                  <Drawer.Close
                                    className="settings-close"
                                    aria-label="Close examples"
                                  >
                                    ✕
                                  </Drawer.Close>
                                </div>
                                <div className="mobile-menu-drawer-body">
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
                              </Drawer.Content>
                            </Drawer.Popup>
                          </Drawer.Viewport>
                        </Drawer.Portal>
                      </Drawer.Root>

                      <Drawer.Root swipeDirection="down">
                        <Drawer.Trigger className="mobile-menu-action">
                          <span>Export</span>
                          <span className="mobile-menu-chev" aria-hidden="true">
                            ›
                          </span>
                        </Drawer.Trigger>
                        <Drawer.Portal>
                          <Drawer.Backdrop
                            className="pkg-overlay mobile-menu-backdrop"
                            forceRender
                          />
                          <Drawer.Viewport className="mobile-drawer-viewport">
                            <Drawer.Popup
                              className="mobile-menu-drawer mobile-menu-nested-drawer"
                              aria-label="Export"
                            >
                              <Drawer.Content>
                                <div className="mobile-menu-handle" aria-hidden="true" />
                                <div className="mobile-menu-drawer-header">
                                  <Drawer.Title className="mobile-menu-drawer-title">
                                    Export
                                  </Drawer.Title>
                                  <Drawer.Close
                                    className="settings-close"
                                    aria-label="Close export"
                                  >
                                    ✕
                                  </Drawer.Close>
                                </div>
                                <div className="mobile-menu-drawer-body">
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
                                      <div className="export-item-text">
                                        <div className="ex-title">
                                          {fmt.label}
                                          <span className="ext-badge">.{fmt.extension}</span>
                                        </div>
                                        <div className="ex-desc">
                                          Download as .{fmt.extension}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </Drawer.Content>
                            </Drawer.Popup>
                          </Drawer.Viewport>
                        </Drawer.Portal>
                      </Drawer.Root>

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

                      <Drawer.Root swipeDirection="down">
                        <Drawer.Trigger className="mobile-menu-action">
                          <span>Information</span>
                          <span className="mobile-menu-chev" aria-hidden="true">
                            ›
                          </span>
                        </Drawer.Trigger>
                        <Drawer.Portal>
                          <Drawer.Backdrop
                            className="pkg-overlay mobile-menu-backdrop"
                            forceRender
                          />
                          <Drawer.Viewport className="mobile-drawer-viewport">
                            <Drawer.Popup
                              className="mobile-menu-drawer mobile-menu-nested-drawer"
                              aria-label="Information"
                            >
                              <Drawer.Content>
                                <div className="mobile-menu-handle" aria-hidden="true" />
                                <div className="mobile-menu-drawer-header">
                                  <Drawer.Title className="mobile-menu-drawer-title">
                                    Information
                                  </Drawer.Title>
                                  <Drawer.Close
                                    className="settings-close"
                                    aria-label="Close information"
                                  >
                                    ✕
                                  </Drawer.Close>
                                </div>
                                <div className="mobile-menu-drawer-body info-popover">
                                  <RuntimeInfoContent info={adapter.runtimeInfo} />
                                </div>
                              </Drawer.Content>
                            </Drawer.Popup>
                          </Drawer.Viewport>
                        </Drawer.Portal>
                      </Drawer.Root>

                      <button
                        type="button"
                        className="mobile-menu-action"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openSettingsTab();
                        }}
                      >
                        <span>Settings</span>
                      </button>
                    </div>
                  </Drawer.Content>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          </Drawer.Root>
        </header>

        <PackagesDrawer
          open={packagesOpen}
          packages={adapter.packages}
          footer={adapter.packagesFooter}
          onClose={() => setPackagesOpen(false)}
          onPickPackage={importPackage}
          onPickPackageExample={requestPackageExample}
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

        {/* Confirm restoring built-in defaults — non-destructive but
            still nukes any custom settings, so confirm first. */}
        <AlertDialog.Root
          open={confirmRestoreOpen}
          onOpenChange={setConfirmRestoreOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Restore default settings?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will reset this playground&apos;s editor font size, word wrap,
                run/output preferences, and the shared editor theme to their
                built-in defaults. Your saved code is not affected.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    restoreDefaultSettings();
                    setConfirmRestoreOpen(false);
                  }}
                >
                  Restore defaults
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        {/* Confirm wiping every localStorage entry across all playgrounds —
            this is destructive (saved code, themes, settings, …) so the
            confirmation lives in a Base UI AlertDialog rather than the
            native window.confirm to match the rest of the UI. */}
        <AlertDialog.Root
          open={confirmClearStorageOpen}
          onOpenChange={setConfirmClearStorageOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Clear all localStorage data?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will permanently delete every saved setting and code
                snippet across <strong>all playgrounds</strong>. The page
                will reload immediately. This can&rsquo;t be undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    clearAllLocalStorage();
                  }}
                >
                  Clear &amp; reload
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        {/* Nuclear wipe: drops localStorage AND OPFS AND IndexedDB AND
            caches. Mirrors the lighter "Clear all localStorage" dialog
            but with stronger language so the user understands they're
            also losing every workspace, database, and uploaded file. */}
        <AlertDialog.Root
          open={confirmClearAllDataOpen}
          onOpenChange={setConfirmClearAllDataOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop className="confirm-backdrop" />
            <AlertDialog.Popup className="confirm-popup">
              <AlertDialog.Title className="confirm-title">
                Clear all local data?
              </AlertDialog.Title>
              <AlertDialog.Description className="confirm-desc">
                This will permanently delete every saved setting, code
                snippet, <strong>workspace</strong>, persisted{" "}
                <strong>database</strong>, and uploaded{" "}
                <strong>data file</strong> across{" "}
                <strong>all playgrounds</strong> — including localStorage,
                OPFS, IndexedDB, and any cached assets. The page will
                reload immediately. This can&rsquo;t be undone.
              </AlertDialog.Description>
              <div className="confirm-actions">
                <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </AlertDialog.Close>
                <AlertDialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    clearAllLocalData();
                  }}
                >
                  Clear &amp; reload
                </AlertDialog.Close>
              </div>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>

        <div className="pg-body">
          <nav className="pg-icon-sidebar" aria-label="Panel navigation">
            <div className="pg-icon-sidebar-top">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={150}
                  closeDelay={100}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className="pg-icon-sidebar-btn active"
                      aria-label="Editor"
                    >
                      <Code2 size={16} aria-hidden="true" />
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner sideOffset={6} side="right">
                    <Popover.Popup className="bui-popup pane-btn-popover">
                      Editor
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
              {/* Files — toggles the virtual-filesystem sidebar panel. */}
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={150}
                  closeDelay={100}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={`pg-icon-sidebar-btn${filesPaneOpen ? " active" : ""}`}
                      aria-label="Files"
                      aria-pressed={filesPaneOpen}
                      onClick={() => setFilesPaneOpen((v) => !v)}
                    >
                      <FolderTree size={16} aria-hidden="true" />
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner sideOffset={6} side="right">
                    <Popover.Popup className="bui-popup pane-btn-popover">
                      Files
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
            <div className="pg-icon-sidebar-bottom">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={150}
                  closeDelay={100}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className="pg-icon-sidebar-btn"
                      aria-label="Settings"
                      onClick={openSettingsTab}
                    >
                      <svg className="stroke-icon" viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner sideOffset={6} side="right">
                    <Popover.Popup className="bui-popup pane-btn-popover">
                      Settings
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
          </nav>
          {filesPaneOpen && (
            <div className="pg-files-sidebar">
              <div className="pg-files-sidebar-header">
                <span className="pg-files-sidebar-title">Files</span>
                <button
                  type="button"
                  className="pg-files-sidebar-close"
                  aria-label="Close files panel"
                  onClick={() => setFilesPaneOpen(false)}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
              <FilesPanel
                files={mergedVirtualFiles}
                expandedFolders={expandedFolders}
                onToggleFolder={handleFilesToggleFolder}
                onUpload={handleFilesUpload}
                onDownload={mergedHandleFilesDownload}
                onDelete={mergedHandleFilesDelete}
                onRename={mergedHandleFilesRename}
                onCreateFolder={handleFilesCreateFolder}
                onMove={mergedHandleFilesMove}
              />
            </div>
          )}
          <div className="pg-body-content">
        {/* File tabs: one tab per workspace file. The active tab's
            editor + output pane appear directly below — switching tabs
            swaps both the editor doc and the output history so each
            file feels like its own self-contained workspace. */}
        {files.length > 0 && (
          <TabBar
            tabs={fileTabDescriptors}
            activeTabId={activeTabId || activeFileId}
            onSelectTab={selectTab}
            onCloseTab={files.length > 1 ? closeFileTab : undefined}
            onAddTab={addNewFile}
            onRenameTab={renameFileTab}
            onReorderTabs={files.length > 1 ? reorderFileTabs : undefined}
            className="pg-file-tabbar"
          />
        )}
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
              <span className="pane-label">
                <Code2 size={12} aria-hidden="true" />
                Editor
              </span>
              <div className="pane-bar-sep" />
              <div className="pane-editor-btn-group">
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="icon-btn"
                        aria-label="Copy code to clipboard"
                        onClick={copyEditor}
                      >
                        <CopyIcon />
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={6} align="center" side="bottom">
                      <Popover.Popup className="bui-popup pane-btn-popover">
                        Copy code
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                {adapter.formatCode && (
                  <Popover.Root
                    open={isFormatting ? false : formatPopoverOpen}
                    onOpenChange={setFormatPopoverOpen}
                  >
                    <Popover.Trigger
                      openOnHover
                      delay={150}
                      closeDelay={100}
                      render={(triggerProps) => (
                        <button
                          {...triggerProps}
                          type="button"
                          className="icon-btn"
                          aria-label="Format code"
                          aria-busy={isFormatting}
                          disabled={!loaded || isFormatting}
                          onClick={() => void handleFormatCode()}
                        >
                          {isFormatting ? (
                            <svg
                              viewBox="0 0 13 13"
                              width={13}
                              height={13}
                              className="run-btn-spinner"
                              aria-hidden="true"
                            >
                              <circle
                                cx="6.5"
                                cy="6.5"
                                r="5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeDasharray="15 9"
                              />
                            </svg>
                          ) : (
                            <Wand2 size={13} aria-hidden="true" />
                          )}
                        </button>
                      )}
                    />
                    <Popover.Portal>
                      <Popover.Positioner sideOffset={6} align="center" side="bottom">
                        <Popover.Popup className="bui-popup pane-btn-popover">
                          Format code
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                )}
              </div>
              <span
                className="kbd-group"
                title={isMac ? "Cmd + Enter" : "Ctrl + Enter"}
              >
                <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
                <span className="kbd-plus" aria-hidden="true">+</span>
                <kbd className="kbd">Enter</kbd>
              </span>
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
                  <Play size={10} aria-hidden="true" />
                )}
                {statusState === "running" ? "Running…" : "Run"}
              </button>
            </div>
            <div
              className="editor-wrap"
              ref={editorHostRef}
              style={
                activeTabId === SETTINGS_TAB_ID
                  ? { display: "none" }
                  : undefined
              }
            />
            {activeTabId === SETTINGS_TAB_ID && (
              <div className="editor-wrap pg-settings-tab-pane">
                <SettingsPanelContent
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
                  onRestoreDefaults={() => setConfirmRestoreOpen(true)}
                  onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
                  onClearAllLocalData={() => setConfirmClearAllDataOpen(true)}
                />
              </div>
            )}
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
                <Terminal size={12} aria-hidden="true" />
                {outputs.length === 0
                  ? "Output"
                  : `${outputs.length} ${outputs.length === 1 ? "Output" : "Outputs"}`}
              </span>
              <div className="pane-bar-sep" />
              <button
                type="button"
                className="clear-btn"
                onClick={clearOutput}
                title="Clear output"
                aria-label="Clear output"
              >
                <Eraser size={13} aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
            <div className="output-body" ref={outputBodyRef}>
              {outputs.length === 0 && statusState !== "running" ? (
                <div className="welcome">
                  <div className="welcome-icon">⌬</div>
                  <h3>Run your code to see output</h3>
                  {capabilitiesBlurb && <p>{capabilitiesBlurb}</p>}
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
                      <span className="cell-time">
                        <Timer size={12} aria-hidden="true" />
                        <span>Done in {cell.elapsed}</span>
                      </span>
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
            <DataslopeRunOverlay running={statusState === "running"} />
          </div>
        </div>
        {/* A second instance of the overlay rendered outside the
            tab-switched `.panes` so it stays visible on mobile while
            code is running, regardless of whether the user is on the
            Editor or Output tab. CSS hides this variant on desktop and
            hides the in-output-pane instance on mobile, so only one
            overlay is ever painted at a time. */}
        <DataslopeRunOverlay
          running={statusState === "running"}
          variant="mobile"
        />
          </div>
        </div>
      </div>
    </div>
  );
}
