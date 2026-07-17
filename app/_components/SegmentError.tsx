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
import { useEffect } from "react";
import Link from "next/link";

import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";

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
  useEffect(() => {
    console.error("segment error boundary:", error);
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
            {message}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center rounded-lg bg-[var(--ds-green-600)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-[var(--ds-gray-200)] px-4 py-2 text-sm font-semibold text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:text-[var(--ds-gray-200)] dark:hover:bg-white/5"
            >
              Home
            </Link>
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
