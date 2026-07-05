"use client";

// Branded error boundary for uncaught server/render errors, which previously
// surfaced as Next's unstyled "Application error" page with no recovery path.
// Deliberately self-contained (no HomeNav/HomeFooter): the less this page
// depends on, the less likely it is to crash while reporting a crash.
import "@/app/tailwind.css";
import { useEffect } from "react";
import Link from "next/link";

import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app error boundary:", error);
  }, [error]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      <main
        style={{ fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)" }}
        className="flex min-h-screen items-center justify-center bg-white px-4 text-[var(--ds-gray-800)] dark:bg-[#121212] dark:text-[var(--ds-gray-100)]"
      >
        <div className="w-full max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]">
            DataSlope
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            An unexpected error interrupted this page. Your playground work is
            stored in this browser and is not affected.
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
      </main>
    </>
  );
}
