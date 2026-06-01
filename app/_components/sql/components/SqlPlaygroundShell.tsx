"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Database, Code2, Table2 } from "lucide-react";
import "../../playground.css";
import "../../sqlPlayground.css";
import { SqlPlaygroundSwitcher } from "./SqlPlaygroundSwitcher";

/**
 * Which of the three logical surfaces the single-pane mobile layout is
 * currently showing. Desktop ignores this entirely (the CSS only acts on
 * it below the mobile breakpoint); it lives here so the shared bottom tab
 * bar — and the small "jump to results when you run a query" affordance —
 * work for all three SQL playgrounds without each 5k-line playground body
 * having to know anything about responsiveness.
 */
export type SqlMobilePane = "schema" | "editor" | "results";

/**
 * Visual + interactive states the loading overlay can be in. Mirrors
 * the per-playground `statusState` machine; the shell only needs the
 * `"error"` flag to colour the overlay red.
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
  /** Optional className appended to the loading overlay (currently
   *  used by SQLite for its fade-out animation). */
  loadingOverlayClassName?: string;
  /** When `true`, the loading overlay stays mounted even after
   *  `loaded` becomes true (SQLite uses this with `loadingFading` so
   *  the overlay can animate out). Defaults to `false` (= unmount the
   *  instant `loaded` becomes `true`, which matches Postgres/DuckDB). */
  keepOverlayMounted?: boolean;
  /** Body of the loading overlay's caption. Pass a plain status string
   *  for Postgres/DuckDB, or a rotating quip for SQLite. */
  loadingCaption: ReactNode;
  /** Number of times the title is repeated in the hero scroll strip.
   *  Postgres/DuckDB use 3, SQLite uses 4. */
  loadingHeroRepeat?: number;
  /** Right-of-logo header actions (Import, Export, Examples, …). The
   *  shell renders them directly inside `<header className="playground-header">`
   *  after the logo + separator. */
  headerActions?: ReactNode;
  /** Main body of the page — typically the top toolbar + sidebar +
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
 * render — moving the Provider inside the shell would render the
 * Provider *after* the Inner ran its hooks and trigger Base UI's
 * "missing provider" error during SSG.
 */
export function SqlPlaygroundShell({
  playgroundId,
  playgroundTitle,
  loaded,
  statusState,
  loadingOverlayClassName = "",
  keepOverlayMounted = false,
  loadingCaption,
  loadingHeroRepeat = 3,
  headerActions,
  children,
}: SqlPlaygroundShellProps) {
  const showLoadingOverlay = keepOverlayMounted || !loaded;

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

  // Comfort affordance: when the user runs a query (Run button) or opens a
  // table by double-clicking it in the schema tree, jump the mobile view to
  // the surface that's about to show the answer — Results — so they don't
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
    const onClick = (e: Event) => {
      if (!isMobile()) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest(".playground-tab-add")) {
        setMobilePane("editor");
      } else if (t?.closest(".run-btn, .run-btn-split-main")) {
        setMobilePane("results");
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
  // sample — without threading a prop through every playground.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const recompute = () => {
      const pane = root.querySelector(".sql-results-pane");
      const empty = pane?.querySelector("[data-result-empty]");
      setHasResults(!!pane && !empty);
    };
    recompute();
    const observer = new MutationObserver(recompute);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="playground-root" ref={rootRef} data-mobile-pane={mobilePane}>
      {showLoadingOverlay && (
        <div
          className={`pyodide-loading${
            statusState === "error" ? " has-error" : ""
          }${loadingOverlayClassName ? ` ${loadingOverlayClassName}` : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              {Array.from({ length: loadingHeroRepeat }).map((_, i) => (
                <span key={i} className="loading-hero-text">
                  {playgroundTitle}
                </span>
              ))}
            </div>
          </div>
          <div className="loading-bottom">
            <div className="loading-quip">{loadingCaption}</div>
            <div className="loading-bar-wrap">
              <div className="loading-bar" />
            </div>
          </div>
        </div>
      )}
      <div className="playground-app">
        <header className="playground-header">
          <SqlPlaygroundSwitcher playgroundId={playgroundId} />
          <div className="header-sep" />
          {headerActions}
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

