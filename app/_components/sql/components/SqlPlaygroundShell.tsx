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

/** Conflict-overlay illustration slug (promoted into public/images/). */
const CONFLICT_MARK_SLUG = "playground-workspace-conflict-cutout";

/** Mark above the conflict message; falls back to the brand diamond when the
 *  illustration is missing from the manifest. */
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

/** Re-exported from ../utils/mobilePane so existing importers keep working. */
export type { SqlMobilePane };

/** Loading-overlay states; mirrors the per-playground `statusState` machine. */
export type SqlPlaygroundOverlayStatus =
  | "loading"
  | "ready"
  | "running"
  | "error";

export interface SqlPlaygroundShellProps {
  /** Playground id (e.g. `"postgres"`); drives the switcher selection. */
  playgroundId: string;
  /** Title shown in the boot overlay. */
  playgroundTitle: string;
  /** True once the engine has booted; gates the loading overlay. */
  loaded: boolean;
  /** Current status; `"error"` tints the overlay red. */
  statusState: SqlPlaygroundOverlayStatus;
  /** Caption body of the loading overlay. */
  loadingCaption: ReactNode;
  /** Times the title repeats in the hero scroll strip. */
  loadingHeroRepeat?: number;
  /** Header content after the switcher (workspace name + rename control). */
  headerName?: ReactNode;
  /** Header actions rendered after the separator (Save, Share, ⋯). */
  headerActions?: ReactNode;
  /** Rows of the mobile hamburger menu; omit for none. The shell owns the
   *  sheet's open state. */
  mobileMenu?: ReactNode;
  /** Real boot fraction (0..1) when the engine reports progress (DuckDB);
   *  omit and the shell creeps a determinate bar instead. */
  bootFraction?: number | null;
  /** True when the workspace is locked by another browser tab; shows the
   *  conflict overlay (opening the same OPFS-backed database in two tabs
   *  would deadlock the engine boot). */
  workspaceConflict?: boolean;
  /** "Open a new workspace" action on the conflict overlay. */
  onOpenNewWorkspace?: () => void;
  /** "Open a copy" action: duplicate the conflicted workspace so this tab
   *  keeps the data without contending for the original's OPFS handle. */
  onOpenCopy?: () => void;
  /** True while a copy is in progress. */
  copyBusy?: boolean;
  /** Copy failure message shown in the overlay. */
  copyError?: string | null;
  /** Main body (toolbar + sidebar + editor + results). */
  children: ReactNode;
}

/**
 * Shared outer chrome for the three SQL playgrounds: page root, boot
 * overlay, app frame, and header. Toast.Provider must stay in each
 * dialect's default export: Toast.useToastManager() runs during Inner's
 * render, so a Provider inside the shell would mount too late and break SSG.
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
  // Boot-overlay lifecycle (show → fade → unmount) with a minimum on-screen
  // time so warm boots don't read as a blink.
  const { mounted: showLoadingOverlay, fading: loadingFading } =
    useBootOverlayVisibility(loaded);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Full-screen Settings tab showing? Hides the bottom pane switcher.
  // Detected from the DOM so the playground bodies stay untouched.
  const [settingsTabActive, setSettingsTabActive] = useState(false);
  // Fallback when no real `bootFraction` is supplied: creep a determinate
  // bar toward ~90% while booting.
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

  // Mobile single-pane navigation: below the breakpoint one surface shows at
  // a time. No effect on desktop (the CSS is media-query scoped).
  const [mobilePane, setMobilePane] = useState<SqlMobilePane>("editor");
  // Whether the active query tab has real output; gates the mobile Results
  // tab's disabled state. Detected from the DOM (observer below).
  const [hasResults, setHasResults] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Last bottom pane per query tab (keyed by `data-tab-id`) so switching tabs
  // restores that tab's pane instead of carrying the previous one over.
  // A ref: this side table must never itself trigger a render.
  const tabPaneMemory = useRef<Map<string, SqlMobilePane>>(new Map());
  // Active query tab id, derived from the DOM by the observer below.
  const activeTabIdRef = useRef<string | null>(null);

  // Jump the mobile view on run / schema double-click (→ Results) or new tab
  // (→ Editor). Event delegation keeps the playground bodies untouched;
  // no-op on desktop.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const isMobile = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px)").matches;
    const remember = (pane: SqlMobilePane) => {
      const id = activeTabIdRef.current;
      if (id) tabPaneMemory.current.set(id, pane);
    };
    const onClick = (e: Event) => {
      if (!isMobile()) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".playground-tab-add")) {
        // New tab: land on Editor eagerly. Deliberately not recorded against
        // the current tab, which is still the active one at click time.
        setMobilePane("editor");
      } else if (t?.closest(".run-btn, .run-btn-split-main")) {
        setMobilePane("results");
        remember("results");
      }
    };
    const onDblClick = (e: Event) => {
      if (!isMobile()) return;
      const t = e.target as HTMLElement | null;
      // Only leaf rows open & run; section headers just collapse a group.
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

  // Real output vs. placeholder: ResultView tags placeholders with
  // `data-result-empty`; a MutationObserver keeps the flags in sync without
  // threading props through every playground.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const recompute = () => {
      // (a) Does the active query tab have real output?
      const pane = root.querySelector(".sql-results-pane");
      const empty = pane?.querySelector("[data-result-empty]");
      const nowHasResults = !!pane && !empty;
      setHasResults(nowHasResults);

      // (c) Full-screen Settings tab open? (see `data-settings-active` in
      // sqlPlayground.css)
      setSettingsTabActive(!!root.querySelector(".sql-settings-tab-pane"));

      // (b) Tab switch? React swaps the `.active` class and the results pane
      // in the same commit, so the new tab's id and result state read
      // together. Restore its remembered pane, defaulting to Editor.
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
    // Watch childList and class attributes so both (a) and (b) stay live.
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
            // Results stays disabled until output exists, but never while it
            // is the active pane (e.g. mid-run).
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
                  // Remember this choice for the active query tab.
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

