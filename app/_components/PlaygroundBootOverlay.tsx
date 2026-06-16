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

/** Renders a status string with its trailing ellipsis ("…" or "...")
 *  replaced by three dots that cycle one → two → three. Non-string
 *  messages (or ones without a trailing ellipsis) render unchanged. */
function BootTitle({ message }: { message: ReactNode }) {
  if (typeof message === "string") {
    const match = message.match(/^(.*?)\s*(?:…|\.{2,})\s*$/);
    if (match) {
      return (
        <>
          {match[1]}
          <span className="playground-boot-ellipsis" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </>
      );
    }
  }
  return <>{message}</>;
}

export interface PlaygroundBootOverlayProps {
  /** Runtime / language name (e.g. "Python"). Retained for call-site
   *  compatibility — the boot copy no longer names the runtime. */
  title: string;
  /** Current stage line (the playground's loading caption). */
  statusMessage: ReactNode;
  /** Show the "downloads once" reassurance + size hint (first cold boot). */
  cold?: boolean;
  /** Approximate cold download size in MB. */
  downloadMB?: number;
  /** Compiled languages (Java, C, C++, C#). No longer changes the boot
   *  copy — every runtime now reads "much faster" — but kept so existing
   *  call sites still type-check. */
  compiled?: boolean;
  /** Smoothed boot fraction in 0..1, or null for no bar. */
  fraction?: number | null;
  /** Render the error state (red, no spinner/bar — just the message). */
  error?: boolean;
  /** Extra class on the overlay root (e.g. the SQLite fade-out). */
  className?: string;
}

export function PlaygroundBootOverlay({
  statusMessage,
  cold = false,
  downloadMB,
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
            <DiamondAssembleTurnLoader size={104} label="" />
          </span>
        )}
        <div className="playground-boot-text">
          <span className="playground-boot-title">
            <BootTitle message={statusMessage} />
          </span>
          {!error && cold && (
            <div className="playground-boot-hints">
              <span className="playground-boot-hint">
                This can take a moment on first load
              </span>
              <span className="playground-boot-hint playground-boot-hint-sub">
                {downloadMB ? `Downloading (~${downloadMB} MB) — ` : ""}This
                happens once. Later runs are much faster.
              </span>
            </div>
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
