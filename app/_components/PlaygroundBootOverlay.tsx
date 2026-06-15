"use client";

// Full-screen boot overlay shared by every playground (the language
// playgrounds via <Playground>, the SQL playgrounds via
// <SqlPlaygroundShell>). It mirrors the <RuntimeBootNotice> used by the
// embedded code blocks / challenge cards — the brand "assemble + quarter
// turn" diamond, a status line, a first-run download hint, and a
// determinate progress bar — so a multi-second cold start reads the same
// everywhere. Styling lives in playground.css (`.playground-boot-*`).

import type { ReactNode } from "react";
import { DiamondAssembleTurnLoader } from "./mdx/loadingAnimations";

export interface PlaygroundBootOverlayProps {
  /** Runtime / language name used in the download hint (e.g. "Python"). */
  title: string;
  /** Current stage line (the playground's loading caption). */
  statusMessage: ReactNode;
  /** Show the "downloads once" reassurance + size hint (first cold boot). */
  cold?: boolean;
  /** Approximate cold download size in MB. */
  downloadMB?: number;
  /** Compiled languages still pay a per-run compile, so promise "faster"
   *  rather than "instant" later runs. */
  compiled?: boolean;
  /** Smoothed boot fraction in 0..1, or null for no bar. */
  fraction?: number | null;
  /** Render the error state (red, no spinner/bar — just the message). */
  error?: boolean;
  /** Extra class on the overlay root (e.g. the SQLite fade-out). */
  className?: string;
}

export function PlaygroundBootOverlay({
  title,
  statusMessage,
  cold = false,
  downloadMB,
  compiled = false,
  fraction = null,
  error = false,
  className,
}: PlaygroundBootOverlayProps) {
  const pct =
    fraction == null
      ? null
      : Math.round(Math.max(0, Math.min(1, fraction)) * 100);

  return (
    <div
      className={`pyodide-loading playground-boot-overlay${
        error ? " has-error" : ""
      }${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="playground-boot-card">
        {!error && (
          <span className="playground-boot-loader" aria-hidden="true">
            <DiamondAssembleTurnLoader size={56} label="" />
          </span>
        )}
        <div className="playground-boot-text">
          <span className="playground-boot-title">{statusMessage}</span>
          {!error && cold && (
            <span className="playground-boot-hint">
              Downloading the {title} runtime
              {downloadMB ? ` (~${downloadMB} MB)` : ""} — this happens once;{" "}
              {compiled ? "later runs are much faster" : "later runs are instant"}.
            </span>
          )}
          {!error && pct != null && (
            <div className="playground-boot-progress">
              <div
                className="playground-boot-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <div
                  className="playground-boot-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="playground-boot-pct">{pct}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
