"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Showcase embed of the real playground, driven by `playgroundId` from the
 * page's external switcher.
 *
 * We render it in a same-origin <iframe> rather than mounting the playground
 * inline: the playground takes over the host document on mount (adds
 * `body.playground-active` → full-bleed dark background + `overflow:hidden`,
 * and writes editor-theme palette vars onto `<html>`). An iframe fully
 * isolates that from the marketing page while still giving visitors the live
 * editor and schema browser.
 *
 * The playground's own in-header switcher is hidden when it detects it's
 * framed (see `useIsFramed`); switching languages here is done by the page's
 * switcher, which changes `playgroundId` and points the iframe at the new
 * playground route.
 *
 * The iframe `src` is only set once the card scrolls near the viewport so the
 * (heavy) playground bundle and runtime boot don't tax the initial load.
 */
export function EmbeddedPlayground({ playgroundId }: { playgroundId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setInView(true), 0);
      return () => window.clearTimeout(timer);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  const src = inView ? `/playground/${playgroundId}` : null;

  return (
    <div
      ref={ref}
      // Height tracks width (aspect-ratio), clamped so it stays usable on
      // phones and doesn't get unwieldy on very wide screens.
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      {src ? (
        // key on src so switching languages cleanly reloads the iframe.
        <iframe
          key={src}
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
