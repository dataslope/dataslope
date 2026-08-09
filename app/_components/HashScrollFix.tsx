"use client";

/**
 * Keeps `#hash` navigation pointed at its target while the page settles.
 *
 * The browser (and Next's router) scroll to the hash target as soon as the
 * HTML is there, but lesson pages keep changing height for a while after
 * that: `<CodeBlock>` mounts CodeMirror, `<MultipleChoice>` renders its
 * markdown through KaTeX, Mermaid draws asynchronously. Every one of those
 * mounts above the target pushes it away from where the browser left the
 * viewport, which is exactly the "search result lands screens away from the
 * match" bug for deep links into long lessons.
 *
 * So: while a hash target exists, re-align the viewport to it every time the
 * document resizes, for a short settle window. The user stays in charge; any
 * scroll intent (wheel, touch, arrow keys, page keys) cancels the window
 * immediately.
 *
 * Keyed on `pathname` only, deliberately: in-page hash navigation (a TOC
 * click) happens long after layout has settled and needs no correction, so
 * re-running there would only fight the native jump.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** How long after arrival late-mounting components may still shift layout. */
const SETTLE_MS = 3000;

/** Keys that express scroll intent; anything else (typing in Ask AI, tabbing)
 *  should not cancel the correction window. */
const SCROLL_KEYS = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
]);

export default function HashScrollFix() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;

    const align = () => target.scrollIntoView({ block: "start", behavior: "instant" });

    align();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(align);
    const controller = new AbortController();
    const cancel = () => {
      observer.disconnect();
      controller.abort();
    };
    const { signal } = controller;
    window.addEventListener("wheel", cancel, { passive: true, signal });
    window.addEventListener("touchstart", cancel, { passive: true, signal });
    window.addEventListener(
      "keydown",
      (e) => {
        if (SCROLL_KEYS.has(e.key)) cancel();
      },
      { signal },
    );
    observer.observe(document.body);
    const timer = window.setTimeout(cancel, SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [pathname]);

  return null;
}
