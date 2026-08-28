"use client";

// Shared card for segment-level error boundaries (quiz/[id], c/[id],
// s/[shareId], dashboard). Mirrors app/error.tsx's self-contained styling —
// the fewer dependencies an error surface has, the less likely it is to crash
// while reporting a crash — but lets each segment supply copy that fits its
// content instead of the root boundary's playground-centric message.
//
// NOTE: this file has its own entry in app/tailwind.shared.css's @source
// list (both Tailwind roots compile with source(none)); if it moves,
// update that glob or its utilities stop being generated.
import "@/app/tailwind.css";
import { useEffect, useSyncExternalStore } from "react";

import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import {
  isStaleBuildCrash,
  neverStale,
  recoverFromStaleBuild,
  subscribeToStaleBuild,
} from "@/app/_components/staleBuild";

export default function SegmentError({
  error,
  reset,
  title,
  message,
  fullScreen = true,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  message: string;
  /** Full-viewport centering for standalone segments; false when the
      boundary renders inside persistent chrome (the dashboard shell). */
  fullScreen?: boolean;
}) {
  // See app/_components/staleBuild.ts: a chunk this deploy no longer serves
  // crashes the segment, and `reset()` cannot clear it.
  const stale = useSyncExternalStore(
    subscribeToStaleBuild,
    () => isStaleBuildCrash(error),
    neverStale,
  );

  useEffect(() => {
    console.error("segment error boundary:", error);
    recoverFromStaleBuild(error);
  }, [error]);

  return (
    <>
      {fullScreen && (
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      )}
      <div
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className={`flex items-center justify-center px-4 text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-100)] ${
          fullScreen ? "min-h-screen bg-white dark:bg-[#121212]" : "py-24"
        }`}
      >
        <div className="w-full max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
            DataSlope
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            {stale
              ? "This page was left open across an update and could not finish loading. Reloading picks up the new version."
              : message}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => (stale ? window.location.reload() : reset())}
              className="inline-flex items-center rounded-lg bg-[var(--ds-green-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)]"
            >
              {stale ? "Reload" : "Try again"}
            </button>
            {/* Plain <a>, not next/link: a client-side navigation re-enters
                the router that just crashed, and on a stale build it would
                ask for the very chunks that 404'd. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex items-center rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
            >
              Home
            </a>
          </div>
          {error?.digest && (
            <p className="mt-6 text-xs text-[var(--ds-gray-400)]">
              Error reference: {error.digest}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
