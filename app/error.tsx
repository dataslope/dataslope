"use client";

// Branded error boundary for uncaught server/render errors, which previously
// surfaced as Next's unstyled "Application error" page with no recovery path.
// Deliberately self-contained (no HomeNav/HomeFooter): the less this page
// depends on, the less likely it is to crash while reporting a crash.
import "@/app/tailwind.css";
import { useEffect, useSyncExternalStore } from "react";

import { THEME_BOOTSTRAP } from "@/app/_components/home/themeBootstrap";
import {
  isStaleBuildCrash,
  neverStale,
  recoverFromStaleBuild,
  subscribeToStaleBuild,
} from "@/app/_components/staleBuild";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // A crash caused by a chunk this deploy no longer serves is not the user's
  // to act on, and neither button below can clear it: `reset()` re-renders
  // against the same missing module. See staleBuild.ts. Read through
  // useSyncExternalStore because the flag lives on `window`, which a server
  // render cannot see.
  const stale = useSyncExternalStore(
    subscribeToStaleBuild,
    () => isStaleBuildCrash(error),
    neverStale,
  );

  useEffect(() => {
    console.error("app error boundary:", error);
    // Reloads when the crash is a stale build, so the card below is on
    // screen only until that reload commits.
    recoverFromStaleBuild(error);
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
            {stale
              ? "This page was left open across an update and could not finish loading. Reloading picks up the new version."
              : "An unexpected error interrupted this page. Your playground work is stored in this browser and is not affected."}
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
      </main>
    </>
  );
}
