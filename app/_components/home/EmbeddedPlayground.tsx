"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Showcase embed of the real playground, defaulting to PostgreSQL.
 *
 * We render it in a same-origin <iframe> rather than mounting
 * `<PostgresPlayground>` inline: the playground takes over the host
 * document on mount (adds `body.playground-active` → full-bleed dark
 * background + `overflow:hidden`, and writes editor-theme palette vars onto
 * `<html>`). An iframe fully isolates that from the marketing page while
 * still giving visitors the live editor, schema browser, and — top-left —
 * the playground switcher to jump to any other language.
 *
 * The iframe `src` is only set once the card scrolls near the viewport so
 * the (heavy) playground bundle and PGlite boot don't tax the initial load.
 */
export function EmbeddedPlayground() {
  const ref = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No IntersectionObserver (very old browsers): load it anyway, but defer
      // out of the effect body so we're not setting state synchronously.
      const timer = window.setTimeout(() => setSrc("/playground/postgres"), 0);
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSrc("/playground/postgres");
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  return (
    <div
      ref={ref}
      // Height tracks width (aspect-ratio), clamped so it stays usable on
      // phones and doesn't get unwieldy on very wide screens.
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      {src ? (
        <iframe
          src={src}
          title="Dataslope PostgreSQL playground"
          loading="lazy"
          className="size-full border-0"
          // Same-origin, so navigation between playgrounds via the in-frame
          // switcher works; allow downloads (CSV/Parquet export) and clipboard.
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-sm text-[var(--ds-gray-500)]">
          Loading the playground…
        </div>
      )}
    </div>
  );
}
