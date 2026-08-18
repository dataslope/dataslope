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
import { EditorState, Compartment, StateEffect } from "@codemirror/state";
import { unifiedMergeView } from "@codemirror/merge";
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
  closeBrackets,
  closeBracketsKeymap,
} from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { loadLanguage, themeFor, redoKeymap } from "./cmExtensions";
import { aiInlineCompletion } from "./ai/inlineCompletion";
import {
  registerAiEditHandler,
  type AiEditSuggestion,
} from "./ai/editSuggestions";
import { languageCompletion } from "./completion/languageCompletion";

import type {
  ExampleSnippet,
  ExportFormat,
  LanguageAdapter,
  EmitOutput,
  LanguageRuntime,
  OutputCell,
  PackageInfo,
  RunOptions,
} from "./types";
import { PLAYGROUNDS } from "./playgrounds";
import { useCreepingBootFraction } from "./challengeShared";
import { useRouter } from "next/navigation";
import Link from "./Link";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Dialog } from "@base-ui/react/dialog";
import { Toast } from "@base-ui/react/toast";
import { Select } from "@base-ui/react/select";
import { Drawer } from "@base-ui/react/drawer";
import {
  Library,
  ArrowDownToLine,
  Package,
  Share2,
  Eraser,
  Play,
  Square,
  FileCode,
  FolderOpen,
  Info,
  Wand2,
  Code2,
  Terminal,
  FolderTree,
  ChevronDown,
  X,
} from "lucide-react";
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
import { usePlaygroundThemeSync } from "./playgroundThemeSync";
import { useIsFramed } from "./useIsFramed";
import {
  CopyIcon,
  DEFAULT_PLAYGROUND_SETTINGS,
  DataslopeRunOverlay,
  LOADING_QUIPS,
  RuntimeInfoContent,
  SettingsPanelContent,
  detectIsMac,
} from "./playgroundShared";
import { DiamondMark } from "./mdx/loadingAnimations";
import {
  PlaygroundBootOverlay,
  useBootOverlayVisibility,
} from "./PlaygroundBootOverlay";
import { TabBar } from "./tabs/TabBar";
import type { TabContextMenuItem, TabDescriptor } from "./tabs/tabTypes";
import {
  SETTINGS_TAB_ID,
  defaultFiles,
  loadManifest,
  newFileId,
  primaryEntryFilename,
  saveManifest,
  suggestNextFilename,
  type PlaygroundFile,
} from "./playgroundTabs";
import { utf8ByteLength } from "./utf8Size";
import { getPlaygroundStore } from "./stores/createPlaygroundStore";
import {
  deleteFile as opfsDeleteFile,
  readFile as opfsReadFile,
  writeFile as opfsWriteFile,
} from "./opfs/fileStorage";
import {
  ensureActiveWorkspace,
  isWorkspaceDirty,
  markWorkspaceDirty,
  saveDraftWorkspace,
} from "./opfs/activeWorkspace";
import { acquireWorkspaceLock } from "./opfs/workspace";
import { downloadWorkspaceZip } from "./opfs/workspaceArchive";
import { WorkspaceBadge } from "./workspace/WorkspaceBadge";
import { ShareControls } from "./cloud/ShareControls";
import {
  HeaderDivider,
  MobileMoreSections,
  MobileSaveMenu,
  MoreMenu,
  NewWorkspaceControl,
  SaveControl,
  WorkspaceNameControl,
  useAccountMenuSection,
  type MoreMenuSection,
} from "./PlaygroundHeaderControls";
import {
  MobileMenuAction,
  MobileMenuLabel,
  MobileMenuSheet,
  MobileMenuSubSheet,
} from "./MobileMenuSheet";
import { applyEntryFocus } from "./playgroundEntryFocus";
import type {
  BundleCodeFile,
  BundleDataFile,
  WorkspaceBundle,
} from "@/lib/workspaces/types";
import {
  BUNDLE_MAX_DATA_BYTES,
  BUNDLE_MAX_DATA_FILES,
} from "@/lib/workspaces/types";
import { bytesToBase64 } from "@/lib/workspaces/base64";
import {
  FileCode2,
  PanelLeft,
  PanelRight,
  PanelTop,
  Rows3,
  Settings,
  Zap,
  ZapOff,
} from "lucide-react";
import PlaygroundSplitEditors from "./PlaygroundSplitEditors";
import { FilesPanel, type VirtualFile } from "./files/FilesPanel";
import {
  deleteDataEntry,
  loadDataFiles,
  readDataFile,
  renameDataEntry,
  upsertDataFolder,
  writeDataFile,
} from "./files/opfsDataStorage";
import {
  getSharedRuntime,
  retainRuntime,
  RuntimeScope,
} from "./runtimeRegistry";
import { PlotlyChart } from "./PlotlyChart";

const MOBILE_EDITOR_TAB = "editor" as const;

/** Code playgrounds append runs to one scrolling history, so
 *  clear-before-run is opt-in here; the SQL playgrounds keep the default. */
const CODE_CLEAR_BEFORE_RUN_DEFAULT = false;
// How often the output panel repaints while a run is still producing
// output. Fast enough to read as live, slow enough that a print-heavy loop
// doesn't re-render per chunk.
const LIVE_OUTPUT_FLUSH_MS = 80;

// Minimum ms the "running" overlay shows so its 180ms CSS transition can
// complete visibly.
const MIN_ANIMATION_MS = 300;

/** Empty-state output-panel blurb from `outputCapabilities`; empty string
 *  for text-only runtimes so the welcome panel isn't noisy. */
function buildCapabilitiesBlurb(
  caps: LanguageAdapter["outputCapabilities"],
): string {
  const items: string[] = [];
  if (caps?.dataframes) items.push("data frames");
  if (caps?.charts) items.push("charts");
  if (caps?.figures) items.push("figures");
  if (caps?.preview) items.push("a live page preview");
  if (items.length === 0) return "";
  if (items.length === 1) return `Supports text and ${items[0]}.`;
  if (items.length === 2)
    return `Supports text, ${items[0]}, and ${items[1]}.`;
  return `Supports text, ${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}.`;
}

/** Compute the basename without extension for the Run button label. */
function entryStem(filename: string): string {
  const leaf = filename.includes("/") ? filename.split("/").pop()! : filename;
  const dot = leaf.lastIndexOf(".");
  return dot > 0 ? leaf.slice(0, dot) : leaf;
}

/** Run-button label wrapping the entry-file stem in a `<code>` chip;
 *  `topLevel` appends the C# " (top-level)" qualifier. */
function runEntryLabel(stem: string, topLevel = false): ReactNode {
  return (
    <>
      Run <code className="playground-run-entry">{stem}</code>
      {topLevel ? " (top-level)" : null}
    </>
  );
}

/** Describes one option in the Run split-button dropdown. */
interface RunDropdownItem {
  label: ReactNode;
  /** Workspace path of the file to execute when this item is clicked. */
  entryFilename: string;
}

/** Result of `computeRunButtonState`; drives the Run button UI. */
interface RunButtonState {
  /** Content rendered inside the primary button after the play icon. */
  primaryLabel: ReactNode;
  /** Workspace path of the file the primary button executes. `null`
   *  means "run the active editor as-is" (used when the active file
   *  is the canonical entry). */
  primaryEntry: string | null;
  /** Items rendered in the chevron dropdown. Empty array → hide
   *  chevron. */
  dropdownItems: RunDropdownItem[];
}

/** Resolve the Run button's label, primary action, and chevron items.
 *  Adapters with `findEntryFiles` (C/C++/Java/C#) have multiple entry
 *  points; the rest run any file, with the canonical default in the
 *  dropdown. */
function computeRunButtonState(
  adapter: LanguageAdapter,
  files: PlaygroundFile[],
  activeFileId: string,
  fileContents: Map<string, string>,
): RunButtonState {
  const stemFor = adapter.entryLabel ?? entryStem;
  const activeFile = files.find((f) => f.id === activeFileId) ?? null;
  const primary = primaryEntryFilename(adapter);
  const primaryFile = files.find((f) => f.filename === primary) ?? null;

  // Preview adapters (the web playground) always run the composed entry
  // document, so they show a bare "Run" with no per-file chip or dropdown.
  if (adapter.simpleRunLabel) {
    return { primaryLabel: "Run", primaryEntry: primary, dropdownItems: [] };
  }

  // Multi-entry-point adapters (C, C++, Java, C#).
  if (adapter.findEntryFiles) {
    const inputs = files.map((f) => ({
      filename: f.filename,
      content: fileContents.get(f.filename) ?? "",
    }));
    const entries = adapter.findEntryFiles(inputs);
    // Sort entries by filename for stable, alphabetical chevron order.
    entries.sort((a, b) => a.filename.localeCompare(b.filename));

    const activeEntry = activeFile
      ? entries.find((e) => e.filename === activeFile.filename) ?? null
      : null;

    if (activeEntry) {
      // C# top-level files use the bare "Run" label per spec, the
      // file simply executes itself top-to-bottom.
      const label: ReactNode =
        activeEntry.kind === "topLevel"
          ? "Run"
          : runEntryLabel(stemFor(activeEntry.filename));
      const dropdown = entries
        .filter((e) => e.filename !== activeEntry.filename)
        .map((e) => ({
          label: runEntryLabel(stemFor(e.filename), e.kind === "topLevel"),
          entryFilename: e.filename,
        }));
      return {
        primaryLabel: label,
        primaryEntry: activeEntry.filename,
        dropdownItems: dropdown,
      };
    }

    // Active file is not an entry point: fall back to primary, then
    // first entry alphabetically.
    if (entries.length === 0) {
      // No entry points at all: keep the button usable but unlabelled; the
      // runtime surfaces a compile error on click.
      return { primaryLabel: "Run", primaryEntry: null, dropdownItems: [] };
    }
    const primaryEntry =
      entries.find((e) => e.filename === primary) ?? entries[0];
    if (entries.length === 1) {
      // One entry and the user isn't on it: plain "Run", no chevron, but
      // still target that entry.
      return {
        primaryLabel: "Run",
        primaryEntry: primaryEntry.filename,
        dropdownItems: [],
      };
    }
    const dropdown = entries
      .filter((e) => e.filename !== primaryEntry.filename)
      .map((e) => ({
        label: runEntryLabel(stemFor(e.filename), e.kind === "topLevel"),
        entryFilename: e.filename,
      }));
    return {
      primaryLabel: runEntryLabel(stemFor(primaryEntry.filename)),
      primaryEntry: primaryEntry.filename,
      dropdownItems: dropdown,
    };
  }

  // Single-entry-point adapters (Python, R, JS, TS, PHP). Any file
  // runs; the dropdown surfaces the canonical default file when it
  // exists in the workspace and isn't currently active.
  if (!activeFile) {
    return { primaryLabel: "Run", primaryEntry: null, dropdownItems: [] };
  }
  const isActiveDefault =
    primaryFile !== null && primaryFile.id === activeFile.id;
  if (isActiveDefault || !primaryFile) {
    // Active is the default file (or no default exists), plain "Run".
    return { primaryLabel: "Run", primaryEntry: null, dropdownItems: [] };
  }
  return {
    primaryLabel: runEntryLabel(stemFor(activeFile.filename)),
    primaryEntry: null,
    dropdownItems: [
      {
        label: runEntryLabel(stemFor(primaryFile.filename)),
        entryFilename: primaryFile.filename,
      },
    ],
  };
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

  // The drawer fully unmounts when closed, so internal state resets itself.

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
              {/* Drag handle, mobile-only (hidden via CSS on desktop). */}
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
                              // Don't also trigger the outer pkg-item
                              // onClick (which would import the package).
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

/** Merge consecutive `stdout` cells (one per console.log from the
 *  JS/TS/PHP workers) into a single grouped cell. */
function mergeConsecutiveStdout<T extends { type: string; content: string }>(
  cells: T[],
): T[] {
  const result: T[] = [];
  for (const cell of cells) {
    const lastIdx = result.length - 1;
    const last = lastIdx >= 0 ? result[lastIdx] : undefined;
    if (last && last.type === "stdout" && cell.type === "stdout") {
      result[lastIdx] = {
        ...last,
        content: last.content + "\n" + cell.content,
      };
    } else {
      result.push(cell);
    }
  }
  return result;
}

export interface PlaygroundProps {
  adapter: LanguageAdapter;
}

export default function Playground(props: PlaygroundProps) {
  // Toast.Provider must be a parent of anything calling
  // Toast.useToastManager(), so the body lives in `PlaygroundInner`.
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
  const storageKey = (k: string) => `playground_${adapter.id}_${k}`;
  const [fontSize, setFontSizeState] = useState<number>(
    DEFAULT_PLAYGROUND_SETTINGS.fontSize,
  );
  const [outputFontSizeEnabled, setOutputFontSizeEnabledState] =
    useState<boolean>(false);
  const [outputFontSize, setOutputFontSizeState] = useState<number>(13);
  const [editorTheme, setEditorThemeState] = useState<string>("github-light");
  const [wordWrap, setWordWrapState] = useState<boolean>(true);
  const [clearBeforeRun, setClearBeforeRunState] = useState<boolean>(false);
  /** True once a runtime that implements `cancelRun` has booted; drives the
   *  Run button's switch to Stop while a program is running. */
  const [canStopRun, setCanStopRun] = useState(false);
  const [stopping, setStopping] = useState(false);
  /** Mid-run wait notice from the runtime (e.g. Python's first-run package
   *  install), so a multi-second pause explains itself instead of looking
   *  like a slow program. */
  const [runStatusMessage, setRunStatusMessage] = useState<string | null>(null);

  // ─── UI state ───────────────────────────────────────────────────────────
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Settings tab's position in the tab strip (draggable); Infinity = append
  // at the end. Resets when settings closes.
  const [settingsTabIndex, setSettingsTabIndex] = useState<number>(Infinity);
  // Mobile consolidated-menu drawer (bottom sheet).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Workspace-manager drawer, opened from the mobile hamburger menu.
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false);
  // Confirm dialog when picking an example would discard typed contents.
  const [pendingExample, setPendingExample] = useState<ExampleSnippet | null>(
    null,
  );
  // Confirmations for the Settings panel's destructive actions.
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
  // useSyncExternalStore so macOS detection runs client-only; the server
  // snapshot (false → Ctrl Enter) matches the freshly hydrated page.
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
  // Latest stage-floor fraction from the adapter's boot (null until one
  // arrives); smoothed below for a determinate loading bar.
  const [bootFraction, setBootFraction] = useState<number | null>(null);
  // Overlay lifecycle with a minimum on-screen time so a warm revisit
  // doesn't blink; cold boots exceed the floor and fade immediately.
  const { mounted: showLoadingOverlay, fading: loadingFading } =
    useBootOverlayVisibility(loaded);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  // Mirror for timers/closures (the auto-run debounce) that must read
  // the current run state without re-arming on every status change.
  const statusStateRef = useRef<"loading" | "ready" | "running" | "error">(
    "loading",
  );
  useEffect(() => {
    statusStateRef.current = statusState;
  }, [statusState]);

  // Smoothed boot fraction for the overlay's bar; inactive after load / on
  // error so the next boot starts clean.
  const bootDisplayFraction = useCreepingBootFraction(
    bootFraction,
    !loaded && statusState === "loading",
  );

  // ─── Per-adapter playground store ───────────────────────────────────────
  // Workspaces, files, dirty buffers and output history live in a Zustand
  // store keyed by adapter id so state survives navigation.
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

  // (The active file's outputs are derived below, next to `runButtonState`,
  // which the split view's output-source resolution needs first.)

  // Refs let stale closures (CodeMirror persist listener, async run loop)
  // read the latest workspace + file ids without being rebuilt.
  const activeFileIdRef = useRef("");
  const workspaceIdRef = useRef("");
  const filesRef = useRef<PlaygroundFile[]>([]);
  const virtualFilesRef = useRef<VirtualFile[]>([]);
  const dirtyBuffersRef = useRef(dirtyBuffers);
  const settingsOpenRef = useRef(false);
  const activeTabIdRef = useRef(activeTabId);

  // ─── Explicit-save state ────────────────────────────────────────────────
  // `workspaceSaved` is false for the auto-created draft (not yet in the saved
  // list); `workspaceDirty` latches true once the user changes anything. The
  // Save affordance shows only when the workspace is an unsaved, changed draft.
  const [workspaceSaved, setWorkspaceSaved] = useState(true);
  const [workspaceDirty, setWorkspaceDirty] = useState(false);
  const dirtyMarkedRef = useRef(false);
  const markDirty = useCallback(() => {
    if (dirtyMarkedRef.current) return;
    dirtyMarkedRef.current = true;
    const wsId = workspaceIdRef.current;
    if (wsId) markWorkspaceDirty(wsId);
    setWorkspaceDirty(true);
  }, []);
  const handleSaveWorkspace = useCallback(
    async (name: string) => {
      const saved = saveDraftWorkspace(adapter.id, name);
      if (saved) {
        setWorkspace(saved.id, saved.name);
        setWorkspaceSaved(true);
      }
    },
    [adapter.id, setWorkspace],
  );

  // ─── Cloud saves + sharing ──────────────────────────────────────────────
  // Serializes the live workspace (dirty buffers, falling back to OPFS)
  // into the portable bundle /api/workspaces and /api/shares store.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  /** Data files that didn't fit in the last bundle, so Share can say so
   *  instead of publishing a copy that silently can't run. */
  const excludedShareFilesRef = useRef<string[]>([]);

  /** Uploaded data files as base64, newest-smallest-first so a big archive
   *  can't crowd out the little CSV the program actually reads. */
  const collectBundleDataFiles = useCallback(
    async (
      wsId: string,
    ): Promise<{ dataFiles: BundleDataFile[]; excluded: string[] }> => {
      const dataFiles: BundleDataFile[] = [];
      const excluded: string[] = [];
      const candidates = virtualFilesRef.current
        .filter((vf) => !vf.isFolder)
        .slice()
        .sort((a, b) => a.size - b.size);
      let budget = BUNDLE_MAX_DATA_BYTES;
      for (const vf of candidates) {
        if (dataFiles.length >= BUNDLE_MAX_DATA_FILES) {
          excluded.push(vf.path);
          continue;
        }
        const bytes = await readDataFile(wsId, vf.path);
        if (!bytes) continue;
        if (bytes.length > budget) {
          excluded.push(vf.path);
          continue;
        }
        budget -= bytes.length;
        dataFiles.push({ path: vf.path, base64: bytesToBase64(bytes) });
      }
      return { dataFiles, excluded };
    },
    [],
  );

  const buildCloudBundle =
    useCallback(async (): Promise<WorkspaceBundle | null> => {
      const wsId = workspaceIdRef.current;
      const fileList = filesRef.current;
      if (!wsId || fileList.length === 0) return null;
      const bundleFiles: BundleCodeFile[] = [];
      for (const f of fileList) {
        const dirty = dirtyBuffersRef.current.get(f.id);
        const content = dirty ?? (await opfsReadFile(wsId, f.id)) ?? "";
        bundleFiles.push({ filename: f.filename, content });
      }
      const active = fileList.find((f) => f.id === activeFileIdRef.current);
      // Open files are part of the workspace's layout; ids are reallocated
      // on materialize, so send filenames.
      const openFilenames = openTabIdsRef.current
        .map((id) => fileList.find((f) => f.id === id)?.filename)
        .filter((name): name is string => !!name);
      // Uploaded data files ride along: the Files panel lists them as part
      // of the workspace and programs read them by name, so a snapshot
      // without them is a snapshot that doesn't run.
      const { dataFiles, excluded } = await collectBundleDataFiles(wsId);
      excludedShareFilesRef.current = excluded;
      return {
        version: 2,
        kind: "code",
        playground: adapter.id,
        name: workspaceName || "Workspace",
        exportedAt: Date.now(),
        files: bundleFiles,
        ...(dataFiles.length > 0 ? { dataFiles } : {}),
        activeFilename: active?.filename,
        openFilenames,
      };
    }, [adapter.id, collectBundleDataFiles, workspaceName]);

  useEffect(() => {
    settingsOpenRef.current = settingsOpen;
    // Reset tab position when settings closes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset synced to the settingsOpen prop
    if (!settingsOpen) setSettingsTabIndex(Infinity);
  }, [settingsOpen]);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
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
    virtualFilesRef.current = virtualFiles;
  }, [virtualFiles]);
  useEffect(() => {
    dirtyBuffersRef.current = dirtyBuffers;
  }, [dirtyBuffers]);

  // Suppress the persist listener during programmatic doc replacements;
  // otherwise a tab switch would write the previous file's content into
  // the new file's dirty buffer.
  const suppressPersistRef = useRef(false);

  const [workspaceReady, setWorkspaceReady] = useState(false);
  // Mirrored into a ref for callbacks registered outside the render cycle
  // (e.g. the Ask AI edit handler in ai/editSuggestions.ts).
  const workspaceReadyRef = useRef(false);
  useEffect(() => {
    workspaceReadyRef.current = workspaceReady;
  }, [workspaceReady]);

  // ─── Open editor tabs ───────────────────────────────────────────────
  // The tab strip shows a SUBSET of the workspace's files: closing a tab
  // only hides its editor, the file stays in the workspace so cross-file
  // imports keep resolving. Persisted in the workspace manifest.
  const [openTabIds, setOpenTabIdsState] = useState<string[]>([]);
  const openTabIdsRef = useRef<string[]>([]);
  const setOpenTabIds = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      const value =
        typeof next === "function" ? next(openTabIdsRef.current) : next;
      // `react-hooks/immutability` flags a ref written inside a function
      // handed to a hook, because React Compiler must assume that function
      // could run during render, and mutating a ref during render is unsafe.
      // It cannot see that this one never does: `setOpenTabIds` is only ever
      // called from event handlers and effects.
      //
      // The ref is the point of the pattern. Six dependency-free callbacks
      // (lines ~817, 2497, 2548, 2647, 2735) read `openTabIdsRef.current` to
      // get the *current* tab list synchronously; taking `openTabIds` as a
      // dependency instead would rebuild all six on every tab change. Keep
      // the suppression narrow — if this setter ever becomes reachable from
      // render, the rule is right and this comment is wrong.
      // eslint-disable-next-line react-hooks/immutability
      openTabIdsRef.current = value;
      setOpenTabIdsState(value);
    },
    [],
  );

  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  // Split view: the id of the file whose pane-header Format button is
  // currently running, so only that pane shows the spinner.
  const [formattingSplitId, setFormattingSplitId] = useState<string | null>(
    null,
  );
  const outputCounter = useRef(0);
  // Monotonic per-run id stamped on every cell a run appends, so the
  // output pane can render one merged frame per run (see outputGroups).
  const runCounter = useRef(0);
  const runtimeRef = useRef<LanguageRuntime | null>(null);

  // ─── CodeMirror ─────────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  // Latches after the first post-mount focus so the entry policy (cursor at
  // end on desktop, no keyboard-popping focus on mobile) applies exactly once.
  const entryFocusDoneRef = useRef(false);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const languageCompRef = useRef<Compartment | null>(null);
  const outputBodyRef = useRef<HTMLDivElement | null>(null);
  // Slot the preview adapters (web / react) mount their sandboxed
  // iframe into. Always in the DOM for preview-capable adapters so the
  // element exists by the time `runtime.run` needs it.
  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const hasPreview = Boolean(adapter.outputCapabilities?.preview);
  // Ref mirror of `outputFileId` (derived next to `runButtonState`
  // below) for callbacks, empty until its sync effect first runs;
  // readers fall back to the active file id.
  const outputFileIdRef = useRef<string>("");
  // Pane layout elements (the drag resizer wires them up in an effect
  // further down; declared here so earlier callbacks can reference the
  // panes element).
  const panesRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);

  // ─── CodePen-style split view (adapters with `splitEditors`) ─────────
  // One always-visible editor per file instead of the tabbed editor.
  // Defaults ON; the choice persists per adapter, read in a mount effect
  // so hydration stays deterministic.
  const splitAvailable = Boolean(adapter.splitEditors);
  const [splitView, setSplitViewState] = useState<boolean>(splitAvailable);
  useEffect(() => {
    if (!splitAvailable) return;
    try {
      if (
        window.localStorage.getItem(`playground_${adapter.id}_splitview`) ===
        "false"
      ) {
        /* A lazy useState initialiser would read localStorage during render
           and mismatch the SSR markup. */
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setSplitViewState(false);
      }
    } catch {
      /* private mode, keep the default. */
    }
  }, [adapter.id, splitAvailable]);
  const splitActive = splitAvailable && splitView;
  const splitActiveRef = useRef(splitActive);
  useEffect(() => {
    splitActiveRef.current = splitActive;
  }, [splitActive]);
  // Live EditorViews per pane, so Format/Copy can target the active one.
  const splitViewsRef = useRef(new Map<string, EditorView>());
  const setSplitView = useCallback(
    (on: boolean) => {
      setSplitViewState(on);
      // Drop the resizer's inline grid template so the new arrangement's
      // CSS takes over at default proportions.
      panesRef.current?.style.removeProperty("grid-template-columns");
      try {
        window.localStorage.setItem(
          `playground_${adapter.id}_splitview`,
          String(on),
        );
      } catch {
        /* quota / private mode, ignore. */
      }
    },
    [adapter.id],
  );
  const registerSplitEditorView = useCallback(
    (fileId: string, view: EditorView | null) => {
      if (view) splitViewsRef.current.set(fileId, view);
      else splitViewsRef.current.delete(fileId);
    },
    [],
  );
  // Focusing a pane makes its file "active" (Run label, Format target,
  // completion filename), exactly like focusing that file's tab.
  const focusSplitFile = useCallback(
    (fileId: string) => {
      if (activeFileIdRef.current === fileId) return;
      activeFileIdRef.current = fileId;
      setActiveFileId(fileId);
      setActiveTabId(fileId);
    },
    [setActiveFileId, setActiveTabId],
  );

  // ─── Auto-run on edit (preview adapters) ─────────────────────────────
  // Debounced re-run after edits (plus one initial run) keeps the preview
  // current without pressing Run. Persisted per adapter; defaults ON.
  const [autoRun, setAutoRunState] = useState<boolean>(hasPreview);
  useEffect(() => {
    if (!hasPreview) return;
    try {
      if (
        window.localStorage.getItem(`playground_${adapter.id}_autorun`) ===
        "false"
      ) {
        /* Deterministic-SSR pattern, see the split-view hydration note. */
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setAutoRunState(false);
      }
    } catch {
      /* private mode, keep the default. */
    }
  }, [adapter.id, hasPreview]);
  const setAutoRun = useCallback(
    (on: boolean) => {
      setAutoRunState(on);
      try {
        window.localStorage.setItem(
          `playground_${adapter.id}_autorun`,
          String(on),
        );
      } catch {
        /* quota / private mode, ignore. */
      }
    },
    [adapter.id],
  );

  // ─── Editor position (preview adapters): left / right / top ──────────
  const [editorPosition, setEditorPositionState] = useState<
    "left" | "right" | "top"
  >("left");
  useEffect(() => {
    if (!hasPreview) return;
    try {
      const stored = window.localStorage.getItem(
        `playground_${adapter.id}_editorpos`,
      );
      if (stored === "right" || stored === "top") {
        /* Deterministic-SSR pattern, see the split-view hydration note. */
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setEditorPositionState(stored);
      }
    } catch {
      /* private mode, keep the default. */
    }
  }, [adapter.id, hasPreview]);
  const setEditorPosition = useCallback(
    (pos: "left" | "right" | "top") => {
      setEditorPositionState(pos);
      // Drop the resizer's inline grid template so the new arrangement's
      // CSS takes over at default proportions.
      panesRef.current?.style.removeProperty("grid-template-columns");
      try {
        window.localStorage.setItem(
          `playground_${adapter.id}_editorpos`,
          pos,
        );
      } catch {
        /* quota / private mode, ignore. */
      }
    },
    [adapter.id],
  );
  // On split-capable adapters the tabbed view pins the editor left; the
  // stored arrangement only applies while the split panes are showing.
  const editorPinnedLeft = splitAvailable && !splitActive;
  const effectiveEditorPosition = editorPinnedLeft ? "left" : editorPosition;

  // Latest run handler in a ref so the editor's keymap needn't re-bind.
  // `auto` marks debounced auto-runs, which skip user-facing side effects
  // like the mobile pane switch.
  const runRef = useRef<(opts?: { auto?: boolean }) => void>(() => undefined);
  // Secondary run action (⌘/Ctrl+Shift+Enter): the Run dropdown's first
  // entry. A ref so the keymap stays stable as the target changes.
  const runSecondaryRef = useRef<() => void>(() => undefined);

  // First output cell id of the most recent run; the auto-scroll effect
  // scrolls it into view rather than jumping to the end.
  const newRunFirstIdRef = useRef<number | null>(null);

  // Pending error→ready reset; a new run cancels it so a stale timer can't
  // flip status to "ready" mid-run.
  const errorResetTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (errorResetTimerRef.current !== null) {
        window.clearTimeout(errorResetTimerRef.current);
      }
    },
    [],
  );

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
          // Land the cell ~64px below the top of the output area.
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
    document.body.classList.add("playground-active");

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
    // Default to appending runs; auto-clearing is opt-in via the setting.
    const storedClearBeforeRun = localStorage.getItem(
      storageKey("clearbeforerun"),
    );
    const savedClearBeforeRun =
      storedClearBeforeRun === null
        ? CODE_CLEAR_BEFORE_RUN_DEFAULT
        : storedClearBeforeRun === "true";

    /* Hydrate persisted settings here; lazy useState initialisers would
       mismatch SSR (no `window`) and CSR. */
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
      document.body.classList.remove("playground-active");
      clearThemePalette();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id]);

  // ─── Workspace + file manifest bootstrap ────────────────────────────────
  // Resolves (or auto-creates) the active workspace, hydrates the file
  // manifest, and seeds the dirty buffers from OPFS; the editor then
  // dispatches a doc replacement so the user lands on their saved code.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    // Releases the workspace lock on teardown so a later remount can
    // re-acquire it instead of colliding with this document's own stale
    // lock ("already open in another tab").
    const lockController = new AbortController();
    (async () => {
      try {
        const ws = await ensureActiveWorkspace(adapter.id);
        if (cancelled) return;
        setWorkspaceSaved(ws.saved);
        const wsDirty = isWorkspaceDirty(ws.id);
        setWorkspaceDirty(wsDirty);
        dirtyMarkedRef.current = wsDirty;

        const manifest = loadManifest(adapter.id, ws.id);
        let files: PlaygroundFile[];
        let activeId: string;
        let openIds: string[] | null = null;
        if (manifest) {
          files = manifest.files;
          activeId = manifest.activeFileId;
          openIds = manifest.openTabIds;
        } else {
          files = defaultFiles(adapter);
          activeId = files[0].id;
          // Seed with the legacy single-file code (if any) so migrating
          // users don't lose their work.
          const legacy = localStorage.getItem(storageKey("code"));
          if (legacy && legacy.length > 0) {
            opfsWriteFile(ws.id, files[0].id, legacy);
          }
          saveManifest(adapter.id, ws.id, files, activeId);
        }

        // Read each file's content from OPFS into the dirty buffer; files
        // without OPFS content fall back to the adapter's default workspace
        // or the first example.
        const defaultSeedFor = (filename: string): string =>
          adapter.defaultWorkspace?.find((d) => d.filename === filename)
            ?.content ?? "";
        for (const f of files) {
          const stored = await opfsReadFile(ws.id, f.id);
          if (cancelled) return;
          if (stored != null) {
            updateDirtyBuffer(f.id, stored);
          } else if (f.id === activeId) {
            const legacy = localStorage.getItem(storageKey("code"));
            const seed =
              legacy ??
              (adapter.defaultWorkspace
                ? defaultSeedFor(f.filename)
                : (adapter.examples[0]?.code ?? ""));
            updateDirtyBuffer(f.id, seed);
            if (seed) opfsWriteFile(ws.id, f.id, seed);
          } else {
            const seed = defaultSeedFor(f.filename);
            updateDirtyBuffer(f.id, seed);
            if (seed) opfsWriteFile(ws.id, f.id, seed);
          }
        }

        if (cancelled) return;
        setWorkspace(ws.id, ws.name);
        setFiles(files);
        setOpenTabIds(openIds ?? files.map((f) => f.id));
        setActiveFileId(activeId);
        setActiveTabId(activeId);
        // Sync refs eagerly so the editor's persist listener can use them
        // immediately on the next dispatch.
        workspaceIdRef.current = ws.id;
        activeFileIdRef.current = activeId;
        filesRef.current = files;
        setWorkspaceReady(true);

        // Tab-isolation notice when another tab holds the workspace lock;
        // shown at most once per (workspace × session).
        const noticeKey = `playground_ws_warned_${ws.id}`;
        try {
          if (window.sessionStorage.getItem(noticeKey) !== "1") {
            const hasLock = await acquireWorkspaceLock(ws.id, {
              signal: lockController.signal,
            });
            if (!cancelled && !hasLock) {
              window.sessionStorage.setItem(noticeKey, "1");
              showToast(
                "This workspace is already open in another tab. Edits here may conflict, switch workspaces via the badge in the header.",
                "warn",
              );
            }
          }
        } catch {
          /* sessionStorage / Locks unavailable, ignore. */
        }
      } catch {
        // Bootstrap failed (OPFS down, etc.): fall back to a single
        // in-memory file so the playground still works.
        if (cancelled) return;
        const files = defaultFiles(adapter);
        const activeId = files[0].id;
        const legacy =
          typeof window !== "undefined"
            ? localStorage.getItem(storageKey("code"))
            : null;
        for (const f of files) {
          const workspaceSeed =
            adapter.defaultWorkspace?.find((d) => d.filename === f.filename)
              ?.content ?? "";
          const seed =
            f.id === activeId
              ? (legacy ??
                (adapter.defaultWorkspace
                  ? workspaceSeed
                  : (adapter.examples[0]?.code ?? "")))
              : workspaceSeed;
          updateDirtyBuffer(f.id, seed);
        }
        setFiles(files);
        setOpenTabIds(files.map((f) => f.id));
        setActiveFileId(activeId);
        setActiveTabId(activeId);
        activeFileIdRef.current = activeId;
        filesRef.current = files;
        setWorkspaceReady(true);
      }
    })();
    return () => {
      cancelled = true;
      // Release the workspace lock so the next mount can re-acquire it.
      lockController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter.id]);

  // Persist the manifest on changes; skipped until bootstrap completes so
  // hydration doesn't overwrite a freshly-loaded manifest. Dangling tab
  // ids are filtered at write time.
  useEffect(() => {
    if (!workspaceReady || !workspaceId) return;
    saveManifest(
      adapter.id,
      workspaceId,
      files,
      activeFileId,
      openTabIds.filter((id) => files.some((f) => f.id === id)),
    );
  }, [adapter.id, workspaceId, files, activeFileId, openTabIds, workspaceReady]);

  // Whatever activates a file must end with its tab open; centralized so
  // no activation path can strand an active-but-closed file.
  useEffect(() => {
    if (!workspaceReady || !activeFileId) return;
    if (!files.some((f) => f.id === activeFileId)) return;
    if (openTabIds.includes(activeFileId)) return;
    setOpenTabIds((prev) =>
      prev.includes(activeFileId) ? prev : [...prev, activeFileId],
    );
  }, [activeFileId, files, openTabIds, setOpenTabIds, workspaceReady]);

  // Load uploaded data files from OPFS once the workspace is ready.
  useEffect(() => {
    if (!workspaceReady || !workspaceId) return;
    let cancelled = false;
    void loadDataFiles(workspaceId)
      .then((loaded) => {
        if (!cancelled) setVirtualFiles(loaded);
      })
      .catch(() => {
        /* OPFS unavailable / empty, leave the data-file list empty. */
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
          const blob = new Blob([bytes as BlobPart]);
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

  const handleFilesCreateFile = useCallback(
    (parentPath: string, name: string) => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      void (async () => {
        const wsId = workspaceIdRef.current;
        const emptyBytes = new Uint8Array(0);
        if (wsId) {
          await writeDataFile(wsId, path, emptyBytes);
        }
        setVirtualFiles((prev) => {
          if (prev.some((f) => f.path === path)) return prev;
          return [...prev, { path, size: 0, isFolder: false }];
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
      })();
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

    // The split view mounts one editor per file instead of this tabbed
    // editor; toggling back remounts it from the active file's buffer.
    if (!splitActive && editorHostRef.current && !editorRef.current) {
      // Read persisted settings directly so the editor doesn't briefly
      // render with defaults and then flip to the saved values.
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ?? "github-light";
      const initialWordWrap =
        localStorage.getItem(storageKey("wordwrap")) !== "false";

      const themeComp = new Compartment();
      const wrapComp = new Compartment();
      const languageComp = new Compartment();

      // Persist the active file's doc changes: dirty buffer (sync) + OPFS
      // (async). Ids are read from refs so tab switches don't rebuild the
      // editor extensions.
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
          // A genuine user edit makes the workspace eligible to be saved.
          markDirty();
        }
      });

      const view = new EditorView({
        // The editor mounts before bootstrap resolves: start with the dirty
        // buffer (split→tabs remount) or the legacy localStorage entry for
        // a zero-flash paint; the workspace effect replaces the doc later.
        doc:
          dirtyBuffersRef.current.get(activeFileIdRef.current ?? "") ??
          localStorage.getItem(storageKey("code")) ??
          adapter.defaultWorkspace?.[0]?.content ??
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
          // Indent width tracks the adapter's formatter so Tab matches
          // Format.
          EditorState.tabSize.of(adapter.indentWidth),
          indentUnit.of(" ".repeat(adapter.indentWidth)),
          // Intellisense: runtime-backed + static completion sources,
          // trigger characters, and the completion keymap (Tab accepts,
          // Enter always inserts a newline).
          languageCompletion({
            adapterId: adapter.id,
            getRuntime: () => runtimeRef.current,
            getFilename: () =>
              filesRef.current.find((f) => f.id === activeFileIdRef.current)
                ?.filename,
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
              key: "Mod-Shift-Enter",
              run: () => {
                runSecondaryRef.current();
                return true;
              },
            },
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...redoKeymap,
            indentWithTab,
          ]),
          languageComp.of([]),
          themeComp.of(themeFor(initialTheme)),
          wrapComp.of(initialWordWrap ? EditorView.lineWrapping : []),
          // AI ghost-text completion (pro members only, the extension gates
          // itself and stays inert for guests/free members). Filename is read
          // through refs so tab switches don't rebuild the editor extensions,
          // matching how the persist listener works.
          aiInlineCompletion({
            language: adapter.id,
            filename: () =>
              filesRef.current.find((f) => f.id === activeFileIdRef.current)
                ?.filename,
          }),
          persistListener,
        ],
      });

      editorRef.current = view;
      themeCompRef.current = themeComp;
      wrapCompRef.current = wrapComp;
      languageCompRef.current = languageComp;

      void loadLanguage(adapter.codeMirrorMode).then((ext) => {
        if (ext && editorRef.current === view) {
          view.dispatch({ effects: languageComp.reconfigure(ext) });
        }
      });
    }

    (async () => {
      try {
        // Re-use the playground-scoped runtime across sessions; /learn uses
        // a separate scope so playground side effects (pip installs, staged
        // VFS files) can't leak into its CodeBlocks/ChallengeCards.
        const rt = await getSharedRuntime(
          RuntimeScope.Playground,
          adapter,
          (m, fraction) => {
            if (cancelled) return;
            setLoadingMessage(m);
            if (fraction !== undefined) setBootFraction(fraction);
          },
        );
        if (cancelled) return;
        runtimeRef.current = rt;
        // The playground can't predict what the user will type, so pre-warm
        // the full optional package set unconditionally. Fire-and-forget.
        rt.warmPackages?.([], { force: true });
        // Only runtimes that can actually stop a run get a Stop control.
        setCanStopRun(typeof rt.cancelRun === "function");
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
      languageCompRef.current = null;
    };
    // editorTheme only seeds the initial CM theme; later changes go through
    // Compartment reconfigure below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, splitActive]);

  // Pin this playground's runtime while mounted so the per-scope LRU
  // eviction never terminates the engine under a live playground.
  useEffect(
    () => retainRuntime(RuntimeScope.Playground, adapter.id),
    [adapter.id],
  );

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
    if (splitActive) return; // per-file editors sync themselves
    if (activeTabId === SETTINGS_TAB_ID) return;
    const view = editorRef.current;
    if (!view) return;
    if (!activeFileId) return;
    const target = dirtyBuffersRef.current.get(activeFileId) ?? "";
    if (view.state.doc.toString() !== target) {
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
    }
    // Focus the editor after tab ops (the Settings tab early-returns above,
    // so its form never loses focus). Hold off while the boot overlay
    // covers the screen; the FIRST focus goes through the entry policy —
    // desktop lands the cursor at the end, mobile skips focus so the
    // keyboard doesn't pop. `showLoadingOverlay` is in the deps so entry
    // focus fires once the overlay unmounts.
    if (showLoadingOverlay) return;
    if (!entryFocusDoneRef.current) {
      entryFocusDoneRef.current = true;
      applyEntryFocus(view);
      return;
    }
    view.focus();
  }, [activeFileId, activeTabId, splitActive, workspaceReady, showLoadingOverlay]);

  // Per-file syntax highlighting for mixed-language workspaces (web);
  // adapters without `codeMirrorModeForFile` keep the mount-time mode.
  useEffect(() => {
    if (!adapter.codeMirrorModeForFile) return;
    if (!workspaceReady) return;
    const filename = files.find((f) => f.id === activeFileId)?.filename;
    if (!filename) return;
    const mode =
      adapter.codeMirrorModeForFile(filename) ?? adapter.codeMirrorMode;
    const view = editorRef.current;
    const comp = languageCompRef.current;
    if (!view || !comp) return;
    let cancelled = false;
    void loadLanguage(mode).then((ext) => {
      if (cancelled || !ext) return;
      if (editorRef.current !== view) return;
      view.dispatch({ effects: comp.reconfigure(ext) });
    });
    return () => {
      cancelled = true;
    };
  }, [adapter, activeFileId, files, workspaceReady]);

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
  // Follow the site-wide light/dark choice (shared with the home page + /learn).
  usePlaygroundThemeSync(setEditorTheme);
  // Hide the brand logo + wordmark when embedded (the home page's iframe).
  const embedded = useIsFramed();

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

  // Restore editor settings to built-in defaults (and drop their
  // localStorage entries). Saved code is intentionally left alone — the
  // separate "Clear all localStorage" action handles that.
  const restoreDefaultSettings = useCallback(() => {
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    setFontSize(D.fontSize);
    setOutputFontSize(D.outputFontSize);
    setOutputFontSizeEnabled(D.outputFontSizeEnabled);
    setEditorTheme(D.editorTheme);
    setWordWrap(D.wordWrap);
    setClearBeforeRun(CODE_CLEAR_BEFORE_RUN_DEFAULT);
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

  // Clear every localStorage entry (across all playgrounds) and reload.
  // The confirmation dialog below has already fired by this point.
  const clearAllLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      // localStorage may be unavailable in private mode; reload anyway.
    }
    window.location.reload();
  }, []);

  // Nuclear wipe: clears every storage surface (localStorage, OPFS,
  // IndexedDB, caches) before reloading. Best-effort; always reloads.
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

  /** Build the file map for `runtime.prepareFileSystem`: every code tab
   *  (dirty buffer, falling back to OPFS) plus every uploaded data file,
   *  under workspace-relative paths. */
  const collectWorkspaceFilesForRun = useCallback(async (): Promise<
    Map<string, Uint8Array>
  > => {
    const wsId = workspaceIdRef.current;
    const out = new Map<string, Uint8Array>();
    const encoder = new TextEncoder();

    // Code tabs; OPFS reads run in parallel so many files don't serialise.
    const activeId = activeFileIdRef.current;
    const view = editorRef.current;
    const reads = filesRef.current.map(async (f) => {
      // The active editor may hold edits not yet flushed to the buffer.
      if (view && f.id === activeId) {
        out.set(f.filename, encoder.encode(view.state.doc.toString()));
        return;
      }
      const buffered = dirtyBuffersRef.current.get(f.id);
      if (buffered !== undefined) {
        out.set(f.filename, encoder.encode(buffered));
        return;
      }
      if (wsId) {
        const text = await opfsReadFile(wsId, f.id);
        out.set(f.filename, encoder.encode(text ?? ""));
      } else {
        out.set(f.filename, encoder.encode(""));
      }
    });
    await Promise.all(reads);

    // Data files (binary); folder markers have no OPFS content.
    if (wsId) {
      const dataReads = virtualFilesRef.current
        .filter((vf) => !vf.isFolder)
        .map(async (vf) => {
          const bytes = await readDataFile(wsId, vf.path);
          if (bytes) out.set(vf.path, bytes);
        });
      await Promise.all(dataReads);
    }

    return out;
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────
  const runCode = useCallback(
    async (entryOverride?: string, opts?: { auto?: boolean }) => {
    const editor = editorRef.current;
    const rt = runtimeRef.current;
    if (!rt) return;
    // The split view has no tabbed editor; its panes write through to the
    // dirty buffers, so reads below fall back to the buffers.
    if (!editor && !splitActiveRef.current) return;
    // Snapshot the active file id at run start so outputs route to the file
    // whose code actually executed, even after a mid-run tab switch.
    let targetFileId = activeFileIdRef.current;
    if (!targetFileId) return;

    // Resolve the entry file (chevron picks override the active tab); an
    // override's content is read from the buffer / OPFS.
    const activeFile =
      filesRef.current.find((f) => f.id === targetFileId) ?? null;
    const entryFilename = entryOverride ?? activeFile?.filename;
    // Split view: outputs belong to the file that RAN (the entry), not the
    // focused pane, so the console reads as one stream (see `outputFileId`).
    if (splitActiveRef.current && entryFilename) {
      const entryFile = filesRef.current.find(
        (f) => f.filename === entryFilename,
      );
      if (entryFile) targetFileId = entryFile.id;
    }
    let code: string;
    if (entryOverride && activeFile && entryOverride !== activeFile.filename) {
      const entryFile = filesRef.current.find(
        (f) => f.filename === entryOverride,
      );
      if (entryFile) {
        const buffered = dirtyBuffersRef.current.get(entryFile.id);
        if (buffered !== undefined) {
          code = buffered;
        } else if (workspaceIdRef.current) {
          const text = await opfsReadFile(
            workspaceIdRef.current,
            entryFile.id,
          );
          code = text ?? "";
        } else {
          code = "";
        }
      } else {
        code = "";
      }
    } else if (editor) {
      code = editor.state.doc.toString();
    } else {
      // Split view: the pane's write-through listener keeps its buffer
      // current.
      code = (activeFile && dirtyBuffersRef.current.get(activeFile.id)) ?? "";
    }
    if (!code.trim()) return;

    if (errorResetTimerRef.current !== null) {
      window.clearTimeout(errorResetTimerRef.current);
      errorResetTimerRef.current = null;
    }
    setStatusState("running");

    if (clearBeforeRun) {
      setOutputsForFile(targetFileId, []);
    }

    setRunStatusMessage(null);

    const t0 = performance.now();
    // Notices the surface itself produces (a staging failure), kept out of
    // `collected` because that array is addressed by stream position: a cell
    // pushed at index 0 here would be overwritten by the run's first cell.
    const preCells: Omit<OutputCell, "id" | "elapsed">[] = [];
    // Sparse: a runtime that streams addresses cells by position, and a
    // position can end up empty (a text segment that was only whitespace).
    const collected: (Omit<OutputCell, "id" | "elapsed"> | undefined)[] = [];
    const firstId = outputCounter.current + 1;
    newRunFirstIdRef.current = firstId;
    const runId = ++runCounter.current;

    /**
     * Show what the run has produced so far.
     *
     * Called repeatedly while the program is still going (Python streams its
     * stdout), so this replaces the run's whole slice rather than appending:
     * `mergeConsecutiveStdout` is deterministic, so a growing input produces
     * a growing output with a stable prefix, and deriving ids from `firstId`
     * instead of the running counter keeps each cell's React key stable
     * across updates.
     */
    const publish = (finishedAt?: number): number => {
      const merged = mergeConsecutiveStdout([
        ...preCells,
        ...collected.filter(
          (c): c is Omit<OutputCell, "id" | "elapsed"> => c !== undefined,
        ),
      ]);
      const elapsed = `${((performance.now() - t0) / 1000).toFixed(2)}s`;
      setOutputsForFile(targetFileId, (prev) => [
        ...prev.filter((c) => c.runId !== runId),
        ...merged.map((c, i) => ({
          ...c,
          id: firstId + i,
          elapsed,
          runId,
          finishedAt,
        })),
      ]);
      outputCounter.current = Math.max(
        outputCounter.current,
        firstId + merged.length - 1,
      );
      return merged.length;
    };

    // Throttled live publishing: the first cell shows immediately, the rest
    // batch, so a 50,000-line run doesn't re-render per chunk.
    let liveTimer: number | null = null;
    let livePending = false;
    const scheduleLive = () => {
      if (liveTimer !== null) {
        livePending = true;
        return;
      }
      publish();
      liveTimer = window.setTimeout(function tick() {
        liveTimer = null;
        if (!livePending) return;
        livePending = false;
        scheduleLive();
      }, LIVE_OUTPUT_FLUSH_MS);
    };
    const stopLive = () => {
      if (liveTimer !== null) {
        window.clearTimeout(liveTimer);
        liveTimer = null;
      }
    };
    const emitCell: EmitOutput = (cell, seq, append) => {
      if (seq === undefined) {
        collected.push(cell);
      } else {
        const prev = collected[seq];
        collected[seq] =
          append && prev
            ? { ...prev, content: prev.content + cell.content }
            : cell;
      }
      scheduleLive();
    };

    // Mirror files the runtime created during the run into the Files pane
    // + OPFS. Called on both success and error paths (a file may have been
    // written before user code threw); safe to call twice because the
    // runtime clears its tracking list after the first read.
    const syncCreatedFiles = async () => {
      if (!rt.collectCreatedFiles) return;
      let created: Map<string, Uint8Array>;
      try {
        created = await rt.collectCreatedFiles();
      } catch {
        return;
      }
      if (created.size === 0) return;

      const wsId = workspaceIdRef.current;
      const codePaths = new Set(filesRef.current.map((f) => f.filename));
      const added: string[] = [];
      for (const [path, bytes] of created) {
        // Don't shadow an open code tab with a same-named data file.
        if (codePaths.has(path)) continue;
        if (wsId) {
          try {
            await writeDataFile(wsId, path, bytes);
          } catch {
            // OPFS write failed; still surface it in the in-memory list.
          }
        }
        setVirtualFiles((prev) => {
          const filtered = prev.filter((f) => f.path !== path);
          return [...filtered, { path, size: bytes.length, isFolder: false }];
        });
        // Auto-expand ancestor folders so a nested download is visible.
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
        added.push(path);
      }
      if (added.length === 1) {
        showToast(`Saved "${added[0]}" to Files.`);
      } else if (added.length > 1) {
        showToast(`Saved ${added.length} files to Files.`);
      }
    };

    try {
      // Stage all workspace files (code tabs + uploaded data files) into
      // the runtime's VFS so multi-file imports resolve; a no-op for
      // adapters without `prepareFileSystem`.
      if (rt.prepareFileSystem) {
        const fileMap = await collectWorkspaceFilesForRun();
        try {
          await rt.prepareFileSystem(fileMap);
        } catch (stageErr) {
          // Non-fatal: execution proceeds with whatever made it in.
          const msg =
            stageErr instanceof Error ? stageErr.message : String(stageErr);
          preCells.push({
            type: "stderr",
            content: `Failed to stage workspace files: ${msg}`,
          });
        }
      }
      const runOptions: RunOptions = {
        // Mid-run waits (Python's first-run package install) explain
        // themselves in the output panel instead of looking like a hang.
        onStatus: (message, preparing) => {
          setRunStatusMessage(preparing ? message : null);
        },
        // The playground runs whole programs, so type errors in one are
        // the user's to see.
        diagnostics: true,
      };
      if (entryFilename) runOptions.entryFilename = entryFilename;
      // Preview adapters render into the surface-owned slot; each run
      // replaces the previous iframe (which is also the teardown story).
      if (hasPreview) runOptions.previewHost = previewHostRef.current;
      await rt.run(code, emitCell, runOptions);
      await syncCreatedFiles();
      stopLive();
      const cellCount = publish(Date.now());
      if (cellCount === 0 && !hasPreview) {
        // Preview adapters "output" the page itself; no toast there.
        showToast("Code ran successfully, no output.");
      }
      // Keep the running overlay visible long enough for its CSS
      // transition to be perceptible.
      const waitMs = MIN_ANIMATION_MS - (performance.now() - t0);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      setStatusState("ready");
    } catch (err) {
      // User code may have created files before throwing; surface them.
      await syncCreatedFiles();
      stopLive();
      // A Stop is a deliberate act, not a failure: whatever the program
      // printed before it was stopped stays on screen, with a plain note.
      const cancelled = err instanceof Error && err.name === "RunCancelledError";
      const msg = err instanceof Error ? err.message : String(err);
      collected.push({
        type: "stderr" as const,
        content: cancelled ? "Run stopped." : msg,
      });
      publish(Date.now());
      if (cancelled) {
        setStatusState("ready");
      } else {
        setStatusState("error");
        errorResetTimerRef.current = window.setTimeout(() => {
          errorResetTimerRef.current = null;
          setStatusState("ready");
        }, 3000);
      }
    } finally {
      stopLive();
      setRunStatusMessage(null);
      // On narrow viewports, surface the output tab once the run is done.
      // Debounced auto-runs skip this — yanking the pane mid-typing would
      // be hostile.
      if (!opts?.auto) setMobileTab("output");
    }
  },
  [clearBeforeRun, collectWorkspaceFilesForRun, hasPreview, setOutputsForFile, showToast]);

  /** Stop the running program. The runtime rejects the in-flight `run()`
   *  with a RunCancelledError, which `runCode` renders as "Run stopped."
   *  above whatever the program had already printed. */
  const stopRun = useCallback(async () => {
    const rt = runtimeRef.current;
    if (!rt?.cancelRun) return;
    setStopping(true);
    try {
      await rt.cancelRun();
    } catch (err) {
      showToast(
        `Couldn't stop the run: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setStopping(false);
    }
  }, [showToast]);

  const clearOutput = useCallback(() => {
    // Clear the pane the output panel is actually showing (split view
    // shows the entry file's stream, not the focused pane's).
    const fileId = outputFileIdRef.current ?? activeFileIdRef.current;
    if (fileId) clearOutputsForFile(fileId);
    // Also tear down the live preview; removing the iframe kills its
    // document immediately.
    if (hasPreview) previewHostRef.current?.replaceChildren();
    if (loaded) {
      setStatusState("ready");
    }
  }, [clearOutputsForFile, hasPreview, loaded]);

  // Filename → content map for entry-point detection; reads `dirtyBuffers`
  // so the Run label updates as the user types.
  const fileContentsByPath = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of files) {
      map.set(f.filename, dirtyBuffers.get(f.id) ?? "");
    }
    return map;
  }, [files, dirtyBuffers]);

  const runButtonState = useMemo(
    () =>
      computeRunButtonState(adapter, files, activeFileId, fileContentsByPath),
    [adapter, files, activeFileId, fileContentsByPath],
  );

  // The output pane's source file. Tabs mode: the active tab. Split mode:
  // the Run button's resolved entry, so the console reads as ONE stream
  // regardless of focus (runCode routes its cells to the same id).
  const outputFileId = useMemo(() => {
    if (!splitActive) return activeFileId;
    const entryName =
      runButtonState.primaryEntry ??
      files.find((f) => f.id === activeFileId)?.filename;
    return files.find((f) => f.filename === entryName)?.id ?? activeFileId;
  }, [splitActive, runButtonState, files, activeFileId]);

  // Derived: the output pane's cells (see `outputFileId` above).
  const outputs = useMemo(
    () => outputsByFile.get(outputFileId) ?? [],
    [outputsByFile, outputFileId],
  );
  useEffect(() => {
    outputFileIdRef.current = outputFileId;
  }, [outputFileId]);

  // Fresh closure for the Mod-Enter keymap; runs the same entry the
  // visible Run button would.
  useEffect(() => {
    runRef.current = (opts) => {
      void runCode(runButtonState.primaryEntry ?? undefined, opts);
    };
  }, [runCode, runButtonState]);

  // ⌘/Ctrl+Shift+Enter runs the Run dropdown's first entry; no-op when
  // there is none.
  useEffect(() => {
    runSecondaryRef.current = () => {
      const secondary = runButtonState.dropdownItems[0];
      if (secondary) void runCode(secondary.entryFilename);
    };
  }, [runButtonState, runCode]);

  // Auto-run driver: re-fires on every buffer edit and once when the
  // runtime loads. If a run is in flight when the debounce fires, the
  // timer re-arms — the last edit always wins.
  const autoRunTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hasPreview || !autoRun) return;
    if (!workspaceReady || !loaded) return;
    if (autoRunTimerRef.current !== null) {
      window.clearTimeout(autoRunTimerRef.current);
    }
    const fire = () => {
      autoRunTimerRef.current = null;
      if (statusStateRef.current === "running") {
        autoRunTimerRef.current = window.setTimeout(fire, 300);
        return;
      }
      runRef.current({ auto: true });
    };
    autoRunTimerRef.current = window.setTimeout(fire, 700);
    return () => {
      if (autoRunTimerRef.current !== null) {
        window.clearTimeout(autoRunTimerRef.current);
        autoRunTimerRef.current = null;
      }
    };
  }, [hasPreview, autoRun, workspaceReady, loaded, dirtyBuffers]);

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
    setOpenTabIds((prev) => [...prev, id]);
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
    setOpenTabIds,
    updateDirtyBuffer,
  ]);

  /** Toggle the Settings tab. Opens and activates it if not present,
   *  activates it if present but inactive, or closes it if already active. */
  const openSettingsTab = useCallback(() => {
    flushActiveFileToBuffer();
    if (activeTabIdRef.current === SETTINGS_TAB_ID) {
      // Settings tab is active, close it and return to the active file.
      setSettingsOpen(false);
      const targetId = activeFileIdRef.current;
      if (targetId) {
        setActiveTabId(targetId);
      } else if (filesRef.current.length > 0) {
        setActiveTabId(filesRef.current[0].id);
      }
    } else if (settingsOpenRef.current) {
      // Settings tab is in the tab bar but not active, activate it.
      setActiveTabId(SETTINGS_TAB_ID);
    } else {
      // Settings tab is not open, add it and make it active.
      setSettingsOpen(true);
      setActiveTabId(SETTINGS_TAB_ID);
    }
  }, [flushActiveFileToBuffer, setSettingsOpen, setActiveTabId]);

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

  /** Close a file's editor TAB. The file stays in the workspace so
   *  cross-file imports keep resolving; reopen from the Files pane, delete
   *  for real with `deleteWorkspaceFile`. */
  const closeFileTab = useCallback(
    (fileId: string) => {
      if (fileId === SETTINGS_TAB_ID) {
        closeSettingsTab();
        return;
      }
      // A locked workspace exposes no close affordance; the guard keeps a
      // future caller from routing around the lock.
      if (adapter.lockWorkspaceFiles) return;
      const open = openTabIdsRef.current;
      if (!open.includes(fileId)) return;
      if (open.length <= 1) {
        // The playground needs at least one editor target.
        showToast("Can't close the last open tab.", "warn");
        return;
      }
      const remaining = open.filter((id) => id !== fileId);
      setOpenTabIds(remaining);
      if (activeFileIdRef.current === fileId) {
        // Prefer the previous tab in tab order, else the first remaining.
        const closedIdx = open.indexOf(fileId);
        const next =
          remaining[Math.max(0, Math.min(closedIdx - 1, remaining.length - 1))] ??
          remaining[0];
        activeFileIdRef.current = next;
        setActiveFileId(next);
        setActiveTabId(next);
      }
    },
    [
      adapter.lockWorkspaceFiles,
      closeSettingsTab,
      setActiveFileId,
      setActiveTabId,
      setOpenTabIds,
      showToast,
    ],
  );

  /** Permanently delete a workspace file: tab, dirty buffer, output
   *  history, and OPFS copy. */
  const deleteWorkspaceFile = useCallback(
    (fileId: string) => {
      if (adapter.lockWorkspaceFiles) return;
      const current = filesRef.current;
      if (current.length <= 1) {
        // The playground needs at least one editor target.
        showToast("Can't delete the last file.", "warn");
        return;
      }
      if (!current.some((f) => f.id === fileId)) return;
      const wsId = workspaceIdRef.current;
      const remaining = current.filter((f) => f.id !== fileId);
      filesRef.current = remaining;
      setFiles(remaining);
      const openBefore = openTabIdsRef.current;
      const remainingOpen = openBefore.filter((id) => id !== fileId);
      setOpenTabIds(remainingOpen);
      clearDirtyBuffer(fileId);
      clearOutputsForFile(fileId);
      if (wsId) void opfsDeleteFile(wsId, fileId);
      markDirty();
      if (activeFileIdRef.current === fileId) {
        // Prefer the neighbouring OPEN tab, else the first remaining file
        // (the activation effect reopens its tab).
        const closedIdx = openBefore.indexOf(fileId);
        const next =
          remainingOpen[
            Math.max(0, Math.min(closedIdx - 1, remainingOpen.length - 1))
          ] ?? remaining[0].id;
        activeFileIdRef.current = next;
        setActiveFileId(next);
        setActiveTabId(next);
      }
    },
    [
      adapter.lockWorkspaceFiles,
      clearDirtyBuffer,
      clearOutputsForFile,
      markDirty,
      setActiveFileId,
      setActiveTabId,
      setFiles,
      setOpenTabIds,
      showToast,
    ],
  );

  const renameFileTab = useCallback(
    (fileId: string, newName: string) => {
      if (adapter.lockWorkspaceFiles) return;
      const trimmed = newName.trim();
      if (!trimmed) return;
      const target = filesRef.current.find((f) => f.id === fileId);
      if (!target) return;
      // Full path (contains "/") replaces the workspace path outright;
      // leaf-only renames preserve the existing parent directory.
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
    [adapter.lockWorkspaceFiles, setFiles, showToast],
  );

  /** Reorder the file tabs after a drag-and-drop, projecting the TabBar's
   *  new order back onto the OPEN-TAB list (the `files` array keeps its
   *  creation order). */
  const reorderFileTabs = useCallback(
    (nextDescriptors: TabDescriptor[]) => {
      // Keep the settings tab where the user dropped it.
      const newSettingsIdx = nextDescriptors.findIndex(
        (d) => d.id === SETTINGS_TAB_ID,
      );
      if (newSettingsIdx >= 0) setSettingsTabIndex(newSettingsIdx);

      const known = new Set(filesRef.current.map((f) => f.id));
      const nextOpen = nextDescriptors
        .map((d) => d.id)
        .filter((id) => id !== SETTINGS_TAB_ID && known.has(id));
      // Defensive: bail if any tabs would be dropped.
      const currentOpen = openTabIdsRef.current.filter((id) => known.has(id));
      if (nextOpen.length !== currentOpen.length) return;
      setOpenTabIds(nextOpen);
    },
    [setOpenTabIds, setSettingsTabIndex],
  );

  /** Duplicate a file tab: inserted after the source with a derived
   *  filename (`foo.py` → `foo_copy.py`, numeric suffixes on collision),
   *  copying the source's contents under a fresh id; becomes active. */
  const duplicateFileTab = useCallback(
    (fileId: string) => {
      flushActiveFileToBuffer();
      const current = filesRef.current;
      const idx = current.findIndex((f) => f.id === fileId);
      if (idx < 0) return;
      const source = current[idx];

      // Copy filename preserves extension + parent directory.
      const lastSlash = source.filename.lastIndexOf("/");
      const parentDir =
        lastSlash >= 0 ? source.filename.slice(0, lastSlash + 1) : "";
      const leaf =
        lastSlash >= 0 ? source.filename.slice(lastSlash + 1) : source.filename;
      const dot = leaf.lastIndexOf(".");
      const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
      const ext = dot > 0 ? leaf.slice(dot) : "";
      const taken = new Set(current.map((f) => f.filename.toLowerCase()));
      let copyName = `${parentDir}${stem}_copy${ext}`;
      let n = 2;
      while (taken.has(copyName.toLowerCase())) {
        copyName = `${parentDir}${stem}_copy_${n}${ext}`;
        n += 1;
      }

      const wsId = workspaceIdRef.current;
      const newId = newFileId();
      const copy: PlaygroundFile = {
        id: newId,
        filename: copyName,
        pristineFilename: copyName,
      };
      const next = [...current.slice(0, idx + 1), copy, ...current.slice(idx + 1)];
      filesRef.current = next;
      setFiles(next);
      // Open the duplicate's tab right after the source's (or at the
      // end when the source's own tab is closed).
      setOpenTabIds((prev) => {
        const at = prev.indexOf(fileId);
        return at >= 0
          ? [...prev.slice(0, at + 1), newId, ...prev.slice(at + 1)]
          : [...prev, newId];
      });

      // Mirror the source's current buffer (the active tab was just
      // flushed above) into the duplicate.
      const sourceContent = dirtyBuffersRef.current.get(source.id) ?? "";
      updateDirtyBuffer(newId, sourceContent);
      if (wsId) opfsWriteFile(wsId, newId, sourceContent);

      activeFileIdRef.current = newId;
      setActiveFileId(newId);
      setActiveTabId(newId);
    },
    [
      flushActiveFileToBuffer,
      setActiveFileId,
      setActiveTabId,
      setFiles,
      setOpenTabIds,
      updateDirtyBuffer,
    ],
  );

  /** Close every OPEN TAB except `fileId`'s (files stay in the workspace);
   *  the kept tab becomes active. */
  const closeOtherFileTabs = useCallback(
    (fileId: string) => {
      // Sets `openTabIds` directly, so it needs its own lock check.
      if (adapter.lockWorkspaceFiles) return;
      if (!filesRef.current.some((f) => f.id === fileId)) return;
      if (openTabIdsRef.current.length <= 1) return;
      flushActiveFileToBuffer();
      setOpenTabIds([fileId]);
      activeFileIdRef.current = fileId;
      setActiveFileId(fileId);
      setActiveTabId(fileId);
    },
    [
      adapter.lockWorkspaceFiles,
      flushActiveFileToBuffer,
      setActiveFileId,
      setActiveTabId,
      setOpenTabIds,
    ],
  );

  // ─── Merge workspace tabs into the Files pane ─────────────────────────
  // The Files pane shows workspace code files (dirty buffer + OPFS) and
  // user data files (OPFS under `data/`). On a path collision the code
  // file wins — it's the live editor target — and the data file is hidden.

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
      // Real UTF-8 bytes, so the column agrees with os.path.getsize() inside
      // the runtime for files containing accented text, CJK or emoji.
      size: utf8ByteLength(dirtyBuffers.get(f.id) ?? ""),
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
        // buffer into a Blob.
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
        // Removes the code file for real (the panel confirmed first);
        // `deleteWorkspaceFile` refuses to drop the last file.
        deleteWorkspaceFile(tabId);
        return;
      }
      handleFilesDelete(path);
    },
    [deleteWorkspaceFile, handleFilesDelete, tabIdForFilesPath],
  );

  /** Files-pane "Open in editor": (re)open a code file's tab and activate
   *  it. Data files have no editor; the panel gates on `canOpenFile`. */
  const handleOpenFileFromPane = useCallback(
    (path: string) => {
      const tabId = tabIdForFilesPath(path);
      if (!tabId) return;
      flushActiveFileToBuffer();
      setOpenTabIds((prev) =>
        prev.includes(tabId) ? prev : [...prev, tabId],
      );
      activeFileIdRef.current = tabId;
      setActiveFileId(tabId);
      setActiveTabId(tabId);
    },
    [
      flushActiveFileToBuffer,
      setActiveFileId,
      setActiveTabId,
      setOpenTabIds,
      tabIdForFilesPath,
    ],
  );

  const mergedHandleFilesRename = useCallback(
    (oldPath: string, newPath: string) => {
      const tabId = tabIdForFilesPath(oldPath);
      if (tabId) {
        // FilesPanel hands us the reconstructed full path; `renameFileTab`
        // handles collision detection.
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
        // Code file move: relocate preserving the leaf filename;
        // `renameFileTab` handles the collision check.
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

  // Apply an example immediately (use `requestExample` for user picks so
  // we can prompt first). Multi-file examples replace the whole workspace
  // file set; single-file examples replace only the active editor.
  const applyExample = useCallback(
    (ex: ExampleSnippet) => {
      if (ex.files && ex.files.length > 0) {
        const entryFilename =
          ex.entryFilename ?? primaryEntryFilename(adapter);
        // Wipe OPFS copies of the previous file set; the workspace id stays
        // stable so the URL doesn't change.
        const wsId = workspaceIdRef.current;
        if (wsId) {
          for (const f of filesRef.current) {
            void opfsDeleteFile(wsId, f.id);
          }
        }
        const entryFile: PlaygroundFile = {
          id: newFileId(),
          filename: entryFilename,
          pristineFilename: entryFilename,
        };
        const extraFiles: PlaygroundFile[] = ex.files.map((ef) => ({
          id: newFileId(),
          filename: ef.filename,
          pristineFilename: ef.filename,
        }));
        const newFiles = [entryFile, ...extraFiles];

        // Seed every file's dirty buffer + OPFS copy.
        updateDirtyBuffer(entryFile.id, ex.code);
        if (wsId) void opfsWriteFile(wsId, entryFile.id, ex.code);
        for (let i = 0; i < ex.files.length; i++) {
          const ef = ex.files[i];
          const f = extraFiles[i];
          updateDirtyBuffer(f.id, ef.content);
          if (wsId) void opfsWriteFile(wsId, f.id, ef.content);
        }

        setFiles(newFiles);
        filesRef.current = newFiles;
        setOpenTabIds(newFiles.map((f) => f.id));
        setActiveFileId(entryFile.id);
        setActiveTabId(entryFile.id);
        activeFileIdRef.current = entryFile.id;

        // Replace the editor doc with the entry file's code.
        const view = editorRef.current;
        if (view) {
          suppressPersistRef.current = true;
          try {
            view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: ex.code },
            });
          } finally {
            suppressPersistRef.current = false;
          }
          view.focus();
        }
        setMobileTab(MOBILE_EDITOR_TAB);
        showToast(`Loaded ${ex.title} (${newFiles.length} files).`);
        return;
      }

      // Single-file fallback: replace the active editor's contents; in the
      // split view, write the buffer and let the pane sync itself.
      const view = editorRef.current;
      if (view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: ex.code },
        });
        view.focus();
      } else {
        const fileId = activeFileIdRef.current;
        if (fileId) {
          updateDirtyBuffer(fileId, ex.code);
          const wsId = workspaceIdRef.current;
          if (wsId) void opfsWriteFile(wsId, fileId, ex.code);
        }
      }
      setMobileTab(MOBILE_EDITOR_TAB);
      showToast(`Loaded ${ex.title} in the editor.`);
    },
    [
      adapter,
      setActiveFileId,
      setActiveTabId,
      setFiles,
      setOpenTabIds,
      showToast,
      updateDirtyBuffer,
    ],
  );

  const requestExample = useCallback(
    (ex: ExampleSnippet) => {
      // Split view: the panes' contents live in the dirty buffers.
      const current =
        (splitActiveRef.current
          ? dirtyBuffersRef.current.get(activeFileIdRef.current ?? "")
          : editorRef.current?.state.doc.toString()
        )?.trim() ?? "";
      // Prompt only when the editor holds content that isn't already the
      // chosen example.
      if (current.length > 0 && current !== ex.code.trim()) {
        setPendingExample(ex);
        return;
      }
      applyExample(ex);
    },
    [applyExample],
  );

  // Wrap a package's `example` snippet in the ExampleSnippet shape so the
  // discard-confirm flow is reused; close the drawer first so the dialog
  // isn't covered.
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
      // Cursor lands right after the inserted import line.
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
      // Split view: the panes' contents live in the dirty buffers.
      const code = splitActiveRef.current
        ? (dirtyBuffersRef.current.get(activeFileIdRef.current ?? "") ?? "")
        : (editorRef.current?.state.doc.toString() ?? "");
      const blob = new Blob([code], { type: format.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Prefer the active file's leaf name over the adapter's generic
      // export name, so `src/utils.py` downloads as `utils.<ext>`.
      const active = filesRef.current.find(
        (f) => f.id === activeFileIdRef.current,
      );
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

  /** Formats that match the file that is actually open. */
  const exportFormatsForActiveFile = useMemo(() => {
    const active = files.find((f) => f.id === activeFileId);
    const forFile = active
      ? adapter.exportFormatsForFile?.(active.filename)
      : undefined;
    return forFile ?? adapter.exportFormats;
  }, [adapter, files, activeFileId]);

  /** Download the whole workspace as the one artifact it composes into. */
  const exportProject = useCallback(async () => {
    const spec = adapter.exportProject;
    if (!spec) return;
    const sources = filesRef.current.map((f) => ({
      filename: f.filename,
      content: dirtyBuffersRef.current.get(f.id) ?? "",
    }));
    const entry =
      filesRef.current.find((f) => f.id === outputFileIdRef.current)?.filename ??
      sources[0]?.filename ??
      "";
    const text = spec.compose(sources, entry);
    if (text === null) {
      showToast("Nothing to export yet.");
      return;
    }
    const blob = new Blob([text], { type: spec.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${adapter.exportBaseFilename}.${spec.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [adapter, showToast]);

  /** Download every file in the workspace as one .zip, at its own path. */
  const exportWorkspace = useCallback(async () => {
    const wsId = workspaceIdRef.current;
    const ok = wsId ? await downloadWorkspaceZip(wsId) : false;
    if (!ok) {
      showToast("Nothing to download yet, save the workspace first.");
    }
  }, [showToast]);

  // Copy text to the clipboard, falling back to legacy `execCommand` for
  // non-secure contexts; surfaces success/failure via toast.
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
    // Split view: copy the focused pane's contents (its buffer is kept
    // current by the pane's write-through listener).
    const code = splitActiveRef.current
      ? (dirtyBuffersRef.current.get(activeFileIdRef.current ?? "") ?? "")
      : (editorRef.current?.state.doc.toString() ?? "");
    if (!code) {
      showToast("Editor is empty.", "warn");
      return;
    }
    void copyToClipboard(code, "Code");
  }, [copyToClipboard, showToast]);

  const handleFormatCode = useCallback(async () => {
    if (!adapter.formatCode) return;
    // Tabs mode: the single editor. Split view: the focused pane's view.
    const view = splitActiveRef.current
      ? (splitViewsRef.current.get(activeFileIdRef.current ?? "") ?? null)
      : editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    setIsFormatting(true);
    try {
      // Pass the active filename so mixed-language workspaces (web:
      // .html/.css/.js) format with the right dialect.
      const activeFilename = filesRef.current.find(
        (f) => f.id === activeFileIdRef.current,
      )?.filename;
      const formatted = await adapter.formatCode(code, activeFilename);
      if (formatted === code) {
        showToast("Already formatted, nothing to change.");
        return;
      }
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
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

  // Per-pane Copy/Format for the split view, each pane header carries
  // its own buttons so it's unambiguous which file they act on.
  const copySplitFile = useCallback(
    (fileId: string) => {
      const code =
        dirtyBuffersRef.current.get(fileId) ??
        splitViewsRef.current.get(fileId)?.state.doc.toString() ??
        "";
      if (!code) {
        showToast("Editor is empty.", "warn");
        return;
      }
      void copyToClipboard(code, "Code");
    },
    [copyToClipboard, showToast],
  );

  const formatSplitFile = useCallback(
    async (fileId: string) => {
      if (!adapter.formatCode) return;
      const view = splitViewsRef.current.get(fileId);
      if (!view) return;
      const code = view.state.doc.toString();
      setFormattingSplitId(fileId);
      try {
        // Pass the pane's filename so mixed-language workspaces (web:
        // .html/.css/.js) format with the right dialect.
        const filename = filesRef.current.find(
          (f) => f.id === fileId,
        )?.filename;
        const formatted = await adapter.formatCode(code, filename);
        if (formatted === code) {
          showToast("Already formatted, nothing to change.");
          return;
        }
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
        });
        showToast("Code formatted.", "info");
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        showToast(
          reason ? `Formatting failed: ${reason}` : "Formatting failed.",
          "warn",
        );
      } finally {
        setFormattingSplitId(null);
      }
    },
    [adapter, showToast],
  );

  // ─── AI-suggested edit review (Ask AI panel → in-editor diff) ──────────
  // Ask AI can propose new contents for a workspace file; we open a
  // CodeMirror unified merge view (doc = proposal, baseline = previous
  // contents) with per-chunk Accept/Reject, plus a banner to finish or
  // revert the review.
  interface AiReviewState {
    fileId: string;
    filename: string;
    /** The file's contents when the review opened, "Revert all" target. */
    original: string;
    /** Compartment holding the merge extension in the target view. */
    comp: Compartment;
    /** Which editor family hosted the review (split pane vs tabbed). */
    split: boolean;
  }
  const [aiReview, setAiReview] = useState<AiReviewState | null>(null);
  const aiReviewRef = useRef<AiReviewState | null>(null);
  useEffect(() => {
    aiReviewRef.current = aiReview;
  }, [aiReview]);
  // A suggestion accepted by the handler but not yet materialized in an
  // editor, applied by the effect below AFTER the tab-switch doc sync.
  const [pendingAiEdit, setPendingAiEdit] = useState<{
    fileId: string;
    filename: string;
    content: string;
  } | null>(null);

  /** The live EditorView showing `fileId`, if any. */
  const viewForFile = useCallback((fileId: string): EditorView | null => {
    if (splitActiveRef.current) {
      return splitViewsRef.current.get(fileId) ?? null;
    }
    return activeFileIdRef.current === fileId ? editorRef.current : null;
  }, []);

  const endAiReview = useCallback(
    (keep: boolean) => {
      const review = aiReviewRef.current;
      if (!review) return;
      const view = viewForFile(review.fileId);
      if (view) {
        if (!keep) {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: review.original,
            },
          });
        }
        view.dispatch({ effects: review.comp.reconfigure([]) });
        view.focus();
      } else if (!keep) {
        // The review's editor is gone; restore the buffer directly.
        updateDirtyBuffer(review.fileId, review.original);
        const wsId = workspaceIdRef.current;
        if (wsId) opfsWriteFile(wsId, review.fileId, review.original);
      }
      setAiReview(null);
    },
    [updateDirtyBuffer, viewForFile],
  );

  // Materialize a pending suggestion once the target editor is showing the
  // file (the tab-switch doc sync above runs first, effect order matters).
  useEffect(() => {
    if (!pendingAiEdit) return;
    const view = viewForFile(pendingAiEdit.fileId);
    if (!view) return; // wait for the view to mount / tab to activate
    const original = view.state.doc.toString();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consume-once queue: the pending suggestion is cleared the moment it materializes
    setPendingAiEdit(null);
    if (original === pendingAiEdit.content) {
      showToast("The file already matches the AI suggestion.");
      return;
    }
    const comp = new Compartment();
    // Baseline first, then swap the doc to the proposal; the persist
    // listeners treat the proposal like any edit (so Run previews it).
    view.dispatch({
      effects: StateEffect.appendConfig.of(
        comp.of(unifiedMergeView({ original, mergeControls: true })),
      ),
    });
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: pendingAiEdit.content },
    });
    setAiReview({
      fileId: pendingAiEdit.fileId,
      filename: pendingAiEdit.filename,
      original,
      comp,
      split: splitActiveRef.current,
    });
  }, [pendingAiEdit, activeFileId, splitActive, showToast, viewForFile]);

  // A review can't survive its editor: switching tabs away (tabbed mode)
  // or toggling the split/tabbed layout replaces or remounts the view, so
  // treat either as "revert the suggestion".
  useEffect(() => {
    const review = aiReviewRef.current;
    if (!review) return;
    const detached =
      review.split !== splitActive ||
      (!review.split && activeFileId !== review.fileId) ||
      !files.some((f) => f.id === review.fileId);
    if (!detached) return;
    // The tabbed editor may now show ANOTHER file with the merge extension
    // still attached, strip it before restoring the reviewed file's buffer.
    if (!review.split && editorRef.current) {
      editorRef.current.dispatch({ effects: review.comp.reconfigure([]) });
    }
    updateDirtyBuffer(review.fileId, review.original);
    const wsId = workspaceIdRef.current;
    if (wsId && files.some((f) => f.id === review.fileId)) {
      opfsWriteFile(wsId, review.fileId, review.original);
    }
    setAiReview(null);
  }, [activeFileId, splitActive, files, updateDirtyBuffer]);

  // Filenames the model may create when the user asked for a new file.
  const SAFE_NEW_FILENAME = /^[A-Za-z0-9_][A-Za-z0-9._/-]{0,99}$/;

  useEffect(() => {
    return registerAiEditHandler(adapter.id, (suggestion: AiEditSuggestion) => {
      if (!workspaceReadyRef.current) {
        return { ok: false, reason: "unavailable" };
      }
      if (aiReviewRef.current) return { ok: false, reason: "busy" };
      const existing =
        filesRef.current.find((f) => f.filename === suggestion.filename) ??
        filesRef.current.find(
          (f) => f.filename.split("/").pop() === suggestion.filename,
        );
      flushActiveFileToBuffer();
      if (!existing) {
        // Brand-new file: no baseline to diff, create and open it.
        if (
          !SAFE_NEW_FILENAME.test(suggestion.filename) ||
          suggestion.filename.includes("..") ||
          filesRef.current.length >= 50
        ) {
          return { ok: false, reason: "unavailable" };
        }
        const wsId = workspaceIdRef.current;
        const id = newFileId();
        const file: PlaygroundFile = {
          id,
          filename: suggestion.filename,
          pristineFilename: suggestion.filename,
        };
        const next = [...filesRef.current, file];
        filesRef.current = next;
        setFiles(next);
        setOpenTabIds((prev) => [...prev, id]);
        updateDirtyBuffer(id, suggestion.content);
        if (wsId) opfsWriteFile(wsId, id, suggestion.content);
        markDirty();
        activeFileIdRef.current = id;
        setActiveFileId(id);
        setActiveTabId(id);
        showToast(`Created ${suggestion.filename} from the AI suggestion.`, "info");
        return { ok: true };
      }
      const current = dirtyBuffersRef.current.get(existing.id) ?? "";
      if (current === suggestion.content) {
        return { ok: false, reason: "unchanged" };
      }
      if (splitActiveRef.current) {
        focusSplitFile(existing.id);
      } else {
        activeFileIdRef.current = existing.id;
        setActiveFileId(existing.id);
        setActiveTabId(existing.id);
      }
      setPendingAiEdit({
        fileId: existing.id,
        filename: existing.filename,
        content: suggestion.content,
      });
      return { ok: true };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adapter.id,
    flushActiveFileToBuffer,
    focusSplitFile,
    markDirty,
    setActiveFileId,
    setActiveTabId,
    setFiles,
    showToast,
    updateDirtyBuffer,
  ]);

  // Auto-scroll output on new cells.
  useEffect(() => {
    scrollToLatestOutput();
  }, [outputs, scrollToLatestOutput]);

  // ─── Resizer ────────────────────────────────────────────────────────────
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
      // Editors-right: the editor pane is the second grid column, so a
      // rightward drag SHRINKS it.
      const reversed = panes.dataset.editorPosition === "right";
      const delta = ((reversed ? -1 : 1) * (e.clientX - startX)) / panes.offsetWidth;
      const frac = Math.min(0.8, Math.max(0.2, startFrac + delta));
      panes.style.gridTemplateColumns = reversed
        ? `${(1 - frac) * 100}% ${frac * 100}%`
        : `${frac * 100}% 1fr`;
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

  // One merged output frame per run, notebook-style. Cells without a runId
  // (defensive, shouldn't occur) each get their own group.
  const outputGroups = useMemo(() => {
    const groups: OutputCell[][] = [];
    let current: OutputCell[] | null = null;
    let currentRun: number | undefined;
    for (const cell of outputs) {
      if (current && cell.runId !== undefined && cell.runId === currentRun) {
        current.push(cell);
      } else {
        current = [cell];
        currentRun = cell.runId;
        groups.push(current);
      }
    }
    return groups;
  }, [outputs]);

  // ─── Stacked run history ─────────────────────────────────────────────
  // One slim cell per run. Numbers stay stable across individual dismissals
  // and restart from 1 after Clear: rank a group's runId among every runId
  // seen since the last clear (visible ∪ dismissed).
  const [dismissedRuns, setDismissedRuns] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );
  const [outputCleared, setOutputCleared] = useState(false);
  // A fresh run retires the "cleared" note; adjusted during render rather
  // than in an effect.
  if (outputCleared && outputs.length > 0) setOutputCleared(false);
  // Height of the preview playgrounds' console strip. A fixed strip is
  // about eight lines, which is thin for the only surface errors appear
  // on; the drag handle is remembered per browser, not per workspace.
  const CONSOLE_MIN_HEIGHT = 72;
  const CONSOLE_DEFAULT_HEIGHT = 168;
  const [consoleHeight, setConsoleHeightState] = useState(CONSOLE_DEFAULT_HEIGHT);
  useEffect(() => {
    if (!hasPreview) return;
    try {
      const stored = Number(
        window.localStorage.getItem(`playground_${adapter.id}_consoleheight`),
      );
      if (Number.isFinite(stored) && stored >= CONSOLE_MIN_HEIGHT) {
        /* Deterministic-SSR pattern, see the split-view hydration note. */
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setConsoleHeightState(stored);
      }
    } catch {
      /* private mode, keep the default. */
    }
  }, [adapter.id, hasPreview]);
  const setConsoleHeight = useCallback(
    (next: number) => {
      setConsoleHeightState(next);
      try {
        window.localStorage.setItem(
          `playground_${adapter.id}_consoleheight`,
          String(next),
        );
      } catch {
        /* private mode, the drag still applies for this session. */
      }
    },
    [adapter.id],
  );
  const resetConsoleHeight = useCallback(() => {
    setConsoleHeight(CONSOLE_DEFAULT_HEIGHT);
  }, [setConsoleHeight]);
  const beginConsoleResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const startY = event.clientY;
      const strip = handle.parentElement;
      const content = strip?.querySelector(".web-console-content");
      const startHeight =
        content?.getBoundingClientRect().height ?? CONSOLE_DEFAULT_HEIGHT;
      // Leave room for the preview: a console that eats the whole pane
      // hides the thing it is narrating.
      const maxHeight = Math.max(
        CONSOLE_MIN_HEIGHT,
        (strip?.parentElement?.getBoundingClientRect().height ??
          startHeight * 4) - 140,
      );
      handle.setPointerCapture(event.pointerId);
      const onMove = (move: PointerEvent) => {
        const next = startHeight - (move.clientY - startY);
        setConsoleHeight(
          Math.min(maxHeight, Math.max(CONSOLE_MIN_HEIGHT, Math.round(next))),
        );
      };
      const onUp = () => {
        handle.releasePointerCapture(event.pointerId);
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [setConsoleHeight],
  );

  const runNumbers = useMemo(() => {
    const ids = new Set<number>(dismissedRuns);
    for (const group of outputGroups) {
      if (group[0].runId !== undefined) ids.add(group[0].runId);
    }
    const sorted = [...ids].sort((a, b) => a - b);
    const map = new Map<number, number>();
    sorted.forEach((id, i) => map.set(id, i + 1));
    return map;
  }, [outputGroups, dismissedRuns]);
  const dismissRun = useCallback(
    (runId: number | undefined, firstCellId: number) => {
      const fileId = outputFileId;
      if (!fileId) return;
      setOutputsForFile(fileId, (prev) =>
        prev.filter((c) =>
          runId !== undefined ? c.runId !== runId : c.id !== firstCellId,
        ),
      );
      if (runId !== undefined) {
        setDismissedRuns((prev) => new Set(prev).add(runId));
      }
    },
    [outputFileId, setOutputsForFile],
  );
  const clearRunHistory = useCallback(() => {
    clearOutput();
    setDismissedRuns(new Set());
    setOutputCleared(true);
  }, [clearOutput]);

  // ⋯ menu: labelled sections whose items either act directly or slide to
  // a sub-panel (Examples, Export, Runtime info).
  const playgroundMoreSections = useMemo<MoreMenuSection[]>(
    () => [
      {
        label: "Resources",
        items: [
          {
            key: "examples",
            label: "Examples",
            icon: Library,
            hint: adapter.examples.length,
            panel: {
              title: "Examples",
              render: (close: () => void) => (
                <>
                  {adapter.examples.map((ex) => (
                    <button
                      type="button"
                      key={ex.key}
                      className="example-item"
                      onClick={() => {
                        close();
                        requestExample(ex);
                      }}
                    >
                      <div className="ex-title">{ex.title}</div>
                      <div className="ex-desc">{ex.desc}</div>
                    </button>
                  ))}
                </>
              ),
            },
          },
          ...(adapter.packages.length > 0
            ? [
                {
                  key: "packages",
                  label: "Packages",
                  icon: Package,
                  hint: adapter.packages.length,
                  onSelect: () => setPackagesOpen(true),
                },
              ]
            : []),
        ],
      },
      {
        label: "Actions",
        items: [
          {
            key: "export",
            label: "Export",
            icon: ArrowDownToLine,
            panel: {
              title: "Export",
              render: (close: () => void) => (
                <>
                  {exportFormatsForActiveFile.map((fmt) => (
                    <button
                      type="button"
                      key={fmt.extension}
                      className="example-item"
                      onClick={() => {
                        close();
                        exportCode(fmt);
                      }}
                    >
                      <div className="ex-title">
                        {fmt.label}
                        <span className="ext-badge">.{fmt.extension}</span>
                      </div>
                      <div className="ex-desc">
                        Downloads the open file only, as .{fmt.extension}
                      </div>
                    </button>
                  ))}
                  {adapter.exportProject && (
                    <button
                      type="button"
                      className="example-item"
                      onClick={() => {
                        close();
                        void exportProject();
                      }}
                    >
                      <div className="ex-title">
                        {adapter.exportProject.label}
                        <span className="ext-badge">
                          .{adapter.exportProject.extension}
                        </span>
                      </div>
                      <div className="ex-desc">
                        {adapter.exportProject.description}
                      </div>
                    </button>
                  )}
                  {/* The whole-workspace download also lives under
                      Save -> Download copy, but a multi-file project is
                      exactly what someone opening an Export menu is
                      looking for. */}
                  <button
                    type="button"
                    className="example-item"
                    onClick={() => {
                      close();
                      void exportWorkspace();
                    }}
                  >
                    <div className="ex-title">
                      Whole workspace
                      <span className="ext-badge">.zip</span>
                    </div>
                    <div className="ex-desc">
                      Every file in this workspace, at its own path
                    </div>
                  </button>
                </>
              ),
            },
          },
        ],
      },
      {
        label: "Playground",
        items: [
          {
            key: "info",
            label: "Runtime info",
            icon: Info,
            panel: {
              title: "Runtime info",
              render: () => (
                <div className="ph-more-info">
                  <RuntimeInfoContent info={adapter.runtimeInfo} />
                </div>
              ),
            },
          },
          {
            key: "workspaces",
            label: "Workspaces",
            icon: FolderOpen,
            onSelect: () => setWorkspaceManagerOpen(true),
          },
          {
            key: "settings",
            label: "Settings",
            icon: Settings,
            onSelect: openSettingsTab,
          },
        ],
      },
    ],
    [
      adapter,
      requestExample,
      exportCode,
      exportFormatsForActiveFile,
      exportProject,
      exportWorkspace,
      openSettingsTab,
    ],
  );

  // Account group as the ⋯ menu's last section; null while the first
  // session fetch is in flight, so nothing flashes.
  const accountSection = useAccountMenuSection();
  const moreMenuSections = useMemo<MoreMenuSection[]>(
    () =>
      accountSection
        ? [...playgroundMoreSections, accountSection]
        : playgroundMoreSections,
    [playgroundMoreSections, accountSection],
  );

  // Rotate the loading quips while the runtime initialises. Index 0 first
  // so SSR and the first client paint match; the random offset is captured
  // once on mount and applied on the first tick, so effect re-runs don't
  // re-roll the start position.
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
      // First tick jumps to the random starting quip; later ticks advance
      // by one.
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
      // OPEN tabs only, a subset of the workspace files.
      const byId = new Map(files.map((f) => [f.id, f]));
      const openFiles = openTabIds
        .map((id) => byId.get(id))
        .filter((f): f is PlaygroundFile => Boolean(f));
      const multiple = openFiles.length > 1;
      const locked = adapter.lockWorkspaceFiles === true;
      // The context-menu closures read refs, but only on user click, never
      // during render — the rule's transitive check is a false alarm.
      // eslint-disable-next-line react-hooks/refs
      const list: TabDescriptor[] = openFiles.map((f) => {
        // The tab strip shows only the leaf of a multi-segment path.
        const leaf = f.filename.split("/").pop() ?? f.filename;
        // A locked workspace (web) gets no per-tab actions: every item
        // closes a tab or changes which files exist, and that adapter has
        // no Files pane to undo it with (see `lockWorkspaceFiles`).
        const extras: TabContextMenuItem[] = [];
        if (!locked) {
          extras.push({
            key: "duplicate",
            label: "Duplicate",
            onSelect: () => duplicateFileTab(f.id),
          });
          if (multiple) {
            extras.push({
              key: "close-others",
              label: "Close Others",
              onSelect: () => closeOtherFileTabs(f.id),
            });
          }
          extras.push({
            key: "delete-file",
            label: "Delete File",
            onSelect: () => deleteWorkspaceFile(f.id),
          });
        }
        return {
          id: f.id,
          kind: "code" as const,
          label: leaf,
          icon: <FileCode2 size={11} aria-hidden="true" />,
          closeable: multiple && !locked,
          renameable: !locked,
          renameDialogTitle: "Rename file",
          renameDialogDescription:
            "Use a leaf name (e.g. utils.py) to keep the file in its current folder, or a full path to move it.",
          renameSelectsStem: true,
          contextMenuItems: extras,
        };
      });
      if (settingsOpen) {
        const settingsDescriptor: TabDescriptor = {
          id: SETTINGS_TAB_ID,
          kind: "settings",
          label: "Settings",
          icon: <Settings size={11} aria-hidden="true" />,
          closeable: true,
          renameable: false,
        };
        // Insert at the tracked position, clamped so a stale index never
        // goes out of bounds.
        const insertAt = Math.min(
          Number.isFinite(settingsTabIndex) ? settingsTabIndex : list.length,
          list.length,
        );
        list.splice(insertAt, 0, settingsDescriptor);
      }
      return list;
    },
    [
      adapter.lockWorkspaceFiles,
      closeOtherFileTabs,
      deleteWorkspaceFile,
      duplicateFileTab,
      files,
      openTabIds,
      settingsOpen,
      settingsTabIndex,
    ],
  );

  const capabilitiesBlurb = useMemo(
    () => buildCapabilitiesBlurb(adapter.outputCapabilities),
    [adapter.outputCapabilities],
  );

  // Shared props for the virtual-filesystem panel (desktop side panel and
  // mobile bottom sheet), so file management is reachable on every
  // breakpoint.
  const filesPanelProps = {
    files: mergedVirtualFiles,
    expandedFolders,
    onToggleFolder: handleFilesToggleFolder,
    onUpload: handleFilesUpload,
    onDownload: mergedHandleFilesDownload,
    onDelete: mergedHandleFilesDelete,
    onRename: mergedHandleFilesRename,
    onCreateFolder: handleFilesCreateFolder,
    onCreateFile: handleFilesCreateFile,
    onMove: mergedHandleFilesMove,
    // Code files open back into the editor; data files have no editor.
    onOpenFile: handleOpenFileFromPane,
    canOpenFile: (path: string) => Boolean(tabIdForFilesPath(path)),
  };

  return (
    <div className="playground-root">
      {showLoadingOverlay && (
        <PlaygroundBootOverlay
          title={adapter.displayName.replace(/\s*Playground$/i, "")}
          statusMessage={
            statusState === "error"
              ? loadingMessage
              : loadingMessage || LOADING_QUIPS[quipIndex]
          }
          fraction={bootDisplayFraction}
          error={statusState === "error"}
          className={loadingFading ? "hidden" : ""}
        />
      )}

      <div className="playground-app">
        <header className="playground-header">
          <div className="logo">
            {!embedded && (
              <Link href="/" aria-label="Dataslope home" className="ds-logo-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo ds-logo-mark" />
              </Link>
            )}
            {/* Hidden when embedded (home page iframe): switching is done by
                the page's own switcher. */}
            {!embedded && (
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
                {/* The label is hidden below 768px (the icon already
                    identifies the language) so the header has room for the
                    logo; the dropdown items keep their labels either way. */}
                <Select.Value className="playground-switcher-label">
                  {PLAYGROUNDS.find((p) => p.id === adapter.id)?.label ??
                    adapter.id}
                </Select.Value>
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
                <Select.Positioner sideOffset={0} alignItemWithTrigger={false} className="playground-lang-switcher-positioner">
                  <Select.Popup className="bui-select-popup playground-lang-switcher-popup">
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
            )}
          </div>
          {/* Workspace name + inline rename; switching/management lives in
              /dashboard/playground and the ⋯ menu's Workspaces. */}
          {workspaceReady && !embedded && (
            <>
              <HeaderDivider />
              <span className="ph-name-group">
                <WorkspaceNameControl
                  workspaceId={workspaceId}
                  name={workspaceName}
                  onRenamed={(name) => {
                    if (workspaceId) setWorkspace(workspaceId, name);
                  }}
                />
                <NewWorkspaceControl playgroundId={adapter.id} />
              </span>
            </>
          )}

          <div className="header-sep" />

          {/* Right cluster: Save ▾ · Share · ⋯ */}
          <div className="ph-actions desktop-only">
            {workspaceReady && (
              <SaveControl
                playgroundId={adapter.id}
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                unsaved={!workspaceSaved && workspaceDirty}
                onSave={handleSaveWorkspace}
                buildBundle={buildCloudBundle}
                onNotify={showToast}
              />
            )}

            <ShareControls
              workspaceName={workspaceName}
              buildBundle={buildCloudBundle}
              excludedFiles={() => excludedShareFilesRef.current}
              shareOpen={shareDialogOpen}
              onShareOpenChange={setShareDialogOpen}
            />

            <MoreMenu sections={moreMenuSections} />
          </div>

          {/* Keeps the workspace manager drawer + auto-sync engine mounted;
              the badge itself no longer renders. */}
          {workspaceReady && (
            <WorkspaceBadge
              playgroundId={adapter.id}
              activeWorkspaceId={workspaceId}
              activeWorkspaceName={workspaceName}
              managerOpen={workspaceManagerOpen}
              onManagerOpenChange={setWorkspaceManagerOpen}
              unsaved={!workspaceSaved && workspaceDirty}
              onSave={handleSaveWorkspace}
              buildBundle={buildCloudBundle}
              hideBadge
            />
          )}

          {/* Mobile-only consolidated menu: Save / Share / Files up top,
              then the same sections as the desktop ⋯ menu. */}
          <MobileMenuSheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <MobileMenuLabel>Workspace</MobileMenuLabel>
            {workspaceReady && (
              <MobileSaveMenu
                playgroundId={adapter.id}
                workspaceId={workspaceId}
                workspaceName={workspaceName}
                unsaved={!workspaceSaved && workspaceDirty}
                onSave={handleSaveWorkspace}
                buildBundle={buildCloudBundle}
                onNotify={showToast}
              />
            )}
            <MobileMenuAction
              icon={Share2}
              label="Share"
              chevron
              onClick={() => setShareDialogOpen(true)}
            />
            {/* The desktop icon rail is hidden on mobile, so surface file
                management here as a bottom sheet. */}
            {!adapter.hideFilesPane && (
              <MobileMenuSubSheet
                icon={FolderTree}
                label="Files"
                bodyClassName="mobile-files-drawer-body"
              >
                <FilesPanel {...filesPanelProps} />
              </MobileMenuSubSheet>
            )}
            <MobileMoreSections sections={moreMenuSections} />
          </MobileMenuSheet>
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
        <Dialog.Root
          open={pendingExample !== null}
          onOpenChange={(next) => {
            if (!next) setPendingExample(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                Discard current code?
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Loading{" "}
                <strong>“{pendingExample?.title}”</strong>{" "}
                will overwrite the code currently in the editor. This
                can&rsquo;t be undone.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    if (pendingExample) applyExample(pendingExample);
                    setPendingExample(null);
                  }}
                >
                  Discard &amp; load
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Confirm restoring built-in defaults. */}
        <Dialog.Root
          open={confirmRestoreOpen}
          onOpenChange={setConfirmRestoreOpen}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                Restore default settings?
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                This will reset this playground&apos;s editor font size, word wrap,
                run/output preferences, and the shared editor theme to their
                built-in defaults. Your saved code is not affected.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    restoreDefaultSettings();
                    setConfirmRestoreOpen(false);
                  }}
                >
                  Restore defaults
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Confirm wiping every localStorage entry across all playgrounds. */}
        <Dialog.Root
          open={confirmClearStorageOpen}
          onOpenChange={setConfirmClearStorageOpen}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                Clear all localStorage data?
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                This will permanently delete every saved setting and code
                snippet across <strong>all playgrounds</strong>. The page
                will reload immediately. This can&rsquo;t be undone.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    clearAllLocalStorage();
                  }}
                >
                  Clear &amp; reload
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Nuclear wipe (localStorage + OPFS + IndexedDB + caches), with
            stronger language than the lighter dialog above. */}
        <Dialog.Root
          open={confirmClearAllDataOpen}
          onOpenChange={setConfirmClearAllDataOpen}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup" role="alertdialog">
              <Dialog.Title className="confirm-title">
                Clear all local data?
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                This will permanently delete every saved setting, code
                snippet, <strong>workspace</strong>, persisted{" "}
                <strong>database</strong>, and uploaded{" "}
                <strong>data file</strong> across{" "}
                <strong>all playgrounds</strong>, including localStorage,
                OPFS, IndexedDB, and any cached assets. The page will
                reload immediately. This can&rsquo;t be undone.
              </Dialog.Description>
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <Dialog.Close
                  className="confirm-btn confirm-btn-danger"
                  onClick={() => {
                    clearAllLocalData();
                  }}
                >
                  Clear &amp; reload
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="playground-body">
          {/* The icon rail only hosts the Editor/Files toggle pair, so
              adapters that hide the Files pane drop the whole rail. */}
          {!adapter.hideFilesPane && (
          <nav className="playground-icon-sidebar" aria-label="Panel navigation">
            <div className="playground-icon-sidebar-top">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={150}
                  closeDelay={100}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={`playground-icon-sidebar-btn${filesPaneOpen ? "" : " active"}`}
                      aria-label="Editor"
                      aria-pressed={!filesPaneOpen}
                      onClick={() => {
                        // Return to the editor (closing the Files panel)
                        // and focus CodeMirror — a real toggle, not a
                        // permanently-lit decoration.
                        setFilesPaneOpen(false);
                        editorRef.current?.focus();
                      }}
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
              {/* Files, toggles the virtual-filesystem sidebar panel. */}
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={150}
                  closeDelay={100}
                  render={(triggerProps) => (
                    <button
                      {...triggerProps}
                      type="button"
                      className={`playground-icon-sidebar-btn${filesPaneOpen ? " active" : ""}`}
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
          </nav>
          )}
          {!adapter.hideFilesPane && filesPaneOpen && (
            <div className="playground-files-sidebar">
              <div className="playground-files-sidebar-header">
                <span className="playground-files-sidebar-title">Files</span>
                <button
                  type="button"
                  className="playground-files-sidebar-close"
                  aria-label="Close files panel"
                  onClick={() => setFilesPaneOpen(false)}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
              <FilesPanel {...filesPanelProps} />
            </div>
          )}
          <div className="playground-body-content">
        {/* File tabs: switching swaps both the editor doc and the output
            history. In split view the bar only renders while the Settings
            tab is active; file management happens in Tabs mode. */}
        {files.length > 0 &&
          (!splitActive || activeTabId === SETTINGS_TAB_ID) && (
          <TabBar
            tabs={fileTabDescriptors}
            activeTabId={activeTabId || activeFileId}
            onSelectTab={selectTab}
            onCloseTab={closeFileTab}
            onAddTab={adapter.disableAddFile ? undefined : addNewFile}
            onRenameTab={renameFileTab}
            onReorderTabs={(files.length > 1 || settingsOpen) ? reorderFileTabs : undefined}
            className="playground-file-tabbar"
          />
        )}
        <div
          className="mobile-tabs"
          role="tablist"
          aria-label="Pane"
          data-settings-active={activeTabId === SETTINGS_TAB_ID || undefined}
        >
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

        <div
          className="panes"
          role="main"
          data-mobile-tab={mobileTab}
          data-settings-active={activeTabId === SETTINGS_TAB_ID || undefined}
          data-editor-position={hasPreview ? effectiveEditorPosition : undefined}
          ref={panesRef}
        >
          <h1 className="playground-sr-title">
            {`${PLAYGROUNDS.find((p) => p.id === adapter.id)?.label ?? adapter.id} playground`}
          </h1>
          <div className="editor-pane" ref={editorPaneRef}>
            <div className="pane-bar">
              <span className="pane-label">
                <Code2 size={12} aria-hidden="true" />
                Editor
              </span>
              <div className="pane-bar-sep" />
              <div className="pane-editor-btn-group">
                {/* Preview adapters keep auto-run ⚡ and the view menu on
                    the PREVIEW bar; non-preview split-capable adapters keep
                    the layout menu here. */}
                {!hasPreview && splitAvailable && (
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
                          aria-label="Change view"
                        >
                          {effectiveEditorPosition === "right" ? (
                            <PanelRight size={14} aria-hidden="true" />
                          ) : effectiveEditorPosition === "top" ? (
                            <PanelTop size={14} aria-hidden="true" />
                          ) : (
                            <PanelLeft size={14} aria-hidden="true" />
                          )}
                        </button>
                      )}
                    />
                    <Popover.Portal>
                      <Popover.Positioner sideOffset={6} align="start" side="bottom">
                        <Popover.Popup className="bui-popup change-view-menu">
                          <div className="change-view-title">Change View</div>
                          {hasPreview &&
                            (
                              [
                                { pos: "left", label: "Editors left", Icon: PanelLeft },
                                { pos: "top", label: "Editors top", Icon: PanelTop },
                                { pos: "right", label: "Editors right", Icon: PanelRight },
                              ] as const
                            ).map(({ pos, label, Icon }) => (
                              <button
                                key={pos}
                                type="button"
                                className={`change-view-item${
                                  effectiveEditorPosition === pos ? " selected" : ""
                                }`}
                                disabled={editorPinnedLeft}
                                // eslint-disable-next-line react-hooks/refs -- click handler; setEditorPosition touches panesRef only on invocation
                                onClick={() => setEditorPosition(pos)}
                              >
                                <Icon size={14} aria-hidden="true" />
                                <span>{label}</span>
                              </button>
                            ))}
                          {hasPreview && editorPinnedLeft && (
                            <div className="change-view-hint">
                              The tabbed editor keeps the editor on the left.
                            </div>
                          )}
                          {splitAvailable && (
                            <>
                              <div className="change-view-sep" role="separator" />
                              <div className="change-view-title">Editor Layout</div>
                              <button
                                type="button"
                                className={`change-view-item${splitActive ? " selected" : ""}`}
                                aria-pressed={splitActive}
                                onClick={() => setSplitView(true)}
                              >
                                <Rows3 size={14} aria-hidden="true" />
                                <span>Split editors (CodePen-style)</span>
                              </button>
                              <button
                                type="button"
                                className={`change-view-item${!splitActive ? " selected" : ""}`}
                                aria-pressed={!splitActive}
                                onClick={() => setSplitView(false)}
                              >
                                <FileCode size={14} aria-hidden="true" />
                                <span>Tabbed editor (manage files)</span>
                              </button>
                            </>
                          )}
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                )}
                {/* Split view: Copy/Format live in each pane's header. */}
                {!splitActive && (
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
                )}
                {!splitActive && adapter.formatCode && (
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
              <div
                className={`playground-run-multi${runButtonState.dropdownItems.length > 0 ? " has-dropdown" : ""}${statusState === "running" ? " running" : ""}${statusState === "running" && canStopRun ? " stoppable" : ""}`}
              >
                {/* While a stoppable runtime is running, the primary button
                    becomes Stop — an accidental `while True:` is one of the
                    likeliest things a beginner writes, and reloading the page
                    must not be the only way out. */}
                {statusState === "running" && canStopRun ? (
                  <button
                    type="button"
                    className="run-btn playground-run-multi-main stop"
                    onClick={() => void stopRun()}
                    disabled={stopping}
                    title="Stop the running program"
                  >
                    <Square size={9} aria-hidden="true" fill="currentColor" />
                    <span className="playground-run-multi-label">
                      {stopping ? "Stopping…" : "Stop"}
                    </span>
                  </button>
                ) : (
                <Popover.Root>
                  <Popover.Trigger
                    render={(props) => (
                      <button
                        {...props}
                        type="button"
                        className={`run-btn playground-run-multi-main${statusState === "running" ? " running" : ""}${runButtonState.dropdownItems.length > 0 ? " has-chevron" : ""}`}
                        // `stopping`: the previous run's Stop is still
                        // standing a fresh interpreter up.
                        disabled={!loaded || statusState === "running" || stopping}
                        onClick={() => {
                          void runCode(runButtonState.primaryEntry ?? undefined);
                        }}
                      >
                        {statusState === "running" ? (
                          <svg viewBox="0 0 12 12" className="run-btn-spinner">
                            <circle cx="6" cy="6" r="4.5" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="14 8" />
                          </svg>
                        ) : (
                          <Play size={10} aria-hidden="true" />
                        )}
                        <span className="playground-run-multi-label">
                          {statusState === "running"
                            ? "Running…"
                            : runButtonState.primaryLabel}
                        </span>
                      </button>
                    )}
                  />
                  {/* Hover popover surfaces the full label when the button
                      truncates. */}
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={6}>
                      <Popover.Popup className="bui-popup pane-btn-popover">
                        {runButtonState.primaryLabel}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                )}
                {runButtonState.dropdownItems.length > 0 && (
                  <Menu.Root>
                    <Menu.Trigger
                      render={(props) => (
                        <button
                          {...props}
                          type="button"
                          className={`run-btn playground-run-multi-chevron${statusState === "running" ? " running" : ""}`}
                          disabled={!loaded || statusState === "running" || stopping}
                          aria-label="More run options"
                        >
                          <ChevronDown size={12} aria-hidden="true" />
                        </button>
                      )}
                    />
                    <Menu.Portal>
                      <Menu.Positioner sideOffset={6} align="end">
                        <Menu.Popup className="bui-popup playground-run-multi-dropdown">
                          {runButtonState.dropdownItems.map((item, idx) => (
                            <Menu.Item
                              key={item.entryFilename}
                              className="playground-run-multi-item"
                              onClick={() => {
                                void runCode(item.entryFilename);
                              }}
                            >
                              <span className="playground-run-multi-item-label">
                                {item.label}
                              </span>
                              {idx === 0 && (
                                <span className="playground-run-multi-item-kbd">
                                  {isMac ? "⌘⇧Enter" : "Ctrl+Shift+Enter"}
                                </span>
                              )}
                            </Menu.Item>
                          ))}
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                )}
              </div>
            </div>
            {aiReview && (
              <div className="ai-review-bar" role="region" aria-label="AI suggested changes">
                <Wand2 size={13} aria-hidden="true" />
                <span className="ai-review-text">
                  AI suggested changes to{" "}
                  <code>{aiReview.filename}</code>, accept or reject each
                  chunk in the editor.
                </span>
                <div className="ai-review-actions">
                  <button
                    type="button"
                    className="ai-review-btn ai-review-keep"
                    onClick={() => endAiReview(true)}
                    title="Finish the review, keeping the changes as shown in the editor"
                  >
                    Keep result
                  </button>
                  <button
                    type="button"
                    className="ai-review-btn ai-review-revert"
                    onClick={() => endAiReview(false)}
                    title="Restore the file to how it was before the suggestion"
                  >
                    Revert all
                  </button>
                </div>
              </div>
            )}
            {splitActive ? (
              // CodePen-style split: panes write through to the dirty
              // buffers, so Run/Format/Copy read the same state as tabs.
              <PlaygroundSplitEditors
                adapter={adapter}
                files={files}
                buffers={dirtyBuffers}
                activeFileId={activeFileId}
                editorTheme={editorTheme}
                wordWrap={wordWrap}
                onChange={(fileId, content) => {
                  updateDirtyBuffer(fileId, content);
                  const wsId = workspaceIdRef.current;
                  if (wsId) opfsWriteFile(wsId, fileId, content);
                  markDirty();
                }}
                onFocusFile={focusSplitFile}
                onRun={() => runRef.current()}
                onRunSecondary={() => runSecondaryRef.current()}
                onAddFile={adapter.disableAddFile ? undefined : addNewFile}
                registerView={registerSplitEditorView}
                getRuntime={() => runtimeRef.current}
                onCopyFile={copySplitFile}
                onFormatFile={
                  adapter.formatCode
                    ? (fileId) => void formatSplitFile(fileId)
                    : undefined
                }
                formattingFileId={formattingSplitId}
              />
            ) : (
              <div
                className="editor-wrap"
                ref={editorHostRef}
              />
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
                {/* Count merged per-run frames, not raw cells. */}
                {outputGroups.length === 0
                  ? "Output"
                  : `${outputGroups.length} ${outputGroups.length === 1 ? "Output" : "Outputs"}`}
              </span>
              <div className="pane-bar-sep" />
              {outputGroups.length > 0 && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={clearRunHistory}
                  title="Clear all output"
                  aria-label="Clear all output"
                >
                  <Eraser size={13} aria-hidden="true" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            {/* role="log": run results land with no other cue a
                screen-reader user could notice. */}
            <div
              className={`output-body${hasPreview ? " web-preview-body" : " run-history"}`}
              ref={outputBodyRef}
              role="log"
              aria-live="polite"
              aria-label="Program output"
            >
              {hasPreview ? (
                <>
                  {/* Live page preview: always mounted so the slot exists
                      before the first run; the runtime swaps a sandboxed
                      iframe in on every run. The preview owns its controls
                      (auto-run ⚡ and the view menu). */}
                  <div className="web-preview-panel" data-testid="web-preview">
                    <div className="web-preview-header">
                      <span className="web-preview-label">Preview</span>
                      <div className="pane-bar-sep" />
                      <Popover.Root>
                        <Popover.Trigger
                          openOnHover
                          delay={150}
                          closeDelay={100}
                          render={(triggerProps) => (
                            <button
                              {...triggerProps}
                              type="button"
                              className={`pv-icon-btn${autoRun ? " active" : ""}`}
                              aria-label={
                                autoRun
                                  ? "Turn off auto-run on edit"
                                  : "Turn on auto-run on edit"
                              }
                              aria-pressed={autoRun}
                              onClick={() => setAutoRun(!autoRun)}
                            >
                              {autoRun ? (
                                <Zap size={13} aria-hidden="true" />
                              ) : (
                                <ZapOff size={13} aria-hidden="true" />
                              )}
                            </button>
                          )}
                        />
                        <Popover.Portal>
                          <Popover.Positioner
                            sideOffset={6}
                            align="center"
                            side="bottom"
                          >
                            <Popover.Popup className="bui-popup pane-btn-popover">
                              {autoRun
                                ? "Auto-run on edit: on"
                                : "Auto-run on edit: off"}
                            </Popover.Popup>
                          </Popover.Positioner>
                        </Popover.Portal>
                      </Popover.Root>
                      <Popover.Root>
                        <Popover.Trigger
                          openOnHover
                          delay={150}
                          closeDelay={100}
                          render={(triggerProps) => (
                            <button
                              {...triggerProps}
                              type="button"
                              className="pv-icon-btn"
                              aria-label="Change view"
                            >
                              {effectiveEditorPosition === "right" ? (
                                <PanelRight size={13} aria-hidden="true" />
                              ) : effectiveEditorPosition === "top" ? (
                                <PanelTop size={13} aria-hidden="true" />
                              ) : (
                                <PanelLeft size={13} aria-hidden="true" />
                              )}
                            </button>
                          )}
                        />
                        <Popover.Portal>
                          <Popover.Positioner
                            sideOffset={6}
                            align="end"
                            side="bottom"
                          >
                            <Popover.Popup className="bui-popup change-view-menu">
                              <div className="change-view-title">
                                Change View
                              </div>
                              {(
                                [
                                  { pos: "left", label: "Editors left", Icon: PanelLeft },
                                  { pos: "top", label: "Editors top", Icon: PanelTop },
                                  { pos: "right", label: "Editors right", Icon: PanelRight },
                                ] as const
                              ).map(({ pos, label, Icon }) => (
                                <button
                                  key={pos}
                                  type="button"
                                  className={`change-view-item${
                                    effectiveEditorPosition === pos
                                      ? " selected"
                                      : ""
                                  }`}
                                  disabled={editorPinnedLeft}
                                  onClick={() => setEditorPosition(pos)}
                                >
                                  <Icon size={14} aria-hidden="true" />
                                  <span>{label}</span>
                                </button>
                              ))}
                              {editorPinnedLeft && (
                                <div className="change-view-hint">
                                  The tabbed editor keeps the editor on the
                                  left.
                                </div>
                              )}
                              {splitAvailable && (
                                <>
                                  <div
                                    className="change-view-sep"
                                    role="separator"
                                  />
                                  <div className="change-view-title">
                                    Editor Layout
                                  </div>
                                  <button
                                    type="button"
                                    className={`change-view-item${splitActive ? " selected" : ""}`}
                                    aria-pressed={splitActive}
                                    onClick={() => setSplitView(true)}
                                  >
                                    <Rows3 size={14} aria-hidden="true" />
                                    <span>Split editors (CodePen-style)</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={`change-view-item${!splitActive ? " selected" : ""}`}
                                    aria-pressed={!splitActive}
                                    onClick={() => setSplitView(false)}
                                  >
                                    <FileCode size={14} aria-hidden="true" />
                                    <span>Tabbed editor (manage files)</span>
                                  </button>
                                </>
                              )}
                            </Popover.Popup>
                          </Popover.Positioner>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                    <div className="web-preview-slot" ref={previewHostRef} />
                  </div>
                  {/* Quiet console strip pinned under the preview; errors
                      turn it red. */}
                  {(() => {
                    const latest = outputGroups[outputGroups.length - 1];
                    const consoleError =
                      !!latest && latest.every((c) => c.type === "stderr");
                    const textSegs = latest?.filter(
                      (c) => c.type === "stdout" || c.type === "stderr" || c.type === "log",
                    );
                    const runId = latest?.[0]?.runId;
                    const runNumber =
                      runId !== undefined ? runNumbers.get(runId) : undefined;
                    const last = latest?.[latest.length - 1];
                    // The console shows one run at a time, so without a
                    // boundary the previous run's text reads as this one's.
                    // Only a finished run gets a duration.
                    const finishedAt = last?.finishedAt;
                    const running = statusState === "running";
                    return (
                      <div className={`web-console${consoleError ? " error" : ""}`}>
                        <div
                          className="web-console-resizer"
                          role="separator"
                          aria-label="Resize the output panel"
                          aria-orientation="horizontal"
                          onPointerDown={beginConsoleResize}
                          onDoubleClick={resetConsoleHeight}
                        />
                        <div className="web-console-bar">
                          <span className="web-console-accent" aria-hidden="true" />
                          <span className="web-console-label">
                            {runNumber !== undefined ? `Run ${runNumber}` : "Output"}
                          </span>
                          <div className="pane-bar-sep" />
                          {finishedAt !== undefined && (
                            <span className="web-console-time">
                              {new Date(finishedAt).toLocaleTimeString([], {
                                hour12: false,
                              })}
                            </span>
                          )}
                          {finishedAt !== undefined && last && (
                            <span className="web-console-ms">{last.elapsed}</span>
                          )}
                        </div>
                        <div
                          className="web-console-content"
                          style={{ maxHeight: consoleHeight }}
                        >
                          {textSegs && textSegs.length > 0 ? (
                            textSegs.map((cell) => (
                              <div
                                key={cell.id}
                                className={
                                  cell.type === "stderr"
                                    ? "out-seg-stderr"
                                    : undefined
                                }
                              >
                                {cell.content}
                              </div>
                            ))
                          ) : (
                            <span className="web-console-ready">
                              {running
                                ? "Running…"
                                : runNumber !== undefined
                                  ? `Run ${runNumber} produced no console output.`
                                  : "Ready. Console output lands here."}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : outputs.length === 0 && statusState !== "running" ? (
                outputCleared ? (
                  <div className="run-history-empty">
                    Output cleared. Press Run to start a new history.
                  </div>
                ) : (
                  <div className="welcome">
                    <div className="welcome-icon">
                      <DiamondMark size={40} />
                    </div>
                    <h3>Run your code to see output</h3>
                    {capabilitiesBlurb && <p>{capabilitiesBlurb}</p>}
                  </div>
                )
              ) : (
                <>
                {/* Mid-run wait notice (package installs), so a multi-second
                    pause before the first line explains itself. */}
                {statusState === "running" && runStatusMessage && (
                  <div className="run-status-note" role="status">
                    {runStatusMessage}
                  </div>
                )}
                {outputGroups.map((group, groupIndex) => {
                  // One slim cell per run. stderr-only runs read red;
                  // older runs dim, the newest stays full color.
                  const onlyStderr = group.every((c) => c.type === "stderr");
                  const runId = group[0].runId;
                  const runNumber =
                    runId !== undefined ? runNumbers.get(runId) : undefined;
                  const fresh = groupIndex === outputGroups.length - 1;
                  const copyText = group
                    .filter(
                      (c) => c.type === "stdout" || c.type === "stderr" || c.type === "log",
                    )
                    .map((c) => c.content)
                    .join("\n");
                  return (
                    <div
                      key={group[0].id}
                      data-cell-id={group[0].id}
                      className={`run-cell${onlyStderr ? " error" : ""}${
                        fresh ? "" : " old"
                      }`}
                    >
                      <div className="run-cell-header">
                        <span className="run-cell-bar" aria-hidden="true" />
                        <span className="run-cell-label">
                          {runNumber !== undefined
                            ? `Run ${runNumber}`
                            : onlyStderr
                              ? "Error"
                              : "Output"}
                        </span>
                        {group[0].finishedAt !== undefined && (
                          <span className="run-cell-time">
                            {new Date(group[0].finishedAt).toLocaleTimeString(
                              [],
                              { hour12: false },
                            )}
                          </span>
                        )}
                        <span className="run-cell-ms">
                          Done in {group[group.length - 1].elapsed}
                        </span>
                        {copyText.length > 0 && (
                          <button
                            type="button"
                            className="run-cell-action"
                            title="Copy this output"
                            aria-label="Copy this output"
                            onClick={() =>
                              void copyToClipboard(
                                copyText,
                                onlyStderr ? "Error" : "Output",
                              )
                            }
                          >
                            <CopyIcon />
                          </button>
                        )}
                        <button
                          type="button"
                          className="run-cell-action"
                          title="Dismiss this run"
                          aria-label="Dismiss this run"
                          onClick={() => dismissRun(runId, group[0].id)}
                        >
                          <X size={11} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="run-cell-content">
                        {group.map((cell) =>
                          cell.type === "image" ? (
                            <div
                              key={cell.id}
                              className="out-seg out-seg-image"
                              data-cell-type="image"
                            >
                              {/* Base64 PNGs have unknown intrinsic size,
                                  not eligible for next/image. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`data:image/png;base64,${cell.content}`}
                                alt="figure"
                                onLoad={scrollToLatestOutput}
                              />
                            </div>
                          ) : cell.type === "html" ? (
                            <div
                              key={cell.id}
                              className="dataframe-wrap"
                              data-cell-type="html"
                              dangerouslySetInnerHTML={{
                                __html: cell.content,
                              }}
                            />
                          ) : cell.type === "plot" && cell.plot ? (
                            <div
                              key={cell.id}
                              className="out-seg out-seg-plot"
                              data-cell-type="plot"
                            >
                              <PlotlyChart
                                figure={cell.plot}
                                className="plotly-chart"
                              />
                            </div>
                          ) : (
                            <div
                              key={cell.id}
                              className={`out-seg out-seg-${cell.type}`}
                              data-cell-type={cell.type}
                            >
                              {cell.content}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  );
                })}
                </>
              )}
            </div>
            <DataslopeRunOverlay running={statusState === "running"} />
          </div>
          {activeTabId === SETTINGS_TAB_ID && (
            <div className="playground-settings-tab-pane">
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
                onClose={closeSettingsTab}
              />
            </div>
          )}
        </div>
        {/* Second overlay instance outside the tab-switched `.panes` so it
            stays visible on mobile whichever tab is active; CSS ensures
            only one instance paints at a time. */}
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
