"use client";

// Full-screen boot overlay shared by every playground, mirroring the
// <RuntimeBootNotice> used by embedded blocks: the brand diamond loader, a
// status line, and a determinate progress bar — deliberately nothing more,
// so the loading screen reads the same across runtimes. Styling lives in
// playground.css (`.playground-boot-*`).

import { useEffect, useState, type ReactNode } from "react";
import { DiamondAssembleTurnLoader } from "./mdx/loadingAnimations";

/** Boot-overlay opacity fade duration in ms; mirrors the CSS
 *  `transition: opacity 0.4s` on `.pyodide-loading`. The overlay is kept
 *  mounted for this long after it begins fading so the animation finishes
 *  before it unmounts. */
const BOOT_OVERLAY_FADE_MS = 400;

/** Minimum ms the overlay stays fully visible from mount, so a warm revisit
 *  (where `loaded` flips within a frame) doesn't blink. Cold boots exceed
 *  this, so the floor is a no-op there. */
export const MIN_BOOT_OVERLAY_MS = 500;

export interface BootOverlayVisibility {
  /** Render the overlay while true; it unmounts once the fade finishes. */
  mounted: boolean;
  /** Apply the `.hidden` fade-out class while true. */
  fading: boolean;
}

/** Drives the overlay's show → fade → unmount lifecycle from a single
 *  `loaded` flag, enforcing {@link MIN_BOOT_OVERLAY_MS} of on-screen time.
 *  Render the overlay while `mounted`; apply `fading` as the `.hidden` class. */
export function useBootOverlayVisibility(
  loaded: boolean,
): BootOverlayVisibility {
  // Captured once on mount ≈ when the overlay first painted.
  const [mountedAt] = useState(() => Date.now());
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const holdFor = Math.max(0, MIN_BOOT_OVERLAY_MS - (Date.now() - mountedAt));
    const fadeId = window.setTimeout(() => setFading(true), holdFor);
    const unmountId = window.setTimeout(
      () => setMounted(false),
      holdFor + BOOT_OVERLAY_FADE_MS,
    );
    return () => {
      window.clearTimeout(fadeId);
      window.clearTimeout(unmountId);
    };
  }, [loaded, mountedAt]);
  return { mounted, fading };
}

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
   *  compatibility, the boot copy no longer names the runtime. */
  title: string;
  /** Current stage line (the playground's loading caption). */
  statusMessage: ReactNode;
  /** Smoothed boot fraction in 0..1, or null for no bar. */
  fraction?: number | null;
  /** Render the error state (red, no spinner/bar, just the message). */
  error?: boolean;
  /** Extra class on the overlay root (e.g. the SQLite fade-out). */
  className?: string;
}

export function PlaygroundBootOverlay({
  statusMessage,
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
          {error && (
            <button
              type="button"
              className="playground-boot-retry"
              onClick={() => window.location.reload()}
            >
              Reload and try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
