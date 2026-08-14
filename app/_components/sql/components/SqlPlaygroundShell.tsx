"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Database,
  Code2,
  Table2,
  Copy,
  DatabasePlus,
  RotateCw,
} from "lucide-react";
import "../../playground.css";
import "../../sqlPlayground.css";
import { SqlPlaygroundSwitcher } from "./SqlPlaygroundSwitcher";
import { paneForActivatedTab, type SqlMobilePane } from "../utils/mobilePane";
import { MobileMenuSheet } from "../../MobileMenuSheet";
import {
  PlaygroundBootOverlay,
  useBootOverlayVisibility,
} from "../../PlaygroundBootOverlay";
import { DiamondMark } from "../../mdx/loadingAnimations";
import imageManifest from "@/lib/generated/images";

/** Illustration shown on the conflict overlay, authored through the same
 *  pipeline as the course art (`data/illustration-prompts.json`, see the
 *  Illustrations section of AGENTS.md) and promoted into `public/images/`.
 *  Every surface asks for the `-cutout` slug. */
const CONFLICT_MARK_SLUG = "playground-workspace-conflict-cutout";

/** The mark above the conflict message. Falls back to the brand diamond when
 *  the illustration isn't in the manifest, so a tree without the promoted
 *  asset shows the old mark rather than an empty space. */
function ConflictMark() {
  const entry = imageManifest[CONFLICT_MARK_SLUG];
  if (!entry) return <DiamondMark size={88} />;
  const src = `/images/${CONFLICT_MARK_SLUG}.${entry.formats[entry.formats.length - 1]}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={entry.width}
      height={entry.height}
      alt=""
      aria-hidden="true"
      decoding="async"
      className="playground-conflict-mark"
    />
  );
}

/**
 * Re-exported from the pure helper module (`../utils/mobilePane`) so existing
 * importers of `SqlMobilePane` keep working. The single-pane mobile layout
 * shows one of these surfaces at a time; desktop ignores it (the CSS only acts
 * on it below the mobile breakpoint). It lets the shared bottom tab bar, and
 * the jump-to-results / per-query-tab-restore affordances, work for all three
 * SQL playgrounds without each playground body knowing anything about
 * responsiveness.
 */
export type { SqlMobilePane };

/**
 * Visual + interactive states the loading overlay can be in. Mirrors
 * the per-playground `statusState` machine; the shell only needs the
 * `"error"` flag to color the overlay red.
 */
export type SqlPlaygroundOverlayStatus =
  | "loading"
  | "ready"
  | "running"
  | "error";

export interface SqlPlaygroundShellProps {
  /** Id of the playground being rendered (e.g. `"postgres"`,
   *  `"duckdb"`, `"sqlite"`). Drives the playground-switcher
   *  selection. */
  playgroundId: string;
  /** Title shown in the rolling "loading hero" strip during boot
   *  (e.g. `"PostgreSQL Playground"`). */
  playgroundTitle: string;
  /** True once the engine has booted and the initial sample database
   *  is loaded; gates the loading overlay's visibility. */
  loaded: boolean;
  /** Current playground status; used by the overlay to render the
   *  red-tinted error state when something goes wrong during boot. */
  statusState: SqlPlaygroundOverlayStatus;
  /** Body of the loading overlay's caption. Pass a plain status string
   *  for Postgres/DuckDB, or a rotating quip for SQLite. */
  loadingCaption: ReactNode;
  /** Number of times the title is repeated in the hero scroll strip.
   *  Postgres/DuckDB use 3, SQLite uses 4. */
  loadingHeroRepeat?: number;
  /** Left-docked header content rendered right after the playground
   *  switcher, before the flexible separator — the workspace name +
   *  inline rename control in the simplified header. */
  headerName?: ReactNode;
  /** Right-of-logo header actions (Save, Share, ⋯). The shell renders
   *  them directly inside `<header className="playground-header">`
   *  after the logo + separator. */
  headerActions?: ReactNode;
  /** Contents of the mobile "hamburger" menu (rendered only below the
   *  mobile breakpoint). The shell owns the sheet's open state and the
   *  trigger; each dialect supplies the rows (Workspace, Import, Export,
   *  History, ER Diagram, Information, Settings) via `MobileMenuAction` /
   *  `MobileMenuSubSheet`. Omit to render no menu. */
  mobileMenu?: ReactNode;
  /** Real, smoothed boot fraction (0..1) when the engine reports download
   *  progress (DuckDB). Omit for engines that don't, the shell then
   *  creeps a determinate bar over time instead. */
  bootFraction?: number | null;
  /** True when the active workspace is already open (locked) in another
   *  browser tab. The shell then shows a conflict overlay instead of the
   *  boot overlay, opening the same OPFS-backed database in two tabs would
   *  otherwise deadlock the engine boot (it hangs at ~90%). */
  workspaceConflict?: boolean;
  /** Invoked when the user picks "Open a new workspace" from the conflict
   *  overlay. The host should create a fresh workspace and switch to it
   *  (a reload is fine, a new workspace id isn't locked elsewhere). */
  onOpenNewWorkspace?: () => void;
  /** Invoked when the user picks "Open a copy". The host should duplicate the
   *  conflicted workspace and switch to the duplicate, so this tab gets the
   *  same data without contending for the original's OPFS handle. Offered
   *  first: it is the only action that keeps what the user came for. */
  onOpenCopy?: () => void;
  /** True while a copy is being made, so the overlay can show it working;
   *  duplicating a large database is not instant. */
  copyBusy?: boolean;
  /** Why a copy attempt failed. Shown in the overlay: an action that quietly
   *  does nothing is the dead end this overlay exists to remove. */
  copyError?: string | null;
  /** Main body of the page, typically the top toolbar + sidebar +
   *  editor + results pane structure. Rendered directly inside
   *  `<div className="playground-app">` after the header. */
  children: ReactNode;
}

/**
 * Unified outer chrome for the three SQL playgrounds (SQLite,
 * Postgres, DuckDB). Owns the page root, the pyodide-style loading
 * overlay, the application frame, and the shared header (Dataslope
 * brand + playground switcher). Each dialect renders its own toolbar,
 * sidebar, editor, results pane, and dialogs via the `headerActions`
 * and `children` slots.
 *
 * Note: the `<Toast.Provider>` and `<Toast.Portal>` wiring is kept at
 * the per-dialect default export (one level above `…Inner`) because
 * `Toast.useToastManager()` is invoked during the Inner component's
 * render, moving the Provider inside the shell would render the
 * Provider *after* the Inner ran its hooks and trigger Base UI's
 * "missing provider" error during SSG.
 */
export function SqlPlaygroundShell({
  playgroundId,
  playgroundTitle,
  loaded,
  statusState,
  loadingCaption,
  headerName,
  headerActions,
  mobileMenu,
  bootFraction,
  workspaceConflict = false,
  onOpenNewWorkspace,
  onOpenCopy,
  copyBusy = false,
  copyError = null,
  children,
}: SqlPlaygroundShellProps) {
  // Loading-overlay lifecycle (show → fade → unmount) with a minimum
  // on-screen time, shared by all three SQL dialects. A warm revisit
  // boots the cached engine almost instantly; the floor keeps the overlay
  // up long enough to read as a deliberate transition rather than a blink.
  const { mounted: showLoadingOverlay, fading: loadingFading } =
    useBootOverlayVisibility(loaded);
  // Mobile hamburger menu open state (the shell owns it; dialects only
  // supply the rows via `mobileMenu`).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // True while the full-screen Settings tab is showing. Used to hide the
  // bottom Schema/Editor/Results pane switcher, which doesn't apply to
  // the settings pane. Detected from the DOM (below) so the three
  // playground bodies stay untouched.
  const [settingsTabActive, setSettingsTabActive] = useState(false);
  // Fallback for engines that don't report real download progress
  // (Postgres, SQLite): creep a determinate bar toward ~90% while booting.
  // Skipped when the dialect supplies a real `bootFraction` (DuckDB).
  const [creepFraction, setCreepFraction] = useState(0.05);
  useEffect(() => {
    if (loaded || bootFraction !== undefined) return;
    const id = window.setInterval(() => {
      setCreepFraction((f) => Math.min(0.9, f + (0.9 - f) * 0.05));
    }, 200);
    return () => window.clearInterval(id);
  }, [loaded, bootFraction]);
  const overlayFraction =
    bootFraction !== undefined ? bootFraction : creepFraction;

  // ─── Mobile single-pane navigation ───────────────────────────────────
  // Below the mobile breakpoint the desktop 3-pane IDE collapses to one
  // full-width surface at a time, switched from the bottom tab bar. The
  // state has no effect on desktop (the CSS that reads `data-mobile-pane`
  // is scoped to the mobile media query), so it's safe to keep mounted.
  const [mobilePane, setMobilePane] = useState<SqlMobilePane>("editor");
  // Whether the active query tab currently has something worth showing on
  // the Results surface (a table, an error, or a "statement executed"
  // notice). Drives the mobile Results tab's disabled state so users can't
  // tab into an empty pane before they've run anything. Detected from the
  // rendered DOM (see the observer below) so the three playground bodies
  // stay untouched.
  const [hasResults, setHasResults] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Per-query-tab memory of the last bottom pane the user looked at, keyed by
  // the tab's `data-tab-id` (rendered by the shared TabBar). Activating a tab
  // restores its remembered pane instead of carrying the previous tab's pane
  // over, so leaving tab A on Results and switching to a never-run tab B lands
  // on B's Editor, not an empty Results. A ref (not state): it's a side table
  // that must never itself trigger a render. Session-scoped (not persisted).
  const tabPaneMemory = useRef<Map<string, SqlMobilePane>>(new Map());
  // The query tab the shell currently considers active, derived from the DOM by
  // the observer below. Lets the pane handlers attribute a choice to the right
  // tab, and lets the observer detect tab switches.
  const activeTabIdRef = useRef<string | null>(null);

  // Comfort affordance: when the user runs a query (Run button) or opens a
  // table by double-clicking it in the schema tree, jump the mobile view to
  // the surface that's about to show the answer, Results, so they don't
  // have to hunt for the right tab after every run. Creating a new query tab
  // (the "+" button) instead jumps to the Editor, where the user will start
  // typing. Implemented with event delegation on the shell so the individual
  // playgrounds stay untouched; it's a no-op on desktop where the bottom bar
  // is hidden.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const isMobile = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches;
    // Record a pane as the active tab's remembered choice (see tabPaneMemory).
    const remember = (pane: SqlMobilePane) => {
      const id = activeTabIdRef.current;
      if (id) tabPaneMemory.current.set(id, pane);
    };
    const onClick = (e: Event) => {
      if (!isMobile()) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".playground-tab-add")) {
        // A brand-new tab has no remembered pane; the observer below lands it on
        // Editor once it becomes active. Set it eagerly too so the jump feels
        // instant. Deliberately *not* recorded against the current tab, which is
        // still the active one at click time.
        setMobilePane("editor");
      } else if (t?.closest(".run-btn, .run-btn-split-main")) {
        setMobilePane("results");
        remember("results");
      }
    };
    const onDblClick = (e: Event) => {
      if (!isMobile()) return;
      const t = e.target as HTMLElement | null;
      // A double-click on a schema *leaf* (table/view row) opens & runs it;
      // double-clicks on section headers (which only collapse a group) are
      // ignored so we don't yank the user to a stale Results pane.
      if (
        t?.closest(".sql-tree") &&
        !t.closest(".sql-tree-section-header")
      ) {
        setMobilePane("results");
        remember("results");
      }
    };
    root.addEventListener("click", onClick);
    root.addEventListener("dblclick", onDblClick);
    return () => {
      root.removeEventListener("click", onClick);
      root.removeEventListener("dblclick", onDblClick);
    };
  }, []);

  // Track whether the results pane is showing real content vs. the
  // "Run a query to see results" / loading placeholder. ResultView tags
  // both placeholder states with `data-result-empty`; everything else
  // (table, error, "no rows") is real output. A MutationObserver keeps the
  // flag in sync as the user runs queries, switches tabs, or reloads a
  // sample, without threading a prop through every playground.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const recompute = () => {
      // (a) Does the *active* query tab have real output? Only the active tab's
      // results live in `.sql-results-pane`, so this reflects that tab.
      const pane = root.querySelector(".sql-results-pane");
      const empty = pane?.querySelector("[data-result-empty]");
      const nowHasResults = !!pane && !empty;
      setHasResults(nowHasResults);

      // (c) Is the full-screen Settings tab open? Its pane replaces the
      // editor/results split, so the bottom pane switcher is hidden while
      // it's up (see the `data-settings-active` rule in sqlPlayground.css).
      setSettingsTabActive(!!root.querySelector(".sql-settings-tab-pane"));

      // (b) Did the active query tab change? React swaps the tab's `.active`
      // class and the results-pane contents in the same commit, so by the time
      // the observer runs we can read the new tab's id *and* its result-state
      // together. On a switch, restore that tab's remembered bottom pane,
      // falling back to the Editor rather than landing on an empty Results.
      const activeId =
        root
          .querySelector(".playground-tab.active")
          ?.getAttribute("data-tab-id") ?? null;
      if (activeId !== activeTabIdRef.current) {
        activeTabIdRef.current = activeId;
        if (activeId) {
          setMobilePane(
            paneForActivatedTab(
              tabPaneMemory.current.get(activeId),
              nowHasResults,
            ),
          );
        }
      }
    };
    recompute();
    // Watch childList (results swapping in/out) *and* class attributes (the
    // query tab's `.active` toggle) so both (a) and (b) stay live.
    const observer = new MutationObserver(recompute);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="playground-root"
      ref={rootRef}
      data-mobile-pane={mobilePane}
      data-settings-active={settingsTabActive || undefined}
    >
      {workspaceConflict ? (
        <div
          className="pyodide-loading playground-boot-overlay playground-conflict-overlay"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="playground-boot-card">
            <span className="playground-boot-loader" aria-hidden="true">
              <ConflictMark />
            </span>
            <div className="playground-boot-text">
              <span className="playground-boot-title">
                This workspace is open in another tab
              </span>
              <div className="playground-boot-hints">
                <span className="playground-boot-hint">
                  A workspace can run in only one tab at a time. Open a copy to
                  keep working here with the same data, or keep using the
                  original in the other tab.
                </span>
                {copyError && (
                  <span
                    className="playground-boot-hint playground-conflict-error"
                    role="alert"
                  >
                    {copyError}
                  </span>
                )}
              </div>
              <div className="playground-conflict-actions">
                {onOpenCopy && (
                  <button
                    type="button"
                    className="playground-conflict-btn playground-conflict-btn-primary"
                    onClick={onOpenCopy}
                    disabled={copyBusy}
                  >
                    <Copy size={15} aria-hidden="true" />
                    {copyBusy ? "Copying…" : "Open a copy"}
                  </button>
                )}
                {onOpenNewWorkspace && (
                  <button
                    type="button"
                    className={`playground-conflict-btn${onOpenCopy ? "" : " playground-conflict-btn-primary"}`}
                    onClick={onOpenNewWorkspace}
                    disabled={copyBusy}
                  >
                    {/* The same icon the header's new-workspace control uses. */}
                    <DatabasePlus size={15} aria-hidden="true" />
                    Open a new workspace
                  </button>
                )}
                <button
                  type="button"
                  className="playground-conflict-btn"
                  onClick={() => window.location.reload()}
                  disabled={copyBusy}
                >
                  <RotateCw size={15} aria-hidden="true" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        showLoadingOverlay && (
          <PlaygroundBootOverlay
            title={playgroundTitle.replace(/\s*Playground$/i, "")}
            statusMessage={loadingCaption}
            fraction={overlayFraction}
            error={statusState === "error"}
            className={loadingFading ? "hidden" : ""}
          />
        )
      )}
      <div className="playground-app">
        <header className="playground-header">
          <SqlPlaygroundSwitcher playgroundId={playgroundId} />
          {headerName}
          <div className="header-sep" />
          {headerActions}
          {mobileMenu && (
            <MobileMenuSheet
              open={mobileMenuOpen}
              onOpenChange={setMobileMenuOpen}
            >
              {mobileMenu}
            </MobileMenuSheet>
          )}
        </header>
        {children}
        <nav
          className="sql-mobile-tabs"
          role="tablist"
          aria-label="Playground section"
        >
          {(
            [
              ["schema", "Schema", Database],
              ["editor", "Editor", Code2],
              ["results", "Results", Table2],
            ] as const
          ).map(([pane, label, Icon]) => {
            // Results stays disabled until a query has produced output, so
            // users can't tab into an empty pane. It's never disabled while
            // it's the active pane (e.g. mid-run, showing the run overlay).
            const disabled =
              pane === "results" && !hasResults && mobilePane !== "results";
            return (
              <button
                key={pane}
                type="button"
                role="tab"
                aria-selected={mobilePane === pane}
                disabled={disabled}
                aria-disabled={disabled}
                className={`sql-mobile-tab${
                  mobilePane === pane ? " active" : ""
                }${disabled ? " disabled" : ""}`}
                onClick={() => {
                  if (disabled) return;
                  setMobilePane(pane);
                  // Remember this explicit choice for the active query tab so
                  // returning to the tab later restores the same pane.
                  const id = activeTabIdRef.current;
                  if (id) tabPaneMemory.current.set(id, pane);
                }}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

