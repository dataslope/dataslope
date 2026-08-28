"use client";

// Last-resort error boundary: catches failures in the root layout itself,
// which app/error.tsx (rendered inside the layout) cannot. Must render its
// own <html>/<body> because it replaces the layout. Deliberately
// dependency-free: the less this depends on, the less likely it is to crash
// while reporting a crash.
import { useEffect, useSyncExternalStore } from "react";

// Zero-dependency module (no React, no Next), so importing it here does not
// widen what has to evaluate correctly for this boundary to render.
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
  // See app/_components/staleBuild.ts: when the crash is a chunk this deploy
  // no longer serves, only a reload helps.
  const stale = useSyncExternalStore(
    subscribeToStaleBuild,
    () => isStaleBuildCrash(error),
    neverStale,
  );

  useEffect(() => {
    console.error("root layout error boundary:", error);
    recoverFromStaleBuild(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#ffffff",
          color: "#333333",
        }}
      >
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
          }}
        >
          <div style={{ maxWidth: 448, width: "100%", textAlign: "center" }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "#16a34a",
              }}
            >
              DataSlope
            </p>
            <h1
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "#121212",
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                lineHeight: 1.6,
                color: "#6b7280",
              }}
            >
              {stale
                ? "This page was left open across an update and could not finish loading. Reloading picks up the new version."
                : "An unexpected error interrupted this page. Your playground work is stored in this browser and is not affected."}
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => (stale ? window.location.reload() : reset())}
                style={{
                  border: 0,
                  borderRadius: 8,
                  background: "#16a34a",
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#ffffff",
                  cursor: "pointer",
                }}
              >
                {stale ? "Reload" : "Try again"}
              </button>
              {/* Plain <a>, not next/link: this boundary replaces the crashed
                  root layout, so a hard navigation is safer than relying on
                  the client router still being functional. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#374151",
                  textDecoration: "none",
                }}
              >
                Home
              </a>
            </div>
            {error?.digest && (
              <p style={{ marginTop: 24, fontSize: 12, color: "#9ca3af" }}>
                Error reference: {error.digest}
              </p>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
