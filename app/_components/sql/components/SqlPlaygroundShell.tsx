"use client";

import React, { type ReactNode } from "react";
import "../../playground.css";
import "../../sqlPlayground.css";
import { SqlPlaygroundSwitcher } from "./SqlPlaygroundSwitcher";

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
  return (
    <div className="playground-root">
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
      </div>
    </div>
  );
}

