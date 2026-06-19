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
 * Because the frame is same-origin, we read its pathname on every load to
 * report which playground is showing (the switcher navigates within the
 * frame), so the surrounding copy + the "open full playground" link can
 * follow along.
 *
 * The iframe `src` is only set once the card scrolls near the viewport so
 * the (heavy) playground bundle and PGlite boot don't tax the initial load.
 */
export function EmbeddedPlayground({
  onPlaygroundChange,
}: {
  onPlaygroundChange?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (src) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
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

  // The in-frame switcher navigates client-side (no iframe `load` event), so
  // poll the same-origin frame's path to report which playground is showing.
  useEffect(() => {
    if (!src || !onPlaygroundChange) return;
    let last = "";
    const read = () => {
      try {
        const path = iframeRef.current?.contentWindow?.location?.pathname ?? "";
        const match = path.match(/\/playground\/([^/]+)/);
        if (match && match[1] !== last) {
          last = match[1];
          onPlaygroundChange(match[1]);
        }
      } catch {
        /* transient during navigation / cross-origin — ignore */
      }
    };
    const id = window.setInterval(read, 500);
    return () => window.clearInterval(id);
  }, [src, onPlaygroundChange]);

  return (
    <div
      ref={ref}
      // Height tracks width (aspect-ratio), clamped so it stays usable on
      // phones and doesn't get unwieldy on very wide screens.
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      {src ? (
        <iframe
          ref={iframeRef}
          src={src}
          title="Dataslope playground"
          loading="lazy"
          className="size-full border-0"
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
